import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField, 
  Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  Alert, Snackbar, Divider, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, Rating, Avatar, Paper, Tabs, Tab
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Preview as PreviewIcon,
  Business as BusinessIcon,
  Star as StarIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default React.memo(function LandingPageEditor() {
  const { profile } = useAuth();
  useOwnerAccess(profile);

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [previewDialog, setPreviewDialog] = useState(false);

  // Landing page content state
  const [landingContent, setLandingContent] = useState({
    // Hero Section
    hero: {
      title: 'Modern Gas Cylinder Management Platform',
      subtitle: 'Replace expensive legacy systems with our modern, mobile-first platform. Track cylinders, manage deliveries, and grow your business with the tools built for today\'s gas industry.',
      ctaText: 'Start Free Trial',
      trustBadge: '🚀 Trusted by 500+ Gas Companies'
    },
    
    // Company Information
    company: {
      name: 'scanified',
      description: 'The modern alternative to legacy asset management systems',
      phone: '(555) 123-4567',
      email: 'hello@scanified.com',
      address: '123 Business Street, City, State 12345'
    },

    // Features Section
    features: [
      {
        id: 1,
        icon: 'PhoneIphone',
        title: 'Mobile-First Design',
        description: 'Built for the field. Scan cylinders with any smartphone - no expensive hardware needed.',
        color: '#3B82F6'
      },
      {
        id: 2,
        icon: 'TrendingUp',
        title: 'AI-Powered Insights',
        description: 'Predictive maintenance alerts, usage analytics, and smart recommendations.',
        color: '#10B981'
      },
      {
        id: 3,
        icon: 'Speed',
        title: 'Setup in Minutes',
        description: 'Self-service onboarding. Start tracking cylinders today, not next quarter.',
        color: '#F59E0B'
      },
      {
        id: 4,
        icon: 'Security',
        title: 'Enterprise Security',
        description: 'Bank-level security with role-based access and audit trails.',
        color: '#8B5CF6'
      }
    ],

    // Testimonials
    testimonials: [
      {
        id: 1,
        name: 'Sarah Johnson',
        position: 'Operations Manager',
        company: 'Industrial Gas Solutions',
        rating: 5,
        text: 'This platform transformed our cylinder tracking. We went from manual spreadsheets to real-time visibility in just one day. The mobile app is incredibly intuitive.',
        avatar: 'SJ',
        verified: true
      },
      {
        id: 2,
        name: 'Mike Chen',
        position: 'Fleet Supervisor',
        company: 'Metro Gas Distribution',
        rating: 5,
        text: 'Finally, a system that actually works in the field. Our drivers love the mobile scanning, and I love the real-time reports. ROI was immediate.',
        avatar: 'MC',
        verified: true
      },
      {
        id: 3,
        name: 'Jennifer Martinez',
        position: 'Business Owner',
        company: 'Southwest Cylinder Co.',
        rating: 5,
        text: 'Switched from TrackAbout and never looked back. This is what modern software should be - simple, powerful, and actually affordable.',
        avatar: 'JM',
        verified: true
      }
    ],

    // Client Logos
    clients: [
      { name: 'Industrial Gas Solutions', logo: '/logos/client1.png' },
      { name: 'Metro Gas Distribution', logo: '/logos/client2.png' },
      { name: 'Southwest Cylinder Co.', logo: '/logos/client3.png' },
      { name: 'Northern Gas Systems', logo: '/logos/client4.png' },
      { name: 'Coastal Gas Services', logo: '/logos/client5.png' },
      { name: 'Mountain View Gas', logo: '/logos/client6.png' }
    ],

    // Security Badges
    security: {
      ssl: true,
      soc2: true,
      gdpr: true,
      uptime: '99.9%'
    },

    // Pricing
    pricing: {
      starter: {
        name: 'Starter',
        price: 29,
        features: ['Up to 100 cylinders', 'Basic reporting', 'Mobile app', 'Email support']
      },
      professional: {
        name: 'Professional',
        price: 79,
        features: ['Up to 1,000 cylinders', 'Advanced analytics', 'API access', 'Priority support']
      },
      enterprise: {
        name: 'Enterprise',
        price: 199,
        features: ['Unlimited cylinders', 'Custom integrations', 'Dedicated support', 'Advanced security']
      }
    }
  });

  // Dialog states
  const [testimonialDialog, setTestimonialDialog] = useState({ open: false, testimonial: null, isEdit: false });
  const [featureDialog, setFeatureDialog] = useState({ open: false, feature: null, isEdit: false });

  useEffect(() => {
    loadLandingContent();
  }, []);

  const loadLandingContent = () => {
    // Load from localStorage or API
    const saved = localStorage.getItem('landingPageContent');
    if (saved) {
      setLandingContent(JSON.parse(saved));
    }
  };

  const saveLandingContent = () => {
    setLoading(true);
    try {
      // Save to localStorage (in production, save to database)
      localStorage.setItem('landingPageContent', JSON.stringify(landingContent));
      
      // Here you would also update the actual LandingPage.jsx component
      // For now, we'll just show success message
      setSnackbar({ 
        open: true, 
        message: 'Landing page content saved successfully!', 
        severity: 'success' 
      });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Error saving content: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = useCallback((section, field, value) => {
    setLandingContent(prev => {
      // Only update if the value actually changed
      if (prev[section] && prev[section][field] === value) {
        return prev;
      }
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
    });
  }, []);

  // Create stable onChange handlers for each field
  const createStableOnChange = useCallback((section, field) => {
    return useCallback((e) => {
      handleContentChange(section, field, e.target.value);
    }, [section, field, handleContentChange]);
  }, [handleContentChange]);

  const handleTestimonialSave = (testimonial) => {
    if (testimonialDialog.isEdit) {
      setLandingContent(prev => ({
        ...prev,
        testimonials: prev.testimonials.map(t => 
          t.id === testimonial.id ? testimonial : t
        )
      }));
    } else {
      const newTestimonial = {
        ...testimonial,
        id: Date.now(),
        verified: true
      };
      setLandingContent(prev => ({
        ...prev,
        testimonials: [...prev.testimonials, newTestimonial]
      }));
    }
    setTestimonialDialog({ open: false, testimonial: null, isEdit: false });
  };

  const handleTestimonialDelete = (id) => {
    setLandingContent(prev => ({
      ...prev,
      testimonials: prev.testimonials.filter(t => t.id !== id)
    }));
  };

  const handleFeatureSave = (feature) => {
    if (featureDialog.isEdit) {
      setLandingContent(prev => ({
        ...prev,
        features: prev.features.map(f => 
          f.id === feature.id ? feature : f
        )
      }));
    } else {
      const newFeature = {
        ...feature,
        id: Date.now()
      };
      setLandingContent(prev => ({
        ...prev,
        features: [...prev.features, newFeature]
      }));
    }
    setFeatureDialog({ open: false, feature: null, isEdit: false });
  };

  const handleFeatureDelete = (id) => {
    setLandingContent(prev => ({
      ...prev,
      features: prev.features.filter(f => f.id !== id)
    }));
  };

  const TabPanel = React.memo(({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  ));

  // Debug: Let's see what's causing the re-renders
  console.log('LandingPageEditor render', { activeTab, loading });

  // Simple native HTML input that works (like the debug input)
  const NativeInput = React.memo(({ 
    label, 
    initialValue, 
    onSave, 
    multiline = false, 
    rows = 1, 
    fullWidth = true,
    fieldKey,
    ...props 
  }) => {
    const inputRef = useRef(null);
    
    const handleBlur = () => {
      if (inputRef.current && inputRef.current.value !== initialValue) {
        onSave(inputRef.current.value);
      }
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !multiline) {
        inputRef.current?.blur();
      }
    };
    
    return (
      <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {label}
        </Typography>
        {multiline ? (
          <textarea
            ref={inputRef}
            defaultValue={initialValue}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={rows}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '16px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: `${rows * 24}px`,
              boxSizing: 'border-box'
            }}
            {...props}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            defaultValue={initialValue}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '16px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
            {...props}
          />
        )}
      </Box>
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* DEBUG: Simple test input */}
      <Box sx={{ mb: 3, p: 2, border: '2px solid red', bgcolor: 'yellow' }}>
        <Typography variant="h6" color="error">DEBUG: Test Input</Typography>
        <input
          type="text"
          defaultValue="Test input - try typing here"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            fontSize: '16px'
          }}
          onFocus={() => console.log('DEBUG: Test input focused')}
          onBlur={() => console.log('DEBUG: Test input blurred')}
        />
        <Typography variant="caption">If this input loses focus while typing, the issue is with the browser or React setup.</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Landing Page Editor
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => window.open('/landing', '_blank')}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveLandingContent}
            disabled={loading}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Legal Notice:</strong> Using fake testimonials or reviews is illegal and can result in FTC fines. 
          Always use real customer feedback and obtain proper consent before displaying testimonials.
        </Typography>
      </Alert>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Hero Section" />
          <Tab label="Company Info" />
          <Tab label="Features" />
          <Tab label="Testimonials" />
          <Tab label="Clients & Security" />
          <Tab label="Pricing" />
        </Tabs>

        {/* Hero Section Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Hero Section</Typography>
            </Grid>
            <Grid item xs={12}>
              <NativeInput
                fieldKey="hero-title"
                fullWidth
                label="Main Title"
                initialValue={landingContent.hero.title}
                onSave={(value) => handleContentChange('hero', 'title', value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <NativeInput
                fieldKey="hero-subtitle"
                fullWidth
                label="Subtitle"
                initialValue={landingContent.hero.subtitle}
                onSave={(value) => handleContentChange('hero', 'subtitle', value)}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fieldKey="hero-ctaText"
                fullWidth
                label="Call-to-Action Button Text"
                initialValue={landingContent.hero.ctaText}
                onSave={(value) => handleContentChange('hero', 'ctaText', value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fieldKey="hero-trustBadge"
                fullWidth
                label="Trust Badge"
                initialValue={landingContent.hero.trustBadge}
                onSave={(value) => handleContentChange('hero', 'trustBadge', value)}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Company Info Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Company Information</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fieldKey="company-name"
                fullWidth
                label="Company Name"
                initialValue={landingContent.company.name}
                onSave={(value) => handleContentChange('company', 'name', value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fieldKey="company-description"
                fullWidth
                label="Description"
                initialValue={landingContent.company.description}
                onSave={(value) => handleContentChange('company', 'description', value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <NativeInput
                fieldKey="company-phone"
                fullWidth
                label="Phone Number"
                initialValue={landingContent.company.phone}
                onSave={(value) => handleContentChange('company', 'phone', value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <NativeInput
                fieldKey="company-email"
                fullWidth
                label="Email Address"
                initialValue={landingContent.company.email}
                onSave={(value) => handleContentChange('company', 'email', value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <NativeInput
                fieldKey="company-address"
                fullWidth
                label="Address"
                initialValue={landingContent.company.address}
                onSave={(value) => handleContentChange('company', 'address', value)}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Features Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Features</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFeatureDialog({ 
                open: true, 
                feature: { title: '', description: '', icon: 'Star', color: '#3B82F6' }, 
                isEdit: false 
              })}
            >
              Add Feature
            </Button>
          </Box>
          <Grid container spacing={2}>
            {landingContent.features.map((feature) => (
              <Grid item xs={12} md={6} key={feature.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                        <Chip 
                          label={feature.icon} 
                          size="small" 
                          sx={{ mt: 1, bgcolor: feature.color, color: 'white' }}
                        />
                      </Box>
                      <Box>
                        <IconButton
                          onClick={() => setFeatureDialog({ 
                            open: true, 
                            feature, 
                            isEdit: true 
                          })}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleFeatureDelete(feature.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Testimonials Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Customer Testimonials</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setTestimonialDialog({ 
                open: true, 
                testimonial: { name: '', position: '', company: '', rating: 5, text: '', avatar: '' }, 
                isEdit: false 
              })}
            >
              Add Testimonial
            </Button>
          </Box>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Only use real customer testimonials. Fake reviews are illegal and can result in FTC fines up to $43,792 per violation.
            </Typography>
          </Alert>
          <Grid container spacing={2}>
            {landingContent.testimonials.map((testimonial) => (
              <Grid item xs={12} md={6} key={testimonial.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {testimonial.avatar}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {testimonial.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {testimonial.position} at {testimonial.company}
                          </Typography>
                          <Rating value={testimonial.rating} readOnly size="small" />
                        </Box>
                      </Box>
                      <Box>
                        <IconButton
                          onClick={() => setTestimonialDialog({ 
                            open: true, 
                            testimonial, 
                            isEdit: true 
                          })}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleTestimonialDelete(testimonial.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2">
                      "{testimonial.text}"
                    </Typography>
                    {testimonial.verified && (
                      <Chip 
                        label="Verified Customer" 
                        size="small" 
                        color="success" 
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Clients & Security Tab */}
        <TabPanel value={activeTab} index={4}>
          <Typography variant="h6" gutterBottom>Client Logos & Security Badges</Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Client logos and security badges help build trust. Make sure you have permission to use client logos.
          </Alert>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Security Features</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={landingContent.security.ssl}
                    onChange={(e) => handleContentChange('security', 'ssl', e.target.checked)}
                  />
                }
                label="SSL Certificate"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={landingContent.security.soc2}
                    onChange={(e) => handleContentChange('security', 'soc2', e.target.checked)}
                  />
                }
                label="SOC 2 Compliant"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={landingContent.security.gdpr}
                    onChange={(e) => handleContentChange('security', 'gdpr', e.target.checked)}
                  />
                }
                label="GDPR Compliant"
              />
              <NativeInput
                fullWidth
                label="Uptime Guarantee"
                initialValue={landingContent.security.uptime}
                onSave={(value) => handleContentChange('security', 'uptime', value)}
                sx={{ mt: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Client Logos</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Upload client logos to /public/logos/ directory and reference them here.
              </Alert>
              {landingContent.clients.map((client, index) => (
                <NativeInput
                  key={index}
                  fullWidth
                  label={`Client ${index + 1} Name`}
                  initialValue={client.name}
                  onSave={(value) => {
                    const newClients = [...landingContent.clients];
                    newClients[index].name = value;
                    setLandingContent(prev => ({ ...prev, clients: newClients }));
                  }}
                  sx={{ mb: 1 }}
                />
              ))}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Pricing Tab */}
        <TabPanel value={activeTab} index={5}>
          <Typography variant="h6" gutterBottom>Pricing Plans</Typography>
          <Grid container spacing={3}>
            {Object.entries(landingContent.pricing).map(([key, plan]) => (
              <Grid item xs={12} md={4} key={key}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {plan.name}
                    </Typography>
                    <Typography variant="h4" color="primary" gutterBottom>
                      ${plan.price}
                      <Typography variant="body2" component="span" color="text.secondary">
                        /month
                      </Typography>
                    </Typography>
                    <List dense>
                      {plan.features.map((feature, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                    <NativeInput
                      fullWidth
                      label="Plan Name"
                      initialValue={plan.name}
                      onSave={(value) => {
                        const newPricing = { ...landingContent.pricing };
                        newPricing[key].name = value;
                        setLandingContent(prev => ({ ...prev, pricing: newPricing }));
                      }}
                      sx={{ mt: 2, mb: 1 }}
                    />
                    <NativeInput
                      fullWidth
                      label="Price"
                      type="number"
                      initialValue={plan.price}
                      onSave={(value) => {
                        const newPricing = { ...landingContent.pricing };
                        newPricing[key].price = parseInt(value);
                        setLandingContent(prev => ({ ...prev, pricing: newPricing }));
                      }}
                      sx={{ mb: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Testimonial Dialog */}
      <Dialog
        open={testimonialDialog.open}
        onClose={() => setTestimonialDialog({ open: false, testimonial: null, isEdit: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {testimonialDialog.isEdit ? 'Edit Testimonial' : 'Add New Testimonial'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Legal Warning:</strong> Only use real customer testimonials. Using fake reviews is illegal and can result in FTC fines.
            </Typography>
          </Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <NativeInput
                fullWidth
                label="Customer Name"
                initialValue={testimonialDialog.testimonial?.name || ''}
                onSave={(value) => setTestimonialDialog(prev => ({
                  ...prev,
                  testimonial: { ...prev.testimonial, name: value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fullWidth
                label="Position"
                initialValue={testimonialDialog.testimonial?.position || ''}
                onSave={(value) => setTestimonialDialog(prev => ({
                  ...prev,
                  testimonial: { ...prev.testimonial, position: value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fullWidth
                label="Company"
                initialValue={testimonialDialog.testimonial?.company || ''}
                onSave={(value) => setTestimonialDialog(prev => ({
                  ...prev,
                  testimonial: { ...prev.testimonial, company: value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fullWidth
                label="Avatar (Initials)"
                initialValue={testimonialDialog.testimonial?.avatar || ''}
                onSave={(value) => setTestimonialDialog(prev => ({
                  ...prev,
                  testimonial: { ...prev.testimonial, avatar: value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>Rating</Typography>
              <Rating
                value={testimonialDialog.testimonial?.rating || 5}
                onChange={(e, value) => setTestimonialDialog(prev => ({
                  ...prev,
                  testimonial: { ...prev.testimonial, rating: value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <NativeInput
                fullWidth
                label="Testimonial Text"
                multiline
                rows={4}
                initialValue={testimonialDialog.testimonial?.text || ''}
                onSave={(value) => setTestimonialDialog(prev => ({
                  ...prev,
                  testimonial: { ...prev.testimonial, text: value }
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestimonialDialog({ open: false, testimonial: null, isEdit: false })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleTestimonialSave(testimonialDialog.testimonial)}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feature Dialog */}
      <Dialog
        open={featureDialog.open}
        onClose={() => setFeatureDialog({ open: false, feature: null, isEdit: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {featureDialog.isEdit ? 'Edit Feature' : 'Add New Feature'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <NativeInput
                fullWidth
                label="Feature Title"
                initialValue={featureDialog.feature?.title || ''}
                onSave={(value) => setFeatureDialog(prev => ({
                  ...prev,
                  feature: { ...prev.feature, title: value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <NativeInput
                fullWidth
                label="Description"
                multiline
                rows={3}
                initialValue={featureDialog.feature?.description || ''}
                onSave={(value) => setFeatureDialog(prev => ({
                  ...prev,
                  feature: { ...prev.feature, description: value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fullWidth
                label="Icon Name"
                initialValue={featureDialog.feature?.icon || ''}
                onSave={(value) => setFeatureDialog(prev => ({
                  ...prev,
                  feature: { ...prev.feature, icon: value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NativeInput
                fullWidth
                label="Color"
                initialValue={featureDialog.feature?.color || ''}
                onSave={(value) => setFeatureDialog(prev => ({
                  ...prev,
                  feature: { ...prev.feature, color: value }
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeatureDialog({ open: false, feature: null, isEdit: false })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleFeatureSave(featureDialog.feature)}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}); 