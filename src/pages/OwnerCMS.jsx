import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Publish as PublishIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Palette as DesignIcon,
  Payment as PaymentIcon,
  Analytics as AnalyticsIcon,
  People as CustomersIcon,
  Star as FeaturesIcon,
  Article as ArticleIcon,
  Work as WorkIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

const initialWebsiteData = {
  hero: {
    title: 'Modern Asset Management Made Simple',
    subtitle: 'Track, manage, and optimize your assets with the power of mobile scanning. No expensive hardware required.',
    ctaText: 'Start Free Trial',
    backgroundImage: '/hero-bg.jpg'
  },
  features: [
    {
      id: 1,
      title: 'Barcode Scanning',
      description: 'Scan assets instantly with any smartphone. No expensive hardware needed.',
      icon: 'QrCodeScanner',
      enabled: true
    },
    {
      id: 2,
      title: 'Mobile-First',
      description: 'Built for field work. Access everything from your phone or tablet, anywhere.',
      icon: 'PhoneIphone',
      enabled: true
    },
    {
      id: 3,
      title: 'Real-Time Sync',
      description: 'Instant updates across all devices. Your team always has the latest information.',
      icon: 'CloudSync',
      enabled: true
    }
  ],
  pricing: {
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        price: 49,
        yearlyPrice: 39,
        description: 'Perfect for small businesses',
        features: ['Up to 100 assets', 'Up to 3 users', 'Mobile app access', 'Basic reporting'],
        enabled: true,
        popular: false
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 149,
        yearlyPrice: 119,
        description: 'For growing businesses',
        features: ['Up to 1,000 assets', 'Up to 10 users', 'Advanced reporting', 'API access'],
        enabled: true,
        popular: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        yearlyPrice: 'Custom',
        description: 'For large organizations',
        features: ['Unlimited assets', 'Unlimited users', 'Custom integrations', '24/7 support'],
        enabled: true,
        popular: false
      }
    ]
  },
  testimonials: [
    {
      id: 1,
      name: 'John Smith',
      company: 'ABC Manufacturing',
      text: 'Scanified transformed our operations. We save 3 hours daily.',
      rating: 5,
      enabled: true
    }
  ],
  company: {
    name: 'Scanified',
    tagline: 'Modern Asset Management Made Simple',
    description: 'We help businesses track and manage their assets efficiently.',
    email: 'hello@scanified.com',
    phone: '1-800-SCANIFY',
    address: '123 Business St, Suite 100, City, State 12345'
  },
  about: {
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
  }
};

export default function OwnerCMS() {
  const { profile, organization } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [websiteData, setWebsiteData] = useState(initialWebsiteData);
  const [editDialog, setEditDialog] = useState({ open: false, type: null, item: null });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if not owner
  useEffect(() => {
    if (profile && profile.role !== 'owner') {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Load website data on component mount
  useEffect(() => {
    if (organization) {
      loadWebsiteData();
    }
  }, [organization]);

  const loadWebsiteData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('website_content')
        .eq('id', organization.id)
        .single();

      if (error) throw error;

      if (data.website_content) {
        setWebsiteData(JSON.parse(data.website_content));
      }
    } catch (error) {
      logger.error('Error loading website data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('organizations')
        .update({
          website_content: JSON.stringify(websiteData),
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id);

      if (error) throw error;

      setHasChanges(false);
      // Show success message - you could add a toast notification here
      alert('Website content saved successfully!');
    } catch (error) {
      logger.error('Error saving:', error);
      alert('Error saving website content: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    // Open preview in new tab
    window.open('/', '_blank');
  };

  const handleEditItem = (type, item = null) => {
    setEditDialog({ open: true, type, item });
  };

  const handleCloseDialog = () => {
    setEditDialog({ open: false, type: null, item: null });
  };

  const handleUpdateItem = (updatedItem) => {
    setHasChanges(true);
    
    if (editDialog.type === 'hero') {
      setWebsiteData(prev => ({ ...prev, hero: updatedItem }));
    } else if (editDialog.type === 'feature') {
      setWebsiteData(prev => ({
        ...prev,
        features: editDialog.item 
          ? prev.features.map(f => f.id === editDialog.item.id ? updatedItem : f)
          : [...prev.features, { ...updatedItem, id: Date.now() }]
      }));
    } else if (editDialog.type === 'pricing') {
      setWebsiteData(prev => ({
        ...prev,
        pricing: { ...prev.pricing, plans: prev.pricing.plans.map(p => p.id === updatedItem.id ? updatedItem : p) }
      }));
    }
    
    handleCloseDialog();
  };

  const handleDeleteItem = (type, id) => {
    setHasChanges(true);
    
    if (type === 'feature') {
      setWebsiteData(prev => ({
        ...prev,
        features: prev.features.filter(f => f.id !== id)
      }));
    } else if (type === 'testimonial') {
      setWebsiteData(prev => ({
        ...prev,
        testimonials: prev.testimonials.filter(t => t.id !== id)
      }));
    }
  };

  const tabs = [
    { label: 'Hero Section', icon: <DesignIcon /> },
    { label: 'Features', icon: <FeaturesIcon /> },
    { label: 'Pricing', icon: <PaymentIcon /> },
    { label: 'Testimonials', icon: <CustomersIcon /> },
    { label: 'Company Info', icon: <SettingsIcon /> },
    { label: 'Analytics', icon: <AnalyticsIcon /> },
    { label: 'About Page', icon: <PeopleIcon /> },
    { label: 'Blog Content', icon: <ArticleIcon /> },
    
    { label: 'Security Page', icon: <SecurityIcon /> }
  ];

  if (!profile || profile.role !== 'owner') {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Access Denied</Typography>
        <Typography color="text.secondary">
          Only website owners can access the CMS.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 3 }}>
          Go to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper sx={{ borderRadius: 0 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Website CMS
              </Typography>
              <Typography color="text.secondary">
                Manage your website content and settings
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
              >
                Preview Site
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save Changes
              </Button>
            </Stack>
          </Box>
        </Container>
      </Paper>

      {hasChanges && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          You have unsaved changes. Don't forget to save before leaving.
        </Alert>
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 0, overflow: 'hidden' }}>
              <Tabs
                orientation="vertical"
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ borderRight: 1, borderColor: 'divider' }}
              >
                {tabs.map((tab, index) => (
                  <Tab
                    key={index}
                    icon={tab.icon}
                    label={tab.label}
                    iconPosition="start"
                    sx={{ 
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      minHeight: 60,
                      px: 3
                    }}
                  />
                ))}
              </Tabs>
            </Paper>
          </Grid>

          {/* Content */}
          <Grid item xs={12} md={9}>
            <Paper sx={{ p: 4 }}>
              {/* Hero Section Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h5" gutterBottom>Hero Section</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Edit the main hero section of your homepage
                  </Typography>
                  
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Stack spacing={3}>
                        <TextField
                          label="Hero Title"
                          value={websiteData.hero.title}
                          onChange={(e) => {
                            setWebsiteData(prev => ({
                              ...prev,
                              hero: { ...prev.hero, title: e.target.value }
                            }));
                            setHasChanges(true);
                          }}
                          fullWidth
                          multiline
                          rows={2}
                        />
                        
                        <TextField
                          label="Hero Subtitle"
                          value={websiteData.hero.subtitle}
                          onChange={(e) => {
                            setWebsiteData(prev => ({
                              ...prev,
                              hero: { ...prev.hero, subtitle: e.target.value }
                            }));
                            setHasChanges(true);
                          }}
                          fullWidth
                          multiline
                          rows={3}
                        />
                        
                        <TextField
                          label="Call-to-Action Button Text"
                          value={websiteData.hero.ctaText}
                          onChange={(e) => {
                            setWebsiteData(prev => ({
                              ...prev,
                              hero: { ...prev.hero, ctaText: e.target.value }
                            }));
                            setHasChanges(true);
                          }}
                          fullWidth
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              )}

              {/* Features Tab */}
              {activeTab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h5">Features</Typography>
                      <Typography color="text.secondary">
                        Manage the features displayed on your website
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleEditItem('feature')}
                    >
                      Add Feature
                    </Button>
                  </Box>

                  <List>
                    {websiteData.features.map((feature) => (
                      <Card key={feature.id} sx={{ mb: 2 }}>
                        <ListItem>
                          <ListItemText
                            primary={feature.title}
                            secondary={feature.description}
                          />
                          <ListItemSecondaryAction>
                            <Stack direction="row" spacing={1}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={feature.enabled}
                                    onChange={(e) => {
                                      setWebsiteData(prev => ({
                                        ...prev,
                                        features: prev.features.map(f => 
                                          f.id === feature.id ? { ...f, enabled: e.target.checked } : f
                                        )
                                      }));
                                      setHasChanges(true);
                                    }}
                                  />
                                }
                                label=""
                              />
                              <IconButton onClick={() => handleEditItem('feature', feature)}>
                                <EditIcon />
                              </IconButton>
                              <IconButton onClick={() => handleDeleteItem('feature', feature.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          </ListItemSecondaryAction>
                        </ListItem>
                      </Card>
                    ))}
                  </List>
                </Box>
              )}

              {/* Pricing Tab */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h5" gutterBottom>Pricing Plans</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Configure your pricing plans and features
                  </Typography>

                  <Grid container spacing={3}>
                    {websiteData.pricing.plans.map((plan) => (
                      <Grid item xs={12} md={4} key={plan.id}>
                        <Card sx={{ height: '100%', position: 'relative' }}>
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
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>{plan.name}</Typography>
                            <Typography variant="h4" color="primary" gutterBottom>
                              ${typeof plan.price === 'number' ? plan.price : plan.price}
                              {typeof plan.price === 'number' && (
                                <Typography component="span" variant="body2" color="text.secondary">
                                  /month
                                </Typography>
                              )}
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>
                              {plan.description}
                            </Typography>
                            
                            <Box sx={{ mt: 2 }}>
                              {plan.features.map((feature, idx) => (
                                <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                                  • {feature}
                                </Typography>
                              ))}
                            </Box>
                            
                            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleEditItem('pricing', plan)}
                                fullWidth
                              >
                                Edit
                              </Button>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={plan.enabled}
                                    onChange={(e) => {
                                      setWebsiteData(prev => ({
                                        ...prev,
                                        pricing: {
                                          ...prev.pricing,
                                          plans: prev.pricing.plans.map(p => 
                                            p.id === plan.id ? { ...p, enabled: e.target.checked } : p
                                          )
                                        }
                                      }));
                                      setHasChanges(true);
                                    }}
                                  />
                                }
                                label=""
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Company Info Tab */}
              {activeTab === 4 && (
                <Box>
                  <Typography variant="h5" gutterBottom>Company Information</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Update your company details and contact information
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Company Name"
                        value={websiteData.company.name}
                        onChange={(e) => {
                          setWebsiteData(prev => ({
                            ...prev,
                            company: { ...prev.company, name: e.target.value }
                          }));
                          setHasChanges(true);
                        }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Tagline"
                        value={websiteData.company.tagline}
                        onChange={(e) => {
                          setWebsiteData(prev => ({
                            ...prev,
                            company: { ...prev.company, tagline: e.target.value }
                          }));
                          setHasChanges(true);
                        }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Company Description"
                        value={websiteData.company.description}
                        onChange={(e) => {
                          setWebsiteData(prev => ({
                            ...prev,
                            company: { ...prev.company, description: e.target.value }
                          }));
                          setHasChanges(true);
                        }}
                        fullWidth
                        multiline
                        rows={3}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Email"
                        value={websiteData.company.email}
                        onChange={(e) => {
                          setWebsiteData(prev => ({
                            ...prev,
                            company: { ...prev.company, email: e.target.value }
                          }));
                          setHasChanges(true);
                        }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Phone"
                        value={websiteData.company.phone}
                        onChange={(e) => {
                          setWebsiteData(prev => ({
                            ...prev,
                            company: { ...prev.company, phone: e.target.value }
                          }));
                          setHasChanges(true);
                        }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Address"
                        value={websiteData.company.address}
                        onChange={(e) => {
                          setWebsiteData(prev => ({
                            ...prev,
                            company: { ...prev.company, address: e.target.value }
                          }));
                          setHasChanges(true);
                        }}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Analytics Tab */}
              {activeTab === 5 && (
                <Box>
                  <Typography variant="h5" gutterBottom>Website Analytics</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Track your website performance and visitor metrics
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">1,234</Typography>
                          <Typography color="text.secondary">Monthly Visitors</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">89</Typography>
                          <Typography color="text.secondary">Trial Signups</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="warning.main">12%</Typography>
                          <Typography color="text.secondary">Conversion Rate</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="info.main">2:34</Typography>
                          <Typography color="text.secondary">Avg. Session</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* About Page Tab */}
              {activeTab === 6 && (
                <Box>
                  <Typography variant="h5" gutterBottom>About Page Content</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Edit the content displayed on your About page
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {/* Hero Section */}
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Hero Section</Typography>
                          <Stack spacing={2}>
                            <TextField
                              label="Hero Title"
                              value={websiteData.about?.hero?.title || ''}
                              onChange={(e) => {
                                setWebsiteData(prev => ({
                                  ...prev,
                                  about: {
                                    ...prev.about,
                                    hero: { ...prev.about?.hero, title: e.target.value }
                                  }
                                }));
                                setHasChanges(true);
                              }}
                              fullWidth
                            />
                            <TextField
                              label="Hero Subtitle"
                              value={websiteData.about?.hero?.subtitle || ''}
                              onChange={(e) => {
                                setWebsiteData(prev => ({
                                  ...prev,
                                  about: {
                                    ...prev.about,
                                    hero: { ...prev.about?.hero, subtitle: e.target.value }
                                  }
                                }));
                                setHasChanges(true);
                              }}
                              fullWidth
                              multiline
                              rows={3}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Story Section */}
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Our Story</Typography>
                          <Stack spacing={2}>
                            <TextField
                              label="Story Title"
                              value={websiteData.about?.story?.title || ''}
                              onChange={(e) => {
                                setWebsiteData(prev => ({
                                  ...prev,
                                  about: {
                                    ...prev.about,
                                    story: { ...prev.about?.story, title: e.target.value }
                                  }
                                }));
                                setHasChanges(true);
                              }}
                              fullWidth
                            />
                            <TextField
                              label="Story Description"
                              value={websiteData.about?.story?.description || ''}
                              onChange={(e) => {
                                setWebsiteData(prev => ({
                                  ...prev,
                                  about: {
                                    ...prev.about,
                                    story: { ...prev.about?.story, description: e.target.value }
                                  }
                                }));
                                setHasChanges(true);
                              }}
                              fullWidth
                              multiline
                              rows={2}
                            />
                            <TextField
                              label="Story Content"
                              value={websiteData.about?.story?.content || ''}
                              onChange={(e) => {
                                setWebsiteData(prev => ({
                                  ...prev,
                                  about: {
                                    ...prev.about,
                                    story: { ...prev.about?.story, content: e.target.value }
                                  }
                                }));
                                setHasChanges(true);
                              }}
                              fullWidth
                              multiline
                              rows={6}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Stats Section */}
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Statistics</Typography>
                          <Typography color="text.secondary" sx={{ mb: 2 }}>
                            Edit the statistics displayed on the About page
                          </Typography>
                          <Grid container spacing={2}>
                            {(websiteData.about?.stats || []).map((stat, index) => (
                              <Grid item xs={12} sm={6} key={index}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Stack spacing={2}>
                                      <TextField
                                        label="Value"
                                        value={stat.value}
                                        onChange={(e) => {
                                          const newStats = [...(websiteData.about?.stats || [])];
                                          newStats[index] = { ...newStats[index], value: e.target.value };
                                          setWebsiteData(prev => ({
                                            ...prev,
                                            about: { ...prev.about, stats: newStats }
                                          }));
                                          setHasChanges(true);
                                        }}
                                        fullWidth
                                      />
                                      <TextField
                                        label="Label"
                                        value={stat.label}
                                        onChange={(e) => {
                                          const newStats = [...(websiteData.about?.stats || [])];
                                          newStats[index] = { ...newStats[index], label: e.target.value };
                                          setWebsiteData(prev => ({
                                            ...prev,
                                            about: { ...prev.about, stats: newStats }
                                          }));
                                          setHasChanges(true);
                                        }}
                                        fullWidth
                                      />
                                    </Stack>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Team Section */}
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Team Members</Typography>
                            <Button
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={() => handleEditItem('team')}
                            >
                              Add Team Member
                            </Button>
                          </Box>
                          <Grid container spacing={2}>
                            {(websiteData.about?.team || []).map((member, index) => (
                              <Grid item xs={12} sm={6} md={4} key={index}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Stack spacing={2}>
                                      <TextField
                                        label="Name"
                                        value={member.name}
                                        onChange={(e) => {
                                          const newTeam = [...(websiteData.about?.team || [])];
                                          newTeam[index] = { ...newTeam[index], name: e.target.value };
                                          setWebsiteData(prev => ({
                                            ...prev,
                                            about: { ...prev.about, team: newTeam }
                                          }));
                                          setHasChanges(true);
                                        }}
                                        fullWidth
                                      />
                                      <TextField
                                        label="Role"
                                        value={member.role}
                                        onChange={(e) => {
                                          const newTeam = [...(websiteData.about?.team || [])];
                                          newTeam[index] = { ...newTeam[index], role: e.target.value };
                                          setWebsiteData(prev => ({
                                            ...prev,
                                            about: { ...prev.about, team: newTeam }
                                          }));
                                          setHasChanges(true);
                                        }}
                                        fullWidth
                                      />
                                      <TextField
                                        label="Bio"
                                        value={member.bio}
                                        onChange={(e) => {
                                          const newTeam = [...(websiteData.about?.team || [])];
                                          newTeam[index] = { ...newTeam[index], bio: e.target.value };
                                          setWebsiteData(prev => ({
                                            ...prev,
                                            about: { ...prev.about, team: newTeam }
                                          }));
                                          setHasChanges(true);
                                        }}
                                        fullWidth
                                        multiline
                                        rows={3}
                                      />
                                    </Stack>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Blog Content Tab */}
              {activeTab === 7 && (
                <Box>
                  <Typography variant="h5" gutterBottom>Blog Content</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Manage blog posts and content
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Blog content management is coming soon. For now, you can edit blog posts directly in the Blog page.
                  </Alert>
                  
                  <Button
                    variant="contained"
                    onClick={() => window.open('/blog', '_blank')}
                  >
                    View Blog Page
                  </Button>
                </Box>
              )}



                              {/* Security Page Tab */}
                {activeTab === 8 && (
                <Box>
                  <Typography variant="h5" gutterBottom>Security Page</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Manage security information and certifications
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Security page content management is coming soon. For now, you can edit security information directly in the Security page.
                  </Alert>
                  
                  <Button
                    variant="contained"
                    onClick={() => window.open('/security', '_blank')}
                  >
                    View Security Page
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Edit Dialog */}
      <EditItemDialog
        open={editDialog.open}
        type={editDialog.type}
        item={editDialog.item}
        onClose={handleCloseDialog}
        onSave={handleUpdateItem}
      />
    </Box>
  );
}

// Edit Item Dialog Component
function EditItemDialog({ open, type, item, onClose, onSave }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else if (type === 'feature') {
      setFormData({
        title: '',
        description: '',
        icon: 'CheckCircle',
        enabled: true
      });
    }
  }, [item, type]);

  const handleSave = () => {
    onSave(formData);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {item ? 'Edit' : 'Add'} {type === 'feature' ? 'Feature' : type}
      </DialogTitle>
      <DialogContent>
        {type === 'feature' && (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Icon Name"
              value={formData.icon || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              fullWidth
              helperText="Material-UI icon name (e.g., CheckCircle, Star, Settings)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                />
              }
              label="Enabled"
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}