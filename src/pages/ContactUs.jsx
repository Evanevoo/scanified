import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Stack,
  Divider,
  Chip,
  IconButton,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Support as SupportIcon,
  BusinessCenter as SalesIcon,
  Chat as ChatIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { trackContactForm, trackPhoneCall, trackEmailClick, trackChatStart, trackDemo } from '../utils/analytics';

// Default configuration
const defaultConfig = {
  header: {
    title: 'Get in Touch',
    subtitle: 'Ready to modernize your gas cylinder management? We\'re here to help you get started and answer any questions you have.'
  },
  contactMethods: [
    {
      title: 'Sales Inquiries',
      icon: 'SalesIcon',
      contact: '+1 (555) 123-4567',
      email: 'sales@gascylinder.app',
      hours: 'Mon-Fri 8AM-6PM PST',
      description: 'Questions about pricing, demos, or getting started',
      enabled: true
    },
    {
      title: 'Technical Support',
      icon: 'SupportIcon',
      contact: '+1 (555) 987-6543',
      email: 'support@gascylinder.app',
      hours: 'Mon-Fri 6AM-8PM PST',
      description: 'Help with setup, troubleshooting, or technical issues',
      enabled: true
    },
    {
      title: 'Live Chat',
      icon: 'ChatIcon',
      contact: 'Available on website',
      email: 'chat@gascylinder.app',
      hours: 'Mon-Fri 8AM-5PM PST',
      description: 'Quick questions and immediate assistance',
      enabled: true
    }
  ],
  companyInfo: {
    name: 'Gas Cylinder Management',
    address: {
      street: '123 Innovation Drive',
      city: 'Tech Valley, CA 94025'
    },
    businessHours: {
      weekdays: 'Monday - Friday: 8AM - 6PM PST',
      saturday: 'Saturday: 9AM - 2PM PST',
      sunday: 'Sunday: Closed'
    }
  },
  form: {
    enabled: true,
    title: 'Send us a Message',
    requiredFields: ['firstName', 'lastName', 'email', 'company', 'inquiryType'],
    companySizeOptions: [
      '1-10 employees',
      '11-50 employees', 
      '51-200 employees',
      '201-500 employees',
      '500+ employees'
    ],
    currentSolutionOptions: [
      'Legacy Systems',
      'TIMS Software',
      'Excel/Manual',
      'Custom Solution',
      'No Current Solution',
      'Other'
    ],
    inquiryTypeOptions: [
      'Request Demo',
      'Pricing Information',
      'Migration from Current System',
      'Feature Questions',
      'Technical Support',
      'Partnership Inquiry',
      'Other'
    ],
    timeframeOptions: [
      'Immediate (within 1 month)',
      'This Quarter (1-3 months)',
      'Next 6 months',
      'Within a year',
      'Just exploring'
    ],
    budgetOptions: [
      'Under $1,000/month',
      '$1,000 - $5,000/month',
      '$5,000 - $10,000/month',
      '$10,000 - $25,000/month',
      '$25,000+/month',
      'Not sure yet'
    ]
  },
  successMessage: {
    title: 'Thank You for Your Interest!',
    message: 'We\'ve received your inquiry and will get back to you within 24 hours. If you requested a demo, we\'ll send you a calendar link to schedule at your convenience.',
    buttonText: 'Back to Home'
  },
  footerMessage: 'By submitting this form, you agree to our Privacy Policy and Terms of Service. We\'ll respond within 24 hours.'
};

// Icon mapping
const iconMap = {
  SalesIcon: SalesIcon,
  SupportIcon: SupportIcon,
  ChatIcon: ChatIcon,
  BusinessIcon: BusinessIcon,
  PhoneIcon: PhoneIcon,
  EmailIcon: EmailIcon
};

export default function ContactUs() {
  const navigate = useNavigate();
  const [contactConfig, setContactConfig] = useState(defaultConfig);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    jobTitle: '',
    companySize: '',
    currentSolution: '',
    inquiryType: '',
    timeframe: '',
    budget: '',
    message: '',
    newsletter: false,
    demo: false
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load configuration from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('contactConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setContactConfig(parsedConfig);
      } catch (error) {
        logger.error('Error parsing contact config:', error);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Track form submission
    trackContactForm(formData.inquiryType || 'general');
    
    // Track demo request if selected
    if (formData.demo) {
      trackDemo('contact_form');
    }
    
    // Simulate form submission
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 1000);
  };

  const handlePhoneClick = (number) => {
    trackPhoneCall(number);
  };

  const handleEmailClick = (email) => {
    trackEmailClick(email);
  };

  const handleChatClick = () => {
    trackChatStart();
  };

  // Filter enabled contact methods
  const enabledContactMethods = contactConfig.contactMethods.filter(method => method.enabled);

  if (submitted) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Card sx={{ 
          p: 6, 
          textAlign: 'center',
          border: '2px solid #000000',
          borderRadius: '8px'
        }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 3, color: '#000000' }}>
            {contactConfig.successMessage.title}
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.6, color: '#374151' }}>
            {contactConfig.successMessage.message}
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => window.location.href = '/'}
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
            {contactConfig.successMessage.buttonText}
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#FFFFFF', minHeight: '100vh', py: 8 }}>
      <Container maxWidth="lg">
        {/* Navigation */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{ 
                bgcolor: 'white', 
                boxShadow: 1,
                '&:hover': { bgcolor: 'grey.100' }
              }}
              aria-label="Go back"
            >
              <ArrowBackIcon />
            </IconButton>
            <Breadcrumbs aria-label="breadcrumb">
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/')}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  textDecoration: 'none',
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Home
              </Link>
              <Typography color="text.primary">Contact</Typography>
            </Breadcrumbs>
          </Stack>
        </Box>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight={700} sx={{ mb: 3, color: '#000000' }}>
            {contactConfig.header.title}
          </Typography>
          <Typography variant="h6" sx={{ width: '100%', color: '#6B7280' }}>
            {contactConfig.header.subtitle}
          </Typography>
        </Box>

        <Grid container spacing={6}>
          {/* Contact Methods */}
          <Grid item xs={12} md={4}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 4, color: '#000000' }}>
              Contact Methods
            </Typography>

            <Stack spacing={3}>
              {enabledContactMethods.map((method, index) => {
                const IconComponent = iconMap[method.icon] || BusinessIcon;
                return (
                  <Card key={index} sx={{ 
                    p: 3, 
                    border: '2px solid #000000',
                    borderRadius: '8px'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <IconComponent sx={{ fontSize: 40, color: '#000000' }} />
                      <Typography variant="h6" fontWeight={700} sx={{ ml: 2, color: '#000000' }}>
                        {method.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2, color: '#6B7280' }}>
                      {method.description}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#000000' }}>
                      <a 
                        href={`tel:${method.contact}`} 
                        onClick={() => handlePhoneClick(method.contact)}
                        style={{ textDecoration: 'none', color: '#000000' }}
                      >
                        📞 {method.contact}
                      </a>
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#000000' }}>
                      <a 
                        href={`mailto:${method.email}`}
                        onClick={() => handleEmailClick(method.email)}
                        style={{ textDecoration: 'none', color: '#000000' }}
                      >
                        ✉️ {method.email}
                      </a>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6B7280' }}>
                      🕒 {method.hours}
                    </Typography>
                  </Card>
                );
              })}
            </Stack>

            {/* Company Information */}
            <Card sx={{ 
              p: 3, 
              mt: 4, 
              border: '2px solid #000000',
              borderRadius: '8px'
            }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#000000' }}>
                Company Information
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationIcon sx={{ mr: 2, color: '#000000' }} />
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#000000' }}>
                    {contactConfig.companyInfo.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    {contactConfig.companyInfo.address.street}<br />
                    {contactConfig.companyInfo.address.city}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 2, color: '#000000' }} />
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#000000' }}>
                    Business Hours
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    {contactConfig.companyInfo.businessHours.weekdays}<br />
                    {contactConfig.companyInfo.businessHours.saturday}<br />
                    {contactConfig.companyInfo.businessHours.sunday}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Contact Form */}
          {contactConfig.form.enabled && (
            <Grid item xs={12} md={8}>
              <Card sx={{ 
                p: 4,
                border: '2px solid #000000',
                borderRadius: '8px'
              }}>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 4, color: '#000000' }}>
                  {contactConfig.form.title}
                </Typography>
                
                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    {/* Basic Information */}
                    <Grid item xs={12}>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#000000' }}>
                        Contact Information
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required={contactConfig.form.requiredFields.includes('firstName')}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required={contactConfig.form.requiredFields.includes('lastName')}
                      />
                    </Grid>
                
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Work Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required={contactConfig.form.requiredFields.includes('email')}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </Grid>

                    {/* Company Information */}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        Company Details
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Company Name"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        required={contactConfig.form.requiredFields.includes('company')}
                      />
                    </Grid>
                
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Job Title"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleChange}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Company Size</InputLabel>
                        <Select
                          name="companySize"
                          value={formData.companySize}
                          onChange={handleChange}
                          label="Company Size"
                        >
                          {contactConfig.form.companySizeOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Current Solution</InputLabel>
                        <Select
                          name="currentSolution"
                          value={formData.currentSolution}
                          onChange={handleChange}
                          label="Current Solution"
                        >
                          {contactConfig.form.currentSolutionOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Inquiry Details */}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2, borderColor: '#E5E7EB' }} />
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#000000' }}>
                        Inquiry Details
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Inquiry Type</InputLabel>
                        <Select
                          name="inquiryType"
                          value={formData.inquiryType}
                          onChange={handleChange}
                          label="Inquiry Type"
                          required={contactConfig.form.requiredFields.includes('inquiryType')}
                        >
                          {contactConfig.form.inquiryTypeOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Implementation Timeframe</InputLabel>
                        <Select
                          name="timeframe"
                          value={formData.timeframe}
                          onChange={handleChange}
                          label="Implementation Timeframe"
                        >
                          {contactConfig.form.timeframeOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Budget Range (Optional)</InputLabel>
                        <Select
                          name="budget"
                          value={formData.budget}
                          onChange={handleChange}
                          label="Budget Range (Optional)"
                        >
                          {contactConfig.form.budgetOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your current challenges, requirements, or any specific questions you have..."
                      />
                    </Grid>

                    {/* Preferences */}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2, borderColor: '#E5E7EB' }} />
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#000000' }}>
                        Communication Preferences
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="demo"
                            checked={formData.demo}
                            onChange={handleChange}
                          />
                        }
                        label="I'd like to schedule a personalized demo"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="newsletter"
                            checked={formData.newsletter}
                            onChange={handleChange}
                          />
                        }
                        label="Subscribe to our newsletter for industry insights and product updates"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={loading}
                        sx={{
                          py: 2,
                          fontSize: '16px',
                          fontWeight: 600,
                          textTransform: 'none',
                          backgroundColor: '#000000',
                          color: '#FFFFFF',
                          border: '2px solid #000000',
                          '&:hover': {
                            backgroundColor: '#1F2937',
                            borderColor: '#1F2937'
                          },
                          '&:disabled': {
                            backgroundColor: '#9CA3AF',
                            borderColor: '#9CA3AF'
                          }
                        }}
                      >
                        {loading ? 'Sending...' : 'Send Message'}
                      </Button>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', color: '#6B7280' }}>
                        {contactConfig.footerMessage}
                      </Typography>
                    </Grid>
                  </Grid>
                </form>
              </Card>
            </Grid>
          )}
        </Grid>
      </Container>
      
      {/* Floating Back Button for Mobile */}
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 1000,
          display: { xs: 'block', md: 'none' }
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            bgcolor: 'white',
            boxShadow: 3,
            '&:hover': { bgcolor: 'grey.100' }
          }}
          aria-label="Go back"
        >
          <ArrowBackIcon />
        </IconButton>
      </Box>
    </Box>
  );
}