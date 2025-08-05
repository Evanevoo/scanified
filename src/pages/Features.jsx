import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Paper,
  Fade,
  Zoom
} from '@mui/material';
import {
  QrCodeScanner as ScanIcon,
  PhoneIphone as MobileIcon,
  CloudSync as SyncIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  LocalShipping as DeliveryIcon,
  Assessment as ReportsIcon,
  Notifications as NotificationIcon,
  Build as MaintenanceIcon,
  Route as RouteIcon,
  AutoMode as AutomationIcon,
  Analytics as AnalyticsIcon,
  Payment as BillingIcon,
  Support as SupportIcon,
  AdminPanelSettings as AdminIcon,
  Api as ApiIcon,
  Storage as DatabaseIcon,
  Backup as BackupIcon,
  Language as GlobalIcon,
  Groups as TeamsIcon,
  Schedule as ScheduleIcon,
  VerifiedUser as ComplianceIcon,
  TrendingUp as GrowthIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const featureCategories = [
  {
    id: 'core',
    title: 'Core Features',
    description: 'Essential tools for daily operations',
    icon: <DashboardIcon />,
    color: '#3B82F6',
    features: [
      {
        title: 'Real-Time Asset Tracking',
        description: 'Track every asset in real-time with complete visibility',
        icon: <InventoryIcon />,
        details: [
          'Live location tracking',
          'Status updates in real-time',
          'Movement history',
          'Chain of custody',
          'Asset lifecycle management'
        ]
      },
      {
        title: 'Mobile Barcode Scanning',
        description: 'Scan any barcode or QR code with your smartphone',
        icon: <ScanIcon />,
        details: [
          'Works with any smartphone camera',
          'Multiple barcode format support',
          'Offline scanning capability',
          'Batch scanning mode',
          'Custom scan workflows'
        ]
      },
      {
        title: 'Customer Management',
        description: 'Complete customer relationship management',
        icon: <PeopleIcon />,
        details: [
          'Customer profiles and history',
          'Asset assignment tracking',
          'Contact management',
          'Customer portal access',
          'Billing integration'
        ]
      },
      {
        title: 'Delivery Management',
        description: 'Streamline your delivery operations',
        icon: <DeliveryIcon />,
        details: [
          'Route planning',
          'Delivery scheduling',
          'Driver tracking',
          'Proof of delivery',
          'Customer notifications'
        ]
      }
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    description: 'Powerful tools for scaling operations',
    icon: <AutomationIcon />,
    color: '#10B981',
    features: []
  },
  {
    id: 'enterprise',
    title: 'Enterprise Features',
    description: 'Enterprise-grade capabilities for large organizations',
    icon: <AdminIcon />,
    color: '#7C3AED',
    features: [
      {
        title: 'Multi-Organization Support',
        description: 'Manage multiple locations or subsidiaries',
        icon: <GlobalIcon />,
        details: [
          'Centralized management',
          'Cross-organization reporting',
          'Separate billing entities',
          'Shared asset pools',
          'Global user management'
        ]
      },
      {
        title: 'Advanced Security',
        description: 'Enterprise-grade security and compliance',
        icon: <SecurityIcon />,
        details: [
          'Role-based access control',
          'Single sign-on (SSO)',
          'Audit logging',
          'Data encryption',
          'Compliance reporting'
        ]
      },
      {
        title: 'API & Integrations',
        description: 'Connect with your existing systems',
        icon: <ApiIcon />,
        details: [
          'RESTful API',
          'Webhook support',
          'ERP integrations',
          'Accounting software sync',
          'Custom integrations'
        ]
      },
      {
        title: 'Disaster Recovery',
        description: 'Never lose your critical data',
        icon: <BackupIcon />,
        details: [
          'Automated backups',
          'Point-in-time recovery',
          'Geo-redundant storage',
          'Disaster recovery plan',
          '99.9% uptime SLA'
        ]
      }
    ]
  }
];

const additionalFeatures = [
  { icon: <ReportsIcon />, title: 'Custom Reports', description: 'Generate any report you need' },
  { icon: <NotificationIcon />, title: 'Smart Notifications', description: 'Stay informed with intelligent alerts' },
  { icon: <TeamsIcon />, title: 'Team Collaboration', description: 'Work together seamlessly' },
  { icon: <BillingIcon />, title: 'Integrated Billing', description: 'Streamline your invoicing' },
  { icon: <SupportIcon />, title: '24/7 Support', description: 'Always here when you need us' },
  { icon: <ComplianceIcon />, title: 'Compliance Tools', description: 'Meet regulatory requirements' },
  { icon: <ScheduleIcon />, title: 'Scheduling System', description: 'Manage appointments and tasks' },
  { icon: <GrowthIcon />, title: 'Growth Analytics', description: 'Track and improve performance' }
];

export default function Features() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [expandedAccordion, setExpandedAccordion] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
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
        background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        color: 'white',
        py: 10,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Fade in timeout={1000}>
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3 }}>
                Everything You Need to Manage Assets
              </Typography>
            </Fade>
            <Fade in timeout={1500}>
              <Typography variant="h5" sx={{ mb: 6, opacity: 0.9, maxWidth: 800, mx: 'auto' }}>
                From basic tracking to advanced analytics, Scanified provides all the tools you need to run your business efficiently
              </Typography>
            </Fade>
          </Box>
        </Container>
        
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          zIndex: 0
        }} />
      </Box>

      {/* Feature Categories Tabs */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 6 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {featureCategories.map((category, index) => (
              <Tab 
                key={category.id}
                label={category.title} 
                icon={category.icon}
                iconPosition="start"
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 64
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Feature Details */}
        {featureCategories.map((category, categoryIndex) => (
          <Box
            key={category.id}
            role="tabpanel"
            hidden={activeTab !== categoryIndex}
          >
            {activeTab === categoryIndex && (
              <Fade in timeout={500}>
                <Box>
                  <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
                      {category.title}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      {category.description}
                    </Typography>
                  </Box>

                  <Grid container spacing={4}>
                    {category.features.map((feature, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Zoom in timeout={500 + index * 100}>
                          <Card 
                            sx={{ 
                              height: '100%',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-8px)',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                              }
                            }}
                          >
                            <CardContent sx={{ p: 4 }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                                <Box sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  bgcolor: `${category.color}20`,
                                  color: category.color,
                                  mr: 3
                                }}>
                                  {feature.icon}
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="h5" fontWeight={600} gutterBottom>
                                    {feature.title}
                                  </Typography>
                                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                                    {feature.description}
                                  </Typography>
                                </Box>
                              </Box>

                              <List dense>
                                {feature.details.map((detail, idx) => (
                                  <ListItem key={idx} sx={{ px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                      <CheckIcon sx={{ fontSize: 20, color: category.color }} />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={detail}
                                      primaryTypographyProps={{ variant: 'body2' }}
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
                </Box>
              </Fade>
            )}
          </Box>
        ))}

        {/* Additional Features Grid */}
        <Box sx={{ mt: 12 }}>
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 6 }}>
            And So Much More...
          </Typography>
          
          <Grid container spacing={3}>
            {additionalFeatures.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Fade in timeout={1000 + index * 100}>
                  <Paper 
                    sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      height: '100%',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    <Box sx={{ color: 'primary.main', mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Paper>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* FAQ Section */}
        <Box sx={{ mt: 12 }}>
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 6 }}>
            Frequently Asked Questions
          </Typography>
          
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Accordion 
              expanded={expandedAccordion === 'panel1'} 
              onChange={handleAccordionChange('panel1')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">How quickly can I get started?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  You can be up and running in minutes! Our simple onboarding process guides you through 
                  setting up your organization, adding your first assets, and inviting your team. 
                  No complex installations or lengthy training required.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expandedAccordion === 'panel2'} 
              onChange={handleAccordionChange('panel2')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Do I need special hardware?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  No! Scanified works with any smartphone or tablet. You don't need expensive handheld 
                  scanners or specialized equipment. Your team can use the devices they already have.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expandedAccordion === 'panel3'} 
              onChange={handleAccordionChange('panel3')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Can I customize it for my industry?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  Absolutely! Scanified is designed to adapt to any industry. Whether you're tracking 
                  gas cylinders, medical equipment, tools, or any other assets, you can customize 
                  terminology, workflows, and features to match your specific needs.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expandedAccordion === 'panel4'} 
              onChange={handleAccordionChange('panel4')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Is my data secure?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  Yes, security is our top priority. We use enterprise-grade encryption, secure 
                  authentication, automated backups, and follow industry best practices. Your data 
                  is protected with multiple layers of security and regular security audits.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>

        {/* CTA Section */}
        <Box sx={{ 
          mt: 12, 
          p: 6, 
          borderRadius: 4,
          background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
          color: 'white',
          textAlign: 'center'
        }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
            Ready to Transform Your Asset Management?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of businesses already using Scanified
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
                '&:hover': { 
                  bgcolor: '#f8fafc'
                }
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
              View Demo
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}