import React, { useState } from 'react';
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
  Chip
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Support as SupportIcon,
  BusinessCenter as SalesIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { trackContactForm, trackPhoneCall, trackEmailClick, trackChatStart, trackDemo } from '../utils/analytics';

export default function ContactUs() {
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

  const contactMethods = [
    {
      title: 'Sales Inquiries',
      icon: <SalesIcon sx={{ fontSize: 40, color: '#3B82F6' }} />,
      contact: '+1 (555) 123-4567',
      email: 'sales@gascylinder.app',
      hours: 'Mon-Fri 8AM-6PM PST',
      description: 'Questions about pricing, demos, or getting started'
    },
    {
      title: 'Technical Support',
      icon: <SupportIcon sx={{ fontSize: 40, color: '#10B981' }} />,
      contact: '+1 (555) 987-6543',
      email: 'support@gascylinder.app',
      hours: 'Mon-Fri 6AM-8PM PST',
      description: 'Help with setup, troubleshooting, or technical issues'
    },
    {
      title: 'Live Chat',
      icon: <ChatIcon sx={{ fontSize: 40, color: '#F59E0B' }} />,
      contact: 'Available on website',
      email: 'chat@gascylinder.app',
      hours: 'Mon-Fri 8AM-5PM PST',
      description: 'Quick questions and immediate assistance'
    }
  ];

  if (submitted) {
  return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 3, color: '#10B981' }}>
            Thank You for Your Interest!
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.6 }}>
            We've received your inquiry and will get back to you within 24 hours. 
            If you requested a demo, we'll send you a calendar link to schedule at your convenience.
          </Typography>
            <Button
            variant="contained"
            size="large"
            onClick={() => window.location.href = '/'}
            sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Back to Home
            </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 8 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
            Get in Touch
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Ready to modernize your gas cylinder management? We're here to help you 
            get started and answer any questions you have.
          </Typography>
        </Box>

        <Grid container spacing={6}>
          {/* Contact Methods */}
          <Grid item xs={12} md={4}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
              Contact Methods
          </Typography>

            <Stack spacing={3}>
              {contactMethods.map((method, index) => (
                <Card key={index} sx={{ p: 3, border: '1px solid #e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {method.icon}
                    <Typography variant="h6" fontWeight={600} sx={{ ml: 2 }}>
                      {method.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {method.description}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    <a 
                      href={`tel:${method.contact}`} 
                      onClick={() => handlePhoneClick(method.contact)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      📞 {method.contact}
                    </a>
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    <a 
                      href={`mailto:${method.email}`}
                      onClick={() => handleEmailClick(method.email)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      ✉️ {method.email}
                    </a>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    🕒 {method.hours}
                  </Typography>
                </Card>
              ))}
            </Stack>

            {/* Company Information */}
            <Card sx={{ p: 3, mt: 4, border: '1px solid #e2e8f0' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Company Information
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationIcon sx={{ mr: 2, color: '#3B82F6' }} />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Headquarters
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    123 Innovation Drive<br />
                    Tech Valley, CA 94025
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 2, color: '#10B981' }} />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Business Hours
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monday - Friday: 8AM - 6PM PST<br />
                    Saturday: 9AM - 2PM PST
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

            {/* Contact Form */}
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
                Send us a Message
              </Typography>
              
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  {/* Basic Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
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
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                required
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
                required
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
                      required
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
                        <MenuItem value="1-10">1-10 employees</MenuItem>
                        <MenuItem value="11-50">11-50 employees</MenuItem>
                        <MenuItem value="51-200">51-200 employees</MenuItem>
                        <MenuItem value="201-500">201-500 employees</MenuItem>
                        <MenuItem value="500+">500+ employees</MenuItem>
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
                        <MenuItem value="trackabout">TrackAbout</MenuItem>
                        <MenuItem value="tims">TIMS Software</MenuItem>
                        <MenuItem value="excel">Excel/Manual</MenuItem>
                        <MenuItem value="custom">Custom Solution</MenuItem>
                        <MenuItem value="none">No Current Solution</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Inquiry Details */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
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
                required
                      >
                        <MenuItem value="demo">Request Demo</MenuItem>
                        <MenuItem value="pricing">Pricing Information</MenuItem>
                        <MenuItem value="migration">Migration from Current System</MenuItem>
                        <MenuItem value="features">Feature Questions</MenuItem>
                        <MenuItem value="support">Technical Support</MenuItem>
                        <MenuItem value="partnership">Partnership Inquiry</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
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
                        <MenuItem value="immediate">Immediate (within 1 month)</MenuItem>
                        <MenuItem value="quarter">This Quarter (1-3 months)</MenuItem>
                        <MenuItem value="half-year">Next 6 months</MenuItem>
                        <MenuItem value="year">Within a year</MenuItem>
                        <MenuItem value="exploring">Just exploring</MenuItem>
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
                        <MenuItem value="under-1k">Under $1,000/month</MenuItem>
                        <MenuItem value="1k-5k">$1,000 - $5,000/month</MenuItem>
                        <MenuItem value="5k-10k">$5,000 - $10,000/month</MenuItem>
                        <MenuItem value="10k-25k">$10,000 - $25,000/month</MenuItem>
                        <MenuItem value="25k+">$25,000+/month</MenuItem>
                        <MenuItem value="not-sure">Not sure yet</MenuItem>
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
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
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
                        textTransform: 'none'
                      }}
                    >
                      {loading ? 'Sending...' : 'Send Message'}
              </Button>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                      By submitting this form, you agree to our Privacy Policy and Terms of Service.
                      We'll respond within 24 hours.
                    </Typography>
                  </Grid>
                </Grid>
              </form>
      </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}