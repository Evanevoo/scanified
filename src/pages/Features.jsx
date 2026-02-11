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
  Memory as AutomationIcon,
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
    color: '#000000',
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
      {/* Hero Section */}
      <Box sx={{ 
        backgroundColor: '#000000',
        color: 'white',
        py: 10,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Fade in timeout={1000}>
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3, color: '#FFFFFF' }}>
                Everything You Need to Manage Assets
              </Typography>
            </Fade>
            <Fade in timeout={1500}>
              <Typography variant="h5" sx={{ mb: 6, color: '#E5E7EB', width: '100%' }}>
                From basic tracking to advanced analytics, Scanified provides all the tools you need to run your business efficiently
              </Typography>
            </Fade>
          </Box>
        </Container>
      </Box>

      {/* Feature Categories Tabs */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ borderBottom: '2px solid #000000', mb: 6 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                color: '#6B7280',
                fontWeight: 600,
                '&.Mui-selected': {
                  color: '#000000',
                  fontWeight: 700
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#000000',
                height: '3px'
              }
            }}
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
                    <Typography variant="h3" fontWeight={700} sx={{ mb: 2, color: '#000000' }}>
                      {category.title}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#6B7280' }}>
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
                              border: '2px solid #000000',
                              borderRadius: '8px',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-8px)',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
                              }
                            }}
                          >
                            <CardContent sx={{ p: 4 }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                                <Box sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  bgcolor: '#000000',
                                  color: '#FFFFFF',
                                  mr: 3
                                }}>
                                  {feature.icon}
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: '#000000' }}>
                                    {feature.title}
                                  </Typography>
                                  <Typography sx={{ color: '#6B7280', mb: 3 }}>
                                    {feature.description}
                                  </Typography>
                                </Box>
                              </Box>

                              <List dense>
                                {feature.details.map((detail, idx) => (
                                  <ListItem key={idx} sx={{ px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                      <CheckIcon sx={{ fontSize: 20, color: '#000000' }} />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={detail}
                                      primaryTypographyProps={{ variant: 'body2', sx: { color: '#374151' } }}
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
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 6, color: '#000000' }}>
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
                      border: '2px solid #000000',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)'
                      }
                    }}
                  >
                    <Box sx={{ color: '#000000', mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: '#000000' }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6B7280' }}>
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
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 6, color: '#000000' }}>
            Frequently Asked Questions
          </Typography>
          
          <Box sx={{ width: '100%' }}>
            <Accordion 
              expanded={expandedAccordion === 'panel1'} 
              onChange={handleAccordionChange('panel1')}
              sx={{
                border: '2px solid #000000',
                borderRadius: '8px !important',
                mb: 2,
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
                <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>How quickly can I get started?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: '#374151' }}>
                  You can be up and running in minutes! Our simple onboarding process guides you through 
                  setting up your organization, adding your first assets, and inviting your team. 
                  No complex installations or lengthy training required.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expandedAccordion === 'panel2'} 
              onChange={handleAccordionChange('panel2')}
              sx={{
                border: '2px solid #000000',
                borderRadius: '8px !important',
                mb: 2,
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
                <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>Do I need special hardware?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: '#374151' }}>
                  No! Scanified works with any smartphone or tablet. You don't need expensive handheld 
                  scanners or specialized equipment. Your team can use the devices they already have.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expandedAccordion === 'panel3'} 
              onChange={handleAccordionChange('panel3')}
              sx={{
                border: '2px solid #000000',
                borderRadius: '8px !important',
                mb: 2,
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
                <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>Can I customize it for my industry?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: '#374151' }}>
                  Absolutely! Scanified is designed to adapt to any industry. Whether you're tracking 
                  gas cylinders, medical equipment, tools, or any other assets, you can customize 
                  terminology, workflows, and features to match your specific needs.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expandedAccordion === 'panel4'} 
              onChange={handleAccordionChange('panel4')}
              sx={{
                border: '2px solid #000000',
                borderRadius: '8px !important',
                mb: 2,
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
                <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>Is my data secure?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: '#374151' }}>
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
          borderRadius: '8px',
          backgroundColor: '#000000',
          color: 'white',
          textAlign: 'center',
          border: '2px solid #000000'
        }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 3, color: '#FFFFFF' }}>
            Ready to Transform Your Asset Management?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, color: '#E5E7EB' }}>
            Join thousands of businesses already using Scanified
          </Typography>
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/create-organization')}
              sx={{ 
                bgcolor: '#FFFFFF',
                color: '#000000',
                px: 4,
                py: 1.5,
                fontWeight: 600,
                border: '2px solid #FFFFFF',
                '&:hover': { 
                  bgcolor: '#F3F4F6',
                  borderColor: '#F3F4F6'
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
                borderColor: '#FFFFFF',
                borderWidth: '2px',
                color: '#FFFFFF',
                px: 4,
                py: 1.5,
                fontWeight: 600,
                '&:hover': { 
                  borderColor: '#FFFFFF',
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