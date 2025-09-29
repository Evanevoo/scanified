import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField, 
  Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  Snackbar, Divider, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, Avatar, Paper, Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
  TextareaAutosize, Tooltip, Stack, Badge
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Preview as PreviewIcon,
  Business as BusinessIcon,
  Navigation as NavigationIcon,
  ViewModule as HeroIcon,
  Widgets as FeaturesIcon,
  AttachMoney as PricingIcon,
  ViewList as FooterIcon,
  Search as SEOIcon,
  Analytics as AnalyticsIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Palette as ColorIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  Public as PublicIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Star as StarIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Launch as LaunchIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function WebsiteManagement() {
  const { profile } = useAuth();
  useOwnerAccess(profile);

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [previewDialog, setPreviewDialog] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Website content state
  const [websiteContent, setWebsiteContent] = useState({
    navigation: {
      logo: '/logo.png',
      logoText: 'Gas Cylinder Management',
      menuItems: [
        { label: 'Home', link: '/', visible: true },
        { label: 'Features', link: '#features', visible: true },
        { label: 'Pricing', link: '/pricing', visible: true },
        { label: 'About', link: '#about', visible: true },
        { label: 'Contact', link: '/contact', visible: true },
        { label: 'Login', link: '/login', visible: true },
        { label: 'Sign Up', link: '/register', visible: true }
      ],
      ctaButton: {
        text: 'Get Started Free',
        link: '/register',
        visible: true,
        style: 'contained'
      }
    },
    hero: {
      title: 'Streamline Your Gas Cylinder Management',
      subtitle: 'Track, manage, and optimize your gas cylinder operations with our comprehensive management system.',
      description: 'From inventory tracking to delivery management, our platform provides everything you need to run an efficient gas cylinder business.',
      ctaButtons: [
        { text: 'Start Free Trial', link: '/register', style: 'contained', visible: true },
        { text: 'Watch Demo', link: '#demo', style: 'outlined', visible: true }
      ],
      backgroundImage: '/hero-bg.jpg',
      backgroundVideo: '',
      showStats: true,
      stats: [
        { label: 'Active Users', value: '10,000+' },
        { label: 'Cylinders Tracked', value: '1M+' },
        { label: 'Deliveries Made', value: '500K+' },
        { label: 'Customer Satisfaction', value: '99%' }
      ]
    },
    features: {
      title: 'Everything You Need to Manage Your Gas Cylinders',
      subtitle: 'Comprehensive features designed for efficiency and growth',
      featureList: [
        {
          id: 1,
          title: 'Real-time Inventory Tracking',
          description: 'Track cylinder locations, status, and availability in real-time with barcode scanning.',
          icon: 'inventory',
          visible: true
        },
        {
          id: 2,
          title: 'Delivery Management',
          description: 'Optimize routes, track deliveries, and manage driver schedules efficiently.',
          icon: 'delivery',
          visible: true
        },
        {
          id: 3,
          title: 'Customer Portal',
          description: 'Give customers access to order history, tracking, and self-service options.',
          icon: 'customer',
          visible: true
        },
        {
          id: 4,
          title: 'Analytics & Reporting',
          description: 'Comprehensive reports and analytics to optimize your operations.',
          icon: 'analytics',
          visible: true
        },
        {
          id: 5,
          title: 'Mobile App',
          description: 'Field workers can scan, update, and manage cylinders from their mobile devices.',
          icon: 'mobile',
          visible: true
        },
        {
          id: 6,
          title: 'Safety Compliance',
          description: 'Ensure safety compliance with automated tracking and reporting.',
          icon: 'safety',
          visible: true
        }
      ]
    },
            pricing: {
          title: 'Simple, Transparent Pricing',
          subtitle: 'Choose the plan that fits your business needs',
          plans: [
            {
              id: 'basic',
              name: 'Basic',
              price: 29,
              period: 'month',
              description: 'Perfect for small businesses',
              features: [
                'Up to 5 users',
                'Up to 100 customers',
                'Up to 1,000 cylinders',
                'Basic inventory tracking',
                'Email support',
                'Mobile app access'
              ],
              highlighted: false,
              visible: true,
              ctaText: 'Start Free Trial',
              ctaLink: '/register?plan=basic'
            },
            {
              id: 'pro',
              name: 'Professional',
              price: 99,
              period: 'month',
              description: 'For growing businesses',
              features: [
                'Up to 15 users',
                'Up to 500 customers',
                'Up to 5,000 cylinders',
                'Advanced analytics',
                'Route optimization',
                'Priority support',
                'API access',
                'Custom reports'
              ],
              highlighted: true,
              visible: true,
              ctaText: 'Start Free Trial',
              ctaLink: '/register?plan=pro'
            },
            {
              id: 'enterprise',
              name: 'Enterprise',
              price: 299,
              period: 'month',
              description: 'For large operations',
              features: [
                'Unlimited users',
                'Unlimited customers',
                'Unlimited cylinders',
                'Custom integrations',
                'Dedicated support',
                'Advanced security',
                'Multi-location support',
                'Custom features'
              ],
              highlighted: false,
              visible: true,
              ctaText: 'Contact Sales',
              ctaLink: '/contact'
            }
          ]
        },
    footer: {
      companyInfo: {
        name: 'Gas Cylinder Management',
        description: 'Leading provider of gas cylinder management solutions for businesses of all sizes.',
        logo: '/logo.png'
      },
      contact: {
        email: 'info@gascylindermanagement.com',
        phone: '+1 (555) 123-4567',
        address: '123 Business Ave, Suite 100, City, State 12345'
      },
      links: {
        product: [
          { label: 'Features', link: '#features' },
          { label: 'Pricing', link: '/pricing' },
          { label: 'Security', link: '/security' },
          { label: 'Integrations', link: '/integrations' }
        ],
        company: [
          { label: 'About Us', link: '/about' },
  
          { label: 'Blog', link: '/blog' },
          { label: 'Press', link: '/press' }
        ],
        support: [
          { label: 'Help Center', link: '/help' },
          { label: 'Contact Us', link: '/contact' },
          { label: 'API Documentation', link: '/docs' },
          { label: 'Status', link: '/status' }
        ],
        legal: [
          { label: 'Privacy Policy', link: '/privacy' },
          { label: 'Terms of Service', link: '/terms' },
          { label: 'Cookie Policy', link: '/cookies' },
          { label: 'GDPR', link: '/gdpr' }
        ]
      },
      socialMedia: {
        facebook: 'https://facebook.com/gascylindermanagement',
        twitter: 'https://twitter.com/gascylindermgmt',
        linkedin: 'https://linkedin.com/company/gascylindermanagement',
        instagram: 'https://instagram.com/gascylindermanagement'
      },
      newsletter: {
        enabled: true,
        title: 'Stay Updated',
        description: 'Get the latest updates and industry insights delivered to your inbox.'
      }
    },
    seo: {
      global: {
        siteName: 'Gas Cylinder Management',
        defaultTitle: 'Gas Cylinder Management - Streamline Your Operations',
        defaultDescription: 'Comprehensive gas cylinder management system for tracking, delivery, and customer management.',
        keywords: 'gas cylinder, inventory management, delivery tracking, customer portal',
        author: 'Gas Cylinder Management Team',
        robots: 'index, follow',
        language: 'en-US',
        favicon: '/favicon.ico',
        appleTouchIcon: '/apple-touch-icon.png'
      },
      pages: {
        home: {
          title: 'Gas Cylinder Management - Streamline Your Operations',
          description: 'Comprehensive gas cylinder management system for tracking, delivery, and customer management.',
          keywords: 'gas cylinder management, inventory tracking, delivery optimization',
          ogImage: '/og-image-home.jpg'
        },
        pricing: {
          title: 'Pricing - Gas Cylinder Management',
          description: 'Simple, transparent pricing for gas cylinder management solutions. Start your free trial today.',
          keywords: 'gas cylinder management pricing, subscription plans, free trial',
          ogImage: '/og-image-pricing.jpg'
        },
        contact: {
          title: 'Contact Us - Gas Cylinder Management',
          description: 'Get in touch with our team for support, sales inquiries, or partnership opportunities.',
          keywords: 'contact, support, sales, partnership, gas cylinder management',
          ogImage: '/og-image-contact.jpg'
        }
      }
    },
    analytics: {
      googleAnalytics: {
        enabled: true,
        trackingId: 'GA_MEASUREMENT_ID',
        gtmId: 'GTM-XXXXXX'
      },
      facebookPixel: {
        enabled: false,
        pixelId: ''
      },
      hotjar: {
        enabled: false,
        siteId: ''
      },
      customScripts: {
        head: '',
        bodyStart: '',
        bodyEnd: ''
      }
    },
    theme: {
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      fontFamily: 'Inter, sans-serif',
      borderRadius: 8,
      customCSS: ''
    }
  });

  useEffect(() => {
    loadWebsiteContent();
  }, []);

  const loadWebsiteContent = () => {
    // Load from localStorage or API
    const savedContent = localStorage.getItem('websiteContent');
    if (savedContent) {
      const parsedContent = JSON.parse(savedContent);
      // Ensure proper structure with fallbacks
      const safeContent = {
        navigation: {
          logo: parsedContent.navigation?.logo || '/logo.png',
          logoText: parsedContent.navigation?.logoText || 'Gas Cylinder Management',
          menuItems: parsedContent.navigation?.menuItems || [
            { label: 'Home', link: '/', visible: true },
            { label: 'Features', link: '#features', visible: true },
            { label: 'Pricing', link: '/pricing', visible: true },
            { label: 'About', link: '#about', visible: true },
            { label: 'Contact', link: '/contact', visible: true },
            { label: 'Login', link: '/login', visible: true },
            { label: 'Sign Up', link: '/register', visible: true }
          ],
          ctaButton: parsedContent.navigation?.ctaButton || {
            text: 'Get Started Free',
            link: '/register',
            visible: true,
            style: 'contained'
          }
        },
        hero: {
          title: parsedContent.hero?.title || 'Streamline Your Gas Cylinder Management',
          subtitle: parsedContent.hero?.subtitle || 'Track, manage, and optimize your gas cylinder operations with our comprehensive management system.',
          description: parsedContent.hero?.description || 'From inventory tracking to delivery management, our platform provides everything you need to run an efficient gas cylinder business.',
          ctaButtons: Array.isArray(parsedContent.hero?.ctaButtons) ? parsedContent.hero.ctaButtons : [
            { text: 'Start Free Trial', link: '/register', style: 'contained', visible: true },
            { text: 'Watch Demo', link: '#demo', style: 'outlined', visible: true }
          ],
          backgroundImage: parsedContent.hero?.backgroundImage || '/hero-bg.jpg',
          backgroundVideo: parsedContent.hero?.backgroundVideo || '',
          showStats: parsedContent.hero?.showStats !== undefined ? parsedContent.hero.showStats : true,
          stats: Array.isArray(parsedContent.hero?.stats) ? parsedContent.hero.stats : [
            { label: 'Active Users', value: '10,000+' },
            { label: 'Cylinders Tracked', value: '1M+' },
            { label: 'Deliveries Made', value: '500K+' },
            { label: 'Customer Satisfaction', value: '99%' }
          ]
        },
        features: {
          title: parsedContent.features?.title || 'Everything You Need to Manage Your Gas Cylinders',
          subtitle: parsedContent.features?.subtitle || 'Comprehensive features designed for efficiency and growth',
          featureList: Array.isArray(parsedContent.features?.featureList) ? parsedContent.features.featureList : [
            {
              id: 1,
              title: 'Real-time Inventory Tracking',
              description: 'Track cylinder locations, status, and availability in real-time with barcode scanning.',
              icon: 'inventory',
              visible: true
            },
            {
              id: 2,
              title: 'Delivery Management',
              description: 'Optimize routes, track deliveries, and manage driver schedules efficiently.',
              icon: 'delivery',
              visible: true
            },
            {
              id: 3,
              title: 'Customer Portal',
              description: 'Give customers access to order history, tracking, and self-service options.',
              icon: 'customer',
              visible: true
            },
            {
              id: 4,
              title: 'Analytics & Reporting',
              description: 'Comprehensive reports and analytics to optimize your operations.',
              icon: 'analytics',
              visible: true
            },
            {
              id: 5,
              title: 'Mobile App',
              description: 'Field workers can scan, update, and manage cylinders from their mobile devices.',
              icon: 'mobile',
              visible: true
            },
            {
              id: 6,
              title: 'Safety Compliance',
              description: 'Ensure safety compliance with automated tracking and reporting.',
              icon: 'safety',
              visible: true
            }
          ]
        },
        pricing: parsedContent.pricing || {
          title: 'Simple, Transparent Pricing',
          subtitle: 'Choose the plan that fits your business needs',
          plans: [
            {
              id: 'basic',
              name: 'Basic',
              price: 29,
              period: 'month',
              description: 'Perfect for small businesses',
              features: [
                'Up to 1,000 cylinders',
                'Basic inventory tracking',
                'Customer management',
                'Email support',
                'Mobile app access'
              ],
              highlighted: false,
              visible: true,
              ctaText: 'Start Free Trial',
              ctaLink: '/register?plan=basic'
            },
            {
              id: 'pro',
              name: 'Professional',
              price: 99,
              period: 'month',
              description: 'For growing businesses',
              features: [
                'Up to 5,000 cylinders',
                'Advanced analytics',
                'Route optimization',
                'Priority support',
                'API access',
                'Custom reports'
              ],
              highlighted: true,
              visible: true,
              ctaText: 'Start Free Trial',
              ctaLink: '/register?plan=pro'
            },
            {
              id: 'enterprise',
              name: 'Enterprise',
              price: 299,
              period: 'month',
              description: 'For large operations',
              features: [
                'Unlimited cylinders',
                'Custom integrations',
                'Dedicated support',
                'Advanced security',
                'Multi-location support',
                'Custom features'
              ],
              highlighted: false,
              visible: true,
              ctaText: 'Contact Sales',
              ctaLink: '/contact'
            }
          ]
        },
        footer: parsedContent.footer || {
          companyInfo: {
            name: 'Gas Cylinder Management',
            description: 'Streamline your gas cylinder operations with our comprehensive management platform.',
            logo: '/logo.png'
          },
          contact: {
            email: 'support@gascylinder.com',
            phone: '+1 (555) 123-4567',
            address: '123 Business St, City, State 12345'
          },
          socialMedia: {
            facebook: 'https://facebook.com',
            twitter: 'https://twitter.com',
            linkedin: 'https://linkedin.com',
            instagram: 'https://instagram.com'
          },
          newsletter: {
            enabled: true,
            title: 'Stay Updated',
            description: 'Get the latest updates and news about our platform.'
          }
        },
        seo: parsedContent.seo || {
          global: {
            siteName: 'Gas Cylinder Management',
            defaultTitle: 'Gas Cylinder Management System - Streamline Your Operations',
            defaultDescription: 'Comprehensive gas cylinder management platform for tracking, delivery, and customer management.',
            keywords: 'gas cylinder, management, tracking, delivery, inventory',
            author: 'Gas Cylinder Management',
            language: 'en',
            favicon: '/favicon.ico',
            appleTouchIcon: '/apple-touch-icon.png'
          },
          pages: {
            home: {
              title: 'Gas Cylinder Management System - Streamline Your Operations',
              description: 'Comprehensive gas cylinder management platform for tracking, delivery, and customer management.',
              keywords: 'gas cylinder, management, tracking, delivery, inventory',
              ogImage: '/og-image.jpg'
            },
            pricing: {
              title: 'Pricing - Gas Cylinder Management System',
              description: 'Simple, transparent pricing for gas cylinder management. Choose the plan that fits your business needs.',
              keywords: 'pricing, gas cylinder, management, plans',
              ogImage: '/pricing-og.jpg'
            },
            contact: {
              title: 'Contact Us - Gas Cylinder Management',
              description: 'Get in touch with our team for support, sales inquiries, or general questions.',
              keywords: 'contact, support, gas cylinder, help',
              ogImage: '/contact-og.jpg'
            }
          }
        },
        analytics: parsedContent.analytics || {
          googleAnalytics: {
            enabled: false,
            trackingId: '',
            gtmId: ''
          },
          facebookPixel: {
            enabled: false,
            pixelId: ''
          },
          hotjar: {
            enabled: false,
            siteId: ''
          },
          customScripts: {
            head: '',
            bodyStart: '',
            bodyEnd: ''
          }
        },
        theme: parsedContent.theme || {
          primaryColor: '#1976d2',
          secondaryColor: '#dc004e',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          fontFamily: 'Roboto, sans-serif',
          borderRadius: 8,
          spacing: 16
        },
      };
      setWebsiteContent(safeContent);
    }
  };

  const saveWebsiteContent = () => {
    setLoading(true);
    try {
      // Save to localStorage (in production, this would be an API call)
      localStorage.setItem('websiteContent', JSON.stringify(websiteContent));
      setUnsavedChanges(false);
      setSnackbar({ open: true, message: 'Website content saved successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error saving website content', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (section, field, value) => {
    setWebsiteContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setUnsavedChanges(true);
  };

  const handleNestedContentChange = (section, subsection, field, value) => {
    setWebsiteContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
    setUnsavedChanges(true);
  };

  const handleDirectContentChange = (section, field, value) => {
    setWebsiteContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setUnsavedChanges(true);
  };

  const addMenuItem = () => {
    const newItem = { label: 'New Menu Item', link: '#', visible: true };
    setWebsiteContent(prev => ({
      ...prev,
      navigation: {
        ...prev.navigation,
        menuItems: [...prev.navigation.menuItems, newItem]
      }
    }));
    setUnsavedChanges(true);
  };

  const removeMenuItem = (index) => {
    setWebsiteContent(prev => ({
      ...prev,
      navigation: {
        ...prev.navigation,
        menuItems: prev.navigation.menuItems.filter((_, i) => i !== index)
      }
    }));
    setUnsavedChanges(true);
  };

  const updateMenuItem = (index, field, value) => {
    setWebsiteContent(prev => ({
      ...prev,
      navigation: {
        ...prev.navigation,
        menuItems: prev.navigation.menuItems.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }
    }));
    setUnsavedChanges(true);
  };

  const addFeature = () => {
    const newFeature = {
      id: Date.now(),
      title: 'New Feature',
      description: 'Feature description',
      icon: 'star',
      visible: true
    };
    setWebsiteContent(prev => ({
      ...prev,
      features: {
        ...prev.features,
        featureList: [...prev.features.featureList, newFeature]
      }
    }));
    setUnsavedChanges(true);
  };

  const removeFeature = (id) => {
    setWebsiteContent(prev => ({
      ...prev,
      features: {
        ...prev.features,
        featureList: prev.features.featureList.filter(f => f.id !== id)
      }
    }));
    setUnsavedChanges(true);
  };

  const updateFeature = (id, field, value) => {
    setWebsiteContent(prev => ({
      ...prev,
      features: {
        ...prev.features,
        featureList: prev.features.featureList.map(feature => 
          feature.id === id ? { ...feature, [field]: value } : feature
        )
      }
    }));
    setUnsavedChanges(true);
  };

  const renderNavigationEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <NavigationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Navigation Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Logo Text"
            value={websiteContent.navigation.logoText}
            onChange={(e) => handleDirectContentChange('navigation', 'logoText', e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Logo Image URL"
            value={websiteContent.navigation.logo}
            onChange={(e) => handleDirectContentChange('navigation', 'logo', e.target.value)}
            margin="normal"
          />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Menu Items</Typography>
      {Array.isArray(websiteContent.navigation.menuItems) && websiteContent.navigation.menuItems.map((item, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Label"
                  value={item.label}
                  onChange={(e) => updateMenuItem(index, 'label', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Link"
                  value={item.link}
                  onChange={(e) => updateMenuItem(index, 'link', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={item.visible}
                      onChange={(e) => updateMenuItem(index, 'visible', e.target.checked)}
                    />
                  }
                  label="Visible"
                />
              </Grid>
              <Grid item xs={2}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => removeMenuItem(index)}
                >
                  Remove
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={addMenuItem}
        sx={{ mt: 2 }}
      >
        Add Menu Item
      </Button>

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>CTA Button</Typography>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Button Text"
            value={websiteContent.navigation.ctaButton.text}
            onChange={(e) => handleNestedContentChange('navigation', 'ctaButton', 'text', e.target.value)}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Button Link"
            value={websiteContent.navigation.ctaButton.link}
            onChange={(e) => handleNestedContentChange('navigation', 'ctaButton', 'link', e.target.value)}
          />
        </Grid>
        <Grid item xs={2}>
          <FormControl fullWidth>
            <InputLabel>Style</InputLabel>
            <Select
              value={websiteContent.navigation.ctaButton.style}
              onChange={(e) => handleNestedContentChange('navigation', 'ctaButton', 'style', e.target.value)}
            >
              <MenuItem value="contained">Contained</MenuItem>
              <MenuItem value="outlined">Outlined</MenuItem>
              <MenuItem value="text">Text</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={2}>
          <FormControlLabel
            control={
              <Switch
                checked={websiteContent.navigation.ctaButton.visible}
                onChange={(e) => handleNestedContentChange('navigation', 'ctaButton', 'visible', e.target.checked)}
              />
            }
            label="Visible"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderHeroEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <HeroIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Hero Section
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Main Title"
            value={websiteContent.hero.title}
            onChange={(e) => handleDirectContentChange('hero', 'title', e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Subtitle"
            value={websiteContent.hero.subtitle}
            onChange={(e) => handleDirectContentChange('hero', 'subtitle', e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={websiteContent.hero.description}
            onChange={(e) => handleDirectContentChange('hero', 'description', e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Background Image URL"
            value={websiteContent.hero.backgroundImage}
            onChange={(e) => handleDirectContentChange('hero', 'backgroundImage', e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Background Video URL"
            value={websiteContent.hero.backgroundVideo}
            onChange={(e) => handleDirectContentChange('hero', 'backgroundVideo', e.target.value)}
            margin="normal"
          />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>CTA Buttons</Typography>
      {Array.isArray(websiteContent.hero.ctaButtons) && websiteContent.hero.ctaButtons.map((button, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Button Text"
                  value={button.text}
                  onChange={(e) => {
                    const newButtons = [...websiteContent.hero.ctaButtons];
                    newButtons[index] = { ...button, text: e.target.value };
                    handleNestedContentChange('hero', 'ctaButtons', '', newButtons);
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Link"
                  value={button.link}
                  onChange={(e) => {
                    const newButtons = [...websiteContent.hero.ctaButtons];
                    newButtons[index] = { ...button, link: e.target.value };
                    handleNestedContentChange('hero', 'ctaButtons', '', newButtons);
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Style</InputLabel>
                  <Select
                    value={button.style}
                    onChange={(e) => {
                      const newButtons = [...websiteContent.hero.ctaButtons];
                      newButtons[index] = { ...button, style: e.target.value };
                      handleNestedContentChange('hero', 'ctaButtons', '', newButtons);
                    }}
                  >
                    <MenuItem value="contained">Contained</MenuItem>
                    <MenuItem value="outlined">Outlined</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={button.visible}
                      onChange={(e) => {
                        const newButtons = [...websiteContent.hero.ctaButtons];
                        newButtons[index] = { ...button, visible: e.target.checked };
                        handleNestedContentChange('hero', 'ctaButtons', '', newButtons);
                      }}
                    />
                  }
                  label="Visible"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}

      <FormControlLabel
        control={
          <Switch
            checked={websiteContent.hero.showStats}
            onChange={(e) => handleDirectContentChange('hero', 'showStats', e.target.checked)}
          />
        }
        label="Show Statistics"
        sx={{ mt: 2 }}
      />

      {websiteContent.hero.showStats && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Statistics</Typography>
          {Array.isArray(websiteContent.hero.stats) && websiteContent.hero.stats.map((stat, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 1 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Label"
                  value={stat.label}
                  onChange={(e) => {
                    const newStats = [...websiteContent.hero.stats];
                    newStats[index] = { ...stat, label: e.target.value };
                    handleNestedContentChange('hero', 'stats', '', newStats);
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Value"
                  value={stat.value}
                  onChange={(e) => {
                    const newStats = [...websiteContent.hero.stats];
                    newStats[index] = { ...stat, value: e.target.value };
                    handleNestedContentChange('hero', 'stats', '', newStats);
                  }}
                  size="small"
                />
              </Grid>
            </Grid>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderFeaturesEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <FeaturesIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Features Section
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Section Title"
            value={websiteContent.features.title}
            onChange={(e) => handleDirectContentChange('features', 'title', e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Section Subtitle"
            value={websiteContent.features.subtitle}
            onChange={(e) => handleDirectContentChange('features', 'subtitle', e.target.value)}
            margin="normal"
          />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Feature List</Typography>
      {Array.isArray(websiteContent.features.featureList) && websiteContent.features.featureList.map((feature) => (
        <Card key={feature.id} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Feature Title"
                  value={feature.title}
                  onChange={(e) => updateFeature(feature.id, 'title', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Description"
                  value={feature.description}
                  onChange={(e) => updateFeature(feature.id, 'description', e.target.value)}
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  label="Icon"
                  value={feature.icon}
                  onChange={(e) => updateFeature(feature.id, 'icon', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={feature.visible}
                      onChange={(e) => updateFeature(feature.id, 'visible', e.target.checked)}
                    />
                  }
                  label="Visible"
                />
              </Grid>
              <Grid item xs={2}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => removeFeature(feature.id)}
                >
                  Remove
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={addFeature}
        sx={{ mt: 2 }}
      >
        Add Feature
      </Button>
    </Box>
  );

  const renderPricingEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <PricingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Pricing Section
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Section Title"
            value={websiteContent.pricing.title}
            onChange={(e) => handleDirectContentChange('pricing', 'title', e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Section Subtitle"
            value={websiteContent.pricing.subtitle}
            onChange={(e) => handleDirectContentChange('pricing', 'subtitle', e.target.value)}
            margin="normal"
          />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Pricing Plans</Typography>
      {Array.isArray(websiteContent.pricing.plans) && websiteContent.pricing.plans.map((plan) => (
        <Accordion key={plan.id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              {plan.name} - ${plan.price}/{plan.period}
              {plan.highlighted && <Chip label="Popular" color="primary" size="small" sx={{ ml: 2 }} />}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Plan Name"
                  value={plan.name}
                  onChange={(e) => {
                    const newPlans = websiteContent.pricing.plans.map(p => 
                      p.id === plan.id ? { ...p, name: e.target.value } : p
                    );
                    handleNestedContentChange('pricing', 'plans', '', newPlans);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={plan.price}
                  onChange={(e) => {
                    const newPlans = websiteContent.pricing.plans.map(p => 
                      p.id === plan.id ? { ...p, price: parseFloat(e.target.value) } : p
                    );
                    handleNestedContentChange('pricing', 'plans', '', newPlans);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Period"
                  value={plan.period}
                  onChange={(e) => {
                    const newPlans = websiteContent.pricing.plans.map(p => 
                      p.id === plan.id ? { ...p, period: e.target.value } : p
                    );
                    handleNestedContentChange('pricing', 'plans', '', newPlans);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={plan.description}
                  onChange={(e) => {
                    const newPlans = websiteContent.pricing.plans.map(p => 
                      p.id === plan.id ? { ...p, description: e.target.value } : p
                    );
                    handleNestedContentChange('pricing', 'plans', '', newPlans);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="CTA Text"
                  value={plan.ctaText}
                  onChange={(e) => {
                    const newPlans = websiteContent.pricing.plans.map(p => 
                      p.id === plan.id ? { ...p, ctaText: e.target.value } : p
                    );
                    handleNestedContentChange('pricing', 'plans', '', newPlans);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="CTA Link"
                  value={plan.ctaLink}
                  onChange={(e) => {
                    const newPlans = websiteContent.pricing.plans.map(p => 
                      p.id === plan.id ? { ...p, ctaLink: e.target.value } : p
                    );
                    handleNestedContentChange('pricing', 'plans', '', newPlans);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Features (one per line)</Typography>
                <TextareaAutosize
                  minRows={4}
                  style={{ width: '100%', padding: '8px', fontFamily: 'inherit' }}
                  value={plan.features.join('\n')}
                  onChange={(e) => {
                    const newPlans = websiteContent.pricing.plans.map(p => 
                      p.id === plan.id ? { ...p, features: e.target.value.split('\n').filter(f => f.trim()) } : p
                    );
                    handleNestedContentChange('pricing', 'plans', '', newPlans);
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={plan.highlighted}
                      onChange={(e) => {
                        const newPlans = websiteContent.pricing.plans.map(p => 
                          p.id === plan.id ? { ...p, highlighted: e.target.checked } : p
                        );
                        handleNestedContentChange('pricing', 'plans', '', newPlans);
                      }}
                    />
                  }
                  label="Highlighted Plan"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={plan.visible}
                      onChange={(e) => {
                        const newPlans = websiteContent.pricing.plans.map(p => 
                          p.id === plan.id ? { ...p, visible: e.target.checked } : p
                        );
                        handleNestedContentChange('pricing', 'plans', '', newPlans);
                      }}
                    />
                  }
                  label="Visible"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderFooterEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <FooterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Footer Settings
      </Typography>
      
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Company Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company Name"
                value={websiteContent.footer.companyInfo.name}
                onChange={(e) => handleNestedContentChange('footer', 'companyInfo', 'name', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Company Description"
                value={websiteContent.footer.companyInfo.description}
                onChange={(e) => handleNestedContentChange('footer', 'companyInfo', 'description', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Logo URL"
                value={websiteContent.footer.companyInfo.logo}
                onChange={(e) => handleNestedContentChange('footer', 'companyInfo', 'logo', e.target.value)}
                margin="normal"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Contact Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                value={websiteContent.footer.contact.email}
                onChange={(e) => handleNestedContentChange('footer', 'contact', 'email', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={websiteContent.footer.contact.phone}
                onChange={(e) => handleNestedContentChange('footer', 'contact', 'phone', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Address"
                value={websiteContent.footer.contact.address}
                onChange={(e) => handleNestedContentChange('footer', 'contact', 'address', e.target.value)}
                margin="normal"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Social Media</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Facebook URL"
                value={websiteContent.footer.socialMedia.facebook}
                onChange={(e) => handleNestedContentChange('footer', 'socialMedia', 'facebook', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Twitter URL"
                value={websiteContent.footer.socialMedia.twitter}
                onChange={(e) => handleNestedContentChange('footer', 'socialMedia', 'twitter', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="LinkedIn URL"
                value={websiteContent.footer.socialMedia.linkedin}
                onChange={(e) => handleNestedContentChange('footer', 'socialMedia', 'linkedin', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Instagram URL"
                value={websiteContent.footer.socialMedia.instagram}
                onChange={(e) => handleNestedContentChange('footer', 'socialMedia', 'instagram', e.target.value)}
                margin="normal"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Newsletter Signup</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={websiteContent.footer.newsletter.enabled}
                    onChange={(e) => handleNestedContentChange('footer', 'newsletter', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Newsletter Signup"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Newsletter Title"
                value={websiteContent.footer.newsletter.title}
                onChange={(e) => handleNestedContentChange('footer', 'newsletter', 'title', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Newsletter Description"
                value={websiteContent.footer.newsletter.description}
                onChange={(e) => handleNestedContentChange('footer', 'newsletter', 'description', e.target.value)}
                margin="normal"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  const renderSEOEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <SEOIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        SEO Settings
      </Typography>
      
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Global SEO Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Site Name"
                value={websiteContent.seo.global.siteName}
                onChange={(e) => handleNestedContentChange('seo', 'global', 'siteName', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Default Title"
                value={websiteContent.seo.global.defaultTitle}
                onChange={(e) => handleNestedContentChange('seo', 'global', 'defaultTitle', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Default Description"
                value={websiteContent.seo.global.defaultDescription}
                onChange={(e) => handleNestedContentChange('seo', 'global', 'defaultDescription', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Keywords"
                value={websiteContent.seo.global.keywords}
                onChange={(e) => handleNestedContentChange('seo', 'global', 'keywords', e.target.value)}
                margin="normal"
                helperText="Separate keywords with commas"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Author"
                value={websiteContent.seo.global.author}
                onChange={(e) => handleNestedContentChange('seo', 'global', 'author', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Language"
                value={websiteContent.seo.global.language}
                onChange={(e) => handleNestedContentChange('seo', 'global', 'language', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Favicon URL"
                value={websiteContent.seo.global.favicon}
                onChange={(e) => handleNestedContentChange('seo', 'global', 'favicon', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Apple Touch Icon URL"
                value={websiteContent.seo.global.appleTouchIcon}
                onChange={(e) => handleNestedContentChange('seo', 'global', 'appleTouchIcon', e.target.value)}
                margin="normal"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {Object.entries(websiteContent.seo.pages || {}).map(([page, seoData]) => (
        <Accordion key={page}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{page.charAt(0).toUpperCase() + page.slice(1)} Page SEO</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Page Title"
                  value={seoData.title}
                  onChange={(e) => {
                    const newPages = { ...websiteContent.seo.pages };
                    newPages[page] = { ...newPages[page], title: e.target.value };
                    handleNestedContentChange('seo', 'pages', '', newPages);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Page Description"
                  value={seoData.description}
                  onChange={(e) => {
                    const newPages = { ...websiteContent.seo.pages };
                    newPages[page] = { ...newPages[page], description: e.target.value };
                    handleNestedContentChange('seo', 'pages', '', newPages);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Keywords"
                  value={seoData.keywords}
                  onChange={(e) => {
                    const newPages = { ...websiteContent.seo.pages };
                    newPages[page] = { ...newPages[page], keywords: e.target.value };
                    handleNestedContentChange('seo', 'pages', '', newPages);
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="OG Image URL"
                  value={seoData.ogImage}
                  onChange={(e) => {
                    const newPages = { ...websiteContent.seo.pages };
                    newPages[page] = { ...newPages[page], ogImage: e.target.value };
                    handleNestedContentChange('seo', 'pages', '', newPages);
                  }}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderAnalyticsEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Analytics & Tracking
      </Typography>
      
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Google Analytics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={websiteContent.analytics.googleAnalytics.enabled}
                    onChange={(e) => handleNestedContentChange('analytics', 'googleAnalytics', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Google Analytics"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="GA4 Measurement ID"
                value={websiteContent.analytics.googleAnalytics.trackingId}
                onChange={(e) => handleNestedContentChange('analytics', 'googleAnalytics', 'trackingId', e.target.value)}
                margin="normal"
                helperText="Format: G-XXXXXXXXXX"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Google Tag Manager ID"
                value={websiteContent.analytics.googleAnalytics.gtmId}
                onChange={(e) => handleNestedContentChange('analytics', 'googleAnalytics', 'gtmId', e.target.value)}
                margin="normal"
                helperText="Format: GTM-XXXXXXX"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Facebook Pixel</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={websiteContent.analytics.facebookPixel.enabled}
                    onChange={(e) => handleNestedContentChange('analytics', 'facebookPixel', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Facebook Pixel"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Facebook Pixel ID"
                value={websiteContent.analytics.facebookPixel.pixelId}
                onChange={(e) => handleNestedContentChange('analytics', 'facebookPixel', 'pixelId', e.target.value)}
                margin="normal"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Hotjar</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={websiteContent.analytics.hotjar.enabled}
                    onChange={(e) => handleNestedContentChange('analytics', 'hotjar', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Hotjar"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hotjar Site ID"
                value={websiteContent.analytics.hotjar.siteId}
                onChange={(e) => handleNestedContentChange('analytics', 'hotjar', 'siteId', e.target.value)}
                margin="normal"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Custom Scripts</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Head Scripts</Typography>
              <TextareaAutosize
                minRows={4}
                placeholder="Scripts to be inserted in the <head> section"
                style={{ width: '100%', padding: '8px', fontFamily: 'monospace' }}
                value={websiteContent.analytics.customScripts.head}
                onChange={(e) => handleNestedContentChange('analytics', 'customScripts', 'head', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Body Start Scripts</Typography>
              <TextareaAutosize
                minRows={4}
                placeholder="Scripts to be inserted at the beginning of <body>"
                style={{ width: '100%', padding: '8px', fontFamily: 'monospace' }}
                value={websiteContent.analytics.customScripts.bodyStart}
                onChange={(e) => handleNestedContentChange('analytics', 'customScripts', 'bodyStart', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Body End Scripts</Typography>
              <TextareaAutosize
                minRows={4}
                placeholder="Scripts to be inserted at the end of <body>"
                style={{ width: '100%', padding: '8px', fontFamily: 'monospace' }}
                value={websiteContent.analytics.customScripts.bodyEnd}
                onChange={(e) => handleNestedContentChange('analytics', 'customScripts', 'bodyEnd', e.target.value)}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  const renderThemeEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <ColorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Theme & Styling
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Primary Color"
            value={websiteContent.theme.primaryColor}
            onChange={(e) => handleNestedContentChange('theme', 'primaryColor', '', e.target.value)}
            margin="normal"
            type="color"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Secondary Color"
            value={websiteContent.theme.secondaryColor}
            onChange={(e) => handleNestedContentChange('theme', 'secondaryColor', '', e.target.value)}
            margin="normal"
            type="color"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Background Color"
            value={websiteContent.theme.backgroundColor}
            onChange={(e) => handleNestedContentChange('theme', 'backgroundColor', '', e.target.value)}
            margin="normal"
            type="color"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Text Color"
            value={websiteContent.theme.textColor}
            onChange={(e) => handleNestedContentChange('theme', 'textColor', '', e.target.value)}
            margin="normal"
            type="color"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Font Family"
            value={websiteContent.theme.fontFamily}
            onChange={(e) => handleNestedContentChange('theme', 'fontFamily', '', e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Border Radius"
            value={websiteContent.theme.borderRadius}
            onChange={(e) => handleNestedContentChange('theme', 'borderRadius', '', parseInt(e.target.value))}
            margin="normal"
            type="number"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>Custom CSS</Typography>
          <TextareaAutosize
            minRows={8}
            placeholder="Add custom CSS styles here..."
            style={{ width: '100%', padding: '8px', fontFamily: 'monospace' }}
            value={websiteContent.theme.customCSS}
            onChange={(e) => handleNestedContentChange('theme', 'customCSS', '', e.target.value)}
          />
        </Grid>
      </Grid>
    </Box>
  );


  const tabs = [
    { label: 'Navigation', icon: <NavigationIcon />, component: renderNavigationEditor },
    { label: 'Hero Section', icon: <HeroIcon />, component: renderHeroEditor },
    { label: 'Features', icon: <FeaturesIcon />, component: renderFeaturesEditor },
    { label: 'Pricing', icon: <PricingIcon />, component: renderPricingEditor },
    { label: 'Footer', icon: <FooterIcon />, component: renderFooterEditor },
    { label: 'SEO', icon: <SEOIcon />, component: renderSEOEditor },
    { label: 'Analytics', icon: <AnalyticsIcon />, component: renderAnalyticsEditor },
    { label: 'Theme', icon: <ColorIcon />, component: renderThemeEditor },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Website Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => window.open('/', '_blank')}
          >
            Preview Website
          </Button>
          <Button
            variant="outlined"
            startIcon={<LaunchIcon />}
            onClick={() => window.open('/landing', '_blank')}
          >
            View Landing Page
          </Button>
          <Badge badgeContent={unsavedChanges ? '●' : 0} color="error">
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveWebsiteContent}
              disabled={loading || !unsavedChanges}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Badge>
        </Box>
      </Box>

      {unsavedChanges && (
        <Box sx={{ 
          p: 2, 
          mb: 3, 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '4px',
          color: '#856404'
        }}>
          You have unsaved changes. Don't forget to save your modifications.
        </Box>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={index}
              label={tab.label} 
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {tabs[activeTab]?.component()}
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
} 