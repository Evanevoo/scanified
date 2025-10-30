import logger from '../utils/logger';
import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Avatar,
  Chip,
  Paper,
  Button,
  Fade,
  Zoom
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Rocket as RocketIcon,
  People as PeopleIcon,
  TrendingUp as GrowthIcon,
  Public as GlobalIcon,
  EmojiEvents as AwardIcon,
  Lightbulb as InnovationIcon,
  Handshake as PartnershipIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Support as SupportIcon,
  CheckCircle as CheckIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

const companyValues = [
  {
    icon: <InnovationIcon />,
    title: 'Innovation First',
    description: 'We constantly push boundaries to deliver cutting-edge solutions that transform how businesses manage assets.',
    color: '#3B82F6'
  },
  {
    icon: <PeopleIcon />,
    title: 'Customer Success',
    description: 'Your success is our success. We\'re committed to providing exceptional support and continuous value.',
    color: '#10B981'
  },
  {
    icon: <SecurityIcon />,
    title: 'Trust & Security',
    description: 'We take data security seriously, implementing enterprise-grade protection to keep your information safe.',
    color: '#7C3AED'
  },
  {
    icon: <SpeedIcon />,
    title: 'Simplicity',
    description: 'Complex problems deserve simple solutions. We make powerful technology accessible to everyone.',
    color: '#F59E0B'
  }
];

const milestones = [
  {
    year: '2019',
    title: 'The Beginning',
    description: 'Founded with a vision to revolutionize asset management',
    icon: <RocketIcon />
  },
  {
    year: '2020',
    title: 'First 100 Customers',
    description: 'Reached our first major milestone during challenging times',
    icon: <PeopleIcon />
  },
  {
    year: '2021',
    title: 'Series A Funding',
    description: 'Secured $10M to accelerate product development',
    icon: <GrowthIcon />
  },
  {
    year: '2022',
    title: 'Global Expansion',
    description: 'Expanded to serve customers in 25+ countries',
    icon: <GlobalIcon />
  },
  {
    year: '2023',
    title: 'Industry Recognition',
    description: 'Named "Best Asset Management Solution" by TechAwards',
    icon: <AwardIcon />
  },
  {
    year: '2024',
    title: 'AI Integration',
    description: 'Launched AI-powered predictive analytics features',
    icon: <InnovationIcon />
  }
];

const teamMembers = [
  {
    name: 'Sarah Johnson',
    role: 'CEO & Co-founder',
    bio: 'Former VP of Operations at a Fortune 500 company with 15+ years in supply chain management.',
    avatar: '/avatars/sarah.jpg'
  },
  {
    name: 'Michael Chen',
    role: 'CTO & Co-founder',
    bio: 'Ex-Google engineer with expertise in distributed systems and mobile technologies.',
    avatar: '/avatars/michael.jpg'
  },
  {
    name: 'Emily Rodriguez',
    role: 'VP of Customer Success',
    bio: 'Passionate about helping businesses transform their operations through technology.',
    avatar: '/avatars/emily.jpg'
  },
  {
    name: 'David Kim',
    role: 'VP of Engineering',
    bio: 'Led engineering teams at multiple successful startups, specializing in scalable architectures.',
    avatar: '/avatars/david.jpg'
  }
];

const stats = [
  { value: '50K+', label: 'Assets Tracked Daily' },
  { value: '2,500+', label: 'Happy Customers' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '4.8/5', label: 'Customer Rating' }
];

export default function About() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [pageData, setPageData] = useState({
    hero: {
      title: 'Transforming Asset Management',
      subtitle: 'We\'re on a mission to make asset tracking simple, efficient, and accessible for businesses of all sizes.'
    },
    story: {
      title: 'Our Story',
      description: 'Born from firsthand experience with the challenges of asset management, Scanified was created to bring modern solutions to an industry ready for change.',
      content: 'In 2019, our founders Sarah and Michael were working at different companies but facing the same problem: managing physical assets was unnecessarily complex and expensive. Traditional solutions required costly hardware, complicated software, and extensive training.\n\nThey envisioned a world where any business could track their assets using just a smartphone. No expensive scanners. No complex installations. Just simple, powerful technology that works.\n\nToday, Scanified helps thousands of businesses across the globe manage millions of assets. From small local businesses to large enterprises, we\'re proud to be part of their success stories.'
    },
    stats: [
      { value: '50K+', label: 'Assets Tracked Daily' },
      { value: '2,500+', label: 'Happy Customers' },
      { value: '99.9%', label: 'Uptime SLA' },
      { value: '4.8/5', label: 'Customer Rating' }
    ],
    team: [
      {
        name: 'Sarah Johnson',
        role: 'CEO & Co-founder',
        bio: 'Former VP of Operations at a Fortune 500 company with 15+ years in supply chain management.',
        avatar: '/avatars/sarah.jpg'
      },
      {
        name: 'Michael Chen',
        role: 'CTO & Co-founder',
        bio: 'Ex-Google engineer with expertise in distributed systems and mobile technologies.',
        avatar: '/avatars/michael.jpg'
      },
      {
        name: 'Emily Rodriguez',
        role: 'VP of Customer Success',
        bio: 'Passionate about helping businesses transform their operations through technology.',
        avatar: '/avatars/emily.jpg'
      },
      {
        name: 'David Kim',
        role: 'VP of Engineering',
        bio: 'Led engineering teams at multiple successful startups, specializing in scalable architectures.',
        avatar: '/avatars/david.jpg'
      }
    ],
    values: [
      {
        title: 'Innovation First',
        description: 'We constantly push boundaries to deliver cutting-edge solutions that transform how businesses manage assets.',
        color: '#3B82F6'
      },
      {
        title: 'Customer Success',
        description: 'Your success is our success. We\'re committed to providing exceptional support and continuous value.',
        color: '#10B981'
      },
      {
        title: 'Trust & Security',
        description: 'We take data security seriously, implementing enterprise-grade protection to keep your information safe.',
        color: '#7C3AED'
      },
      {
        title: 'Simplicity',
        description: 'Complex problems deserve simple solutions. We make powerful technology accessible to everyone.',
        color: '#F59E0B'
      }
    ]
  });

  // Load page data from database
  useEffect(() => {
    const loadPageData = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('website_content')
          .eq('id', organization?.id)
          .single();

        if (error) throw error;

        if (data?.website_content) {
          const websiteData = JSON.parse(data.website_content);
          if (websiteData.about) {
            setPageData(websiteData.about);
          }
        }
      } catch (error) {
        logger.error('Error loading about page data:', error);
        // Use default data if loading fails
      }
    };

    if (organization) {
      loadPageData();
    }
  }, [organization]);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        color: 'white',
        py: 12,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Fade in timeout={1000}>
                <Box>
                  <Typography variant="h1" fontWeight={800} sx={{ mb: 3 }}>
                    {pageData.hero.title}
                  </Typography>
                  <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                    {pageData.hero.subtitle}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => navigate('/register')}
                      sx={{ 
                        bgcolor: 'white',
                        color: '#3B82F6',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#f8fafc' }
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
                        fontWeight: 600,
                        '&:hover': { 
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.1)'
                        }
                      }}
                    >
                      Get in Touch
                    </Button>
                  </Stack>
                </Box>
              </Fade>
            </Grid>
            <Grid item xs={12} md={6}>
              <Fade in timeout={1500}>
                <Box sx={{ position: 'relative' }}>
                  <Box sx={{
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    position: 'absolute',
                    top: -50,
                    right: -50
                  }} />
                  <Box sx={{
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    position: 'absolute',
                    bottom: -30,
                    left: -30
                  }} />
                </Box>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: 8, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {pageData.stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Zoom in timeout={1000 + index * 200}>
                  <Paper 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center',
                      height: '100%',
                      transition: 'transform 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)'
                      }
                    }}
                  >
                    <Typography variant="h3" fontWeight={700} color="primary.main" gutterBottom>
                      {stat.value}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Paper>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Our Story Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
            {pageData.story.title}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
            {pageData.story.description}
          </Typography>
        </Box>

        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            {pageData.story.content.split('\n\n').map((paragraph, index) => (
              <Typography key={index} variant="body1" sx={{ 
                mb: index < pageData.story.content.split('\n\n').length - 1 ? 3 : 0, 
                fontSize: '1.1rem', 
                lineHeight: 1.8 
              }}>
                {paragraph}
              </Typography>
            ))}
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative', height: 400 }}>
              <Timeline position="alternate">
                {milestones.slice(0, 4).map((milestone, index) => (
                  <TimelineItem key={index}>
                    <TimelineOppositeContent color="text.secondary">
                      <Typography variant="h6" fontWeight={600}>
                        {milestone.year}
                      </Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot sx={{ bgcolor: 'primary.main', p: 1 }}>
                        {milestone.icon}
                      </TimelineDot>
                      {index < 3 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {milestone.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {milestone.description}
                        </Typography>
                      </Paper>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Values Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
              Our Values
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              These core values guide everything we do, from product development to customer support.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {pageData.values.map((value, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Fade in timeout={1000 + index * 200}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{
                        display: 'inline-flex',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: `${value.color}20`,
                        color: value.color,
                        mb: 3
                      }}>
                        {value.icon}
                      </Box>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        {value.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {value.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Team Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
            Meet Our Team
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Passionate professionals dedicated to revolutionizing asset management.
          </Typography>
        </Box>

        <Grid container spacing={4}>
                      {pageData.team.map((member, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Zoom in timeout={1000 + index * 200}>
                <Card 
                  sx={{ 
                    height: '100%',
                    textAlign: 'center',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Avatar
                      sx={{
                        width: 120,
                        height: 120,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: 'primary.main',
                        fontSize: '3rem'
                      }}
                    >
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {member.name}
                    </Typography>
                    <Chip 
                      label={member.role} 
                      size="small" 
                      color="primary" 
                      sx={{ mb: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {member.bio}
                    </Typography>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="h6" color="text.secondary">
            And 50+ more talented individuals across engineering, sales, support, and operations.
          </Typography>
        </Box>
      </Container>

      {/* Why Choose Us Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
              Why Companies Choose Scanified
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              'No expensive hardware required',
              'Setup in minutes, not months',
              'Works offline and syncs automatically',
              'Scales from 10 to 10,000+ assets',
              'Enterprise-grade security',
              '24/7 customer support',
              'Regular feature updates',
              'Transparent, fair pricing'
            ].map((item, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckIcon />
                  <Typography variant="body1">
                    {item}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ 
          textAlign: 'center',
          p: 6,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
            Ready to Join Our Journey?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Be part of the asset management revolution.
          </Typography>
          <Stack direction="row" spacing={3} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{ px: 4, py: 1.5, fontWeight: 600 }}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              
              sx={{ px: 4, py: 1.5, fontWeight: 600 }}
            >
              Join Our Team
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}