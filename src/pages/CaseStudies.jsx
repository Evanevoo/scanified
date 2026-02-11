import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Stack,
  Paper,
  Avatar,
  Rating,
  Tabs,
  Tab,
  Fade,
  Zoom
} from '@mui/material';
import {
  TrendingUp as GrowthIcon,
  Speed as SpeedIcon,
  AttachMoney as SavingsIcon,
  CheckCircle as CheckIcon,
  Business as BusinessIcon,
  LocalShipping as LogisticsIcon,
  LocalHospital as HealthcareIcon,
  Build as ManufacturingIcon,
  Restaurant as FoodServiceIcon,
  FormatQuote as QuoteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AnimatedSection from '../components/AnimatedSection';

const caseStudies = [
  {
    id: 'propane-plus',
    industry: 'Energy',
    icon: <BusinessIcon />,
    company: 'PropanePlus Distributors',
    logo: '/logos/propane-plus.png',
    description: 'Regional propane distributor serving 5,000+ customers',
    challenge: 'Manual tracking of 15,000 cylinders across 8 locations led to frequent losses and customer complaints.',
    solution: 'Implemented Scanified\'s mobile scanning system across all delivery trucks and warehouses.',
    results: [
      { metric: '87%', description: 'Reduction in lost cylinders' },
      { metric: '3 hours', description: 'Daily time saved per driver' },
      { metric: '$120K', description: 'Annual savings from improved efficiency' },
      { metric: '4.8/5', description: 'Customer satisfaction rating' }
    ],
    testimonial: {
      quote: 'Scanified transformed our operations. What used to take hours now takes minutes, and we haven\'t lost a cylinder in months.',
      author: 'Michael Chen',
      role: 'Operations Director',
      avatar: '/avatars/michael-chen.jpg'
    },
    keyFeatures: ['Mobile scanning', 'Route optimization', 'Customer portal', 'Real-time tracking']
  },
  {
    id: 'city-medical',
    industry: 'Healthcare',
    icon: <HealthcareIcon />,
    company: 'City Medical Center',
    logo: '/logos/city-medical.png',
    description: 'Major hospital managing critical medical equipment',
    challenge: 'Tracking 5,000+ pieces of medical equipment across 3 buildings was causing delays in patient care.',
    solution: 'Deployed asset tracking for all mobile medical equipment with instant location lookup.',
    results: [
      { metric: '92%', description: 'Equipment utilization rate' },
      { metric: '15 min', description: 'Average search time reduced to 30 seconds' },
      { metric: '99.9%', description: 'Critical equipment availability' },
      { metric: '$450K', description: 'Avoided equipment purchases' }
    ],
    testimonial: {
      quote: 'Finding equipment quickly saves lives. Scanified ensures our staff spends time caring for patients, not searching for devices.',
      author: 'Dr. Sarah Johnson',
      role: 'Chief of Operations',
      avatar: '/avatars/sarah-johnson.jpg'
    },
    keyFeatures: ['Instant search', 'Maintenance tracking', 'Compliance reports', 'Staff app']
  },
  {
    id: 'swift-logistics',
    industry: 'Logistics',
    icon: <LogisticsIcon />,
    company: 'Swift Logistics Co.',
    logo: '/logos/swift-logistics.png',
    description: 'National logistics company with 200+ vehicles',
    challenge: 'Managing returnable containers across multiple clients and locations was becoming unmanageable.',
    solution: 'Implemented end-to-end container tracking with customer self-service portal.',
    results: [
      { metric: '95%', description: 'Container return rate' },
      { metric: '60%', description: 'Reduction in customer inquiries' },
      { metric: '2.5x', description: 'Faster reconciliation' },
      { metric: '$200K', description: 'Annual container replacement savings' }
    ],
    testimonial: {
      quote: 'The customer portal alone justified the investment. Our clients love the transparency and control.',
      author: 'James Wilson',
      role: 'VP of Operations',
      avatar: '/avatars/james-wilson.jpg'
    },
    keyFeatures: ['Customer portal', 'Automated billing', 'Multi-location', 'API integration']
  },
  {
    id: 'precision-manufacturing',
    industry: 'Manufacturing',
    icon: <ManufacturingIcon />,
    company: 'Precision Manufacturing Inc.',
    logo: '/logos/precision-mfg.png',
    description: 'Tool and die manufacturer with 500+ employees',
    challenge: 'Expensive tools were frequently misplaced, causing production delays and unnecessary purchases.',
    solution: 'Created digital tool crib with check-in/out system and usage analytics.',
    results: [
      { metric: '78%', description: 'Reduction in tool loss' },
      { metric: '$300K', description: 'Annual tool purchase savings' },
      { metric: '99%', description: 'Tool availability when needed' },
      { metric: '45 min', description: 'Average downtime eliminated daily' }
    ],
    testimonial: {
      quote: 'We used to buy new tools thinking we\'d lost them, only to find them later. Now we know exactly where everything is.',
      author: 'Robert Martinez',
      role: 'Plant Manager',
      avatar: '/avatars/robert-martinez.jpg'
    },
    keyFeatures: ['Check-in/out', 'Usage analytics', 'Maintenance scheduling', 'Cost tracking']
  },
  {
    id: 'fresh-foods',
    industry: 'Food Service',
    icon: <FoodServiceIcon />,
    company: 'Fresh Foods Distribution',
    logo: '/logos/fresh-foods.png',
    description: 'Regional food distributor with cold chain requirements',
    challenge: 'Tracking refrigerated containers and maintaining cold chain compliance was paper-based and error-prone.',
    solution: 'Digital tracking with temperature monitoring and automated compliance reporting.',
    results: [
      { metric: '100%', description: 'Cold chain compliance' },
      { metric: '85%', description: 'Reduction in spoilage' },
      { metric: '4 hours', description: 'Weekly compliance reporting time saved' },
      { metric: '$150K', description: 'Annual spoilage cost reduction' }
    ],
    testimonial: {
      quote: 'Scanified gave us peace of mind. We can prove our cold chain integrity to any auditor in seconds.',
      author: 'Maria Rodriguez',
      role: 'Quality Assurance Director',
      avatar: '/avatars/maria-rodriguez.jpg'
    },
    keyFeatures: ['Temperature tracking', 'Compliance reports', 'Chain of custody', 'Alerts']
  }
];

const industries = [
  { label: 'All Industries', value: 'all' },
  { label: 'Energy', value: 'Energy' },
  { label: 'Healthcare', value: 'Healthcare' },
  { label: 'Logistics', value: 'Logistics' },
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Food Service', value: 'Food Service' }
];

export default function CaseStudies() {
  const navigate = useNavigate();
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  
  const filteredStudies = selectedIndustry === 'all' 
    ? caseStudies 
    : caseStudies.filter(study => study.industry === selectedIndustry);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1E40AF 0%, #7C3AED 100%)',
        color: 'white',
        py: 10,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="lg">
          <AnimatedSection animation="fadeInUp">
            <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3 }}>
                Success Stories
              </Typography>
              <Typography variant="h5" sx={{ mb: 6, opacity: 0.9, width: '100%' }}>
                See how businesses across industries are transforming their operations with Scanified
              </Typography>
              
              {/* Industry Stats */}
              <Grid container spacing={3} sx={{ width: '100%' }}>
                <Grid item xs={4}>
                  <Typography variant="h3" fontWeight={700}>2,500+</Typography>
                  <Typography variant="body1">Happy Customers</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h3" fontWeight={700}>50M+</Typography>
                  <Typography variant="body1">Assets Tracked</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h3" fontWeight={700}>$10M+</Typography>
                  <Typography variant="body1">Saved Annually</Typography>
                </Grid>
              </Grid>
            </Box>
          </AnimatedSection>
        </Container>
        
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          zIndex: 0
        }} />
      </Box>

      {/* Filter Tabs */}
      <Container maxWidth="lg" sx={{ mt: -4, position: 'relative', zIndex: 10 }}>
        <Paper sx={{ mb: 6 }}>
          <Tabs
            value={selectedIndustry}
            onChange={(e, value) => setSelectedIndustry(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {industries.map((industry) => (
              <Tab
                key={industry.value}
                label={industry.label}
                value={industry.value}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Case Studies Grid */}
        <Grid container spacing={4}>
          {filteredStudies.map((study, index) => (
            <Grid item xs={12} key={study.id}>
              <AnimatedSection animation="fadeInUp" delay={index * 0.1}>
                <Card 
                  sx={{ 
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  <Grid container>
                    {/* Left side - Company Info */}
                    <Grid item xs={12} md={4} sx={{ 
                      bgcolor: 'grey.50', 
                      p: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <Box sx={{ mb: 3 }}>
                        <Chip 
                          icon={study.icon} 
                          label={study.industry}
                          color="primary"
                          sx={{ mb: 2 }}
                        />
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                          {study.company}
                        </Typography>
                        <Typography color="text.secondary">
                          {study.description}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="subtitle2" color="error.main" fontWeight={600} gutterBottom>
                          THE CHALLENGE
                        </Typography>
                        <Typography variant="body2">
                          {study.challenge}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Right side - Results */}
                    <Grid item xs={12} md={8} sx={{ p: 4 }}>
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle2" color="success.main" fontWeight={600} gutterBottom>
                          THE SOLUTION
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 3 }}>
                          {study.solution}
                        </Typography>
                        
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                          {study.keyFeatures.map((feature, idx) => (
                            <Chip
                              key={idx}
                              icon={<CheckIcon />}
                              label={feature}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>

                      {/* Results Grid */}
                      <Grid container spacing={2} sx={{ mb: 4 }}>
                        {study.results.map((result, idx) => (
                          <Grid item xs={6} sm={3} key={idx}>
                            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                              <Typography variant="h4" fontWeight={700}>
                                {result.metric}
                              </Typography>
                              <Typography variant="caption">
                                {result.description}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>

                      {/* Testimonial */}
                      <Paper sx={{ p: 3, bgcolor: 'grey.50', position: 'relative' }}>
                        <QuoteIcon sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          left: 8, 
                          fontSize: 40, 
                          color: 'primary.main', 
                          opacity: 0.2 
                        }} />
                        <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic', pl: 4 }}>
                          "{study.testimonial.quote}"
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 4 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {study.testimonial.author.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {study.testimonial.author}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {study.testimonial.role}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Card>
              </AnimatedSection>
            </Grid>
          ))}
        </Grid>

        {/* ROI Calculator CTA */}
        <AnimatedSection animation="fadeInUp">
          <Box sx={{ 
            mt: 8, 
            p: 6, 
            borderRadius: 4,
            background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
            color: 'white',
            textAlign: 'center'
          }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
              Calculate Your Potential ROI
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              See how much you could save with Scanified based on your business size
            </Typography>
            <Stack direction="row" spacing={3} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/roi-calculator')}
                sx={{ 
                  bgcolor: 'white',
                  color: '#3B82F6',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#f8fafc' }
                }}
              >
                Calculate ROI
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
          </Box>
        </AnimatedSection>

        {/* Bottom CTA */}
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
            Ready to Write Your Success Story?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Join thousands of businesses already transforming their operations
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
            sx={{ px: 6, py: 2, fontSize: '1.1rem', fontWeight: 600 }}
          >
            Start Your Free Trial
          </Button>
        </Box>
      </Container>
    </Box>
  );
}