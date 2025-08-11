import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, TextField,
  Alert, CircularProgress, Snackbar, Divider, FormControl, InputLabel,
  Select, MenuItem, Stack, Accordion, AccordionSummary, AccordionDetails,
  Switch, FormControlLabel, IconButton, List, ListItem, ListItemText,
  ListItemSecondaryAction, Chip, Tabs, Tab
} from '@mui/material';
import {
  ContactSupport as ContactSupportIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Support as SupportIcon,
  BusinessCenter as SalesIcon,
  Chat as ChatIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function ContactManagement() {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [contactConfig, setContactConfig] = useState({
    // Header content
    header: {
      title: 'Get in Touch',
      subtitle: 'Ready to modernize your gas cylinder management? We\'re here to help you get started and answer any questions you have.'
    },
    
    // Contact methods
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
    
    // Company information
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
    
    // Form configuration
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
    
    // Success message
    successMessage: {
      title: 'Thank You for Your Interest!',
      message: 'We\'ve received your inquiry and will get back to you within 24 hours. If you requested a demo, we\'ll send you a calendar link to schedule at your convenience.',
      buttonText: 'Back to Home'
    },
    
    // Footer message
    footerMessage: 'By submitting this form, you agree to our Privacy Policy and Terms of Service. We\'ll respond within 24 hours.'
  });

  const [contactChanged, setContactChanged] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    // Load existing contact config from localStorage
    const savedContactConfig = localStorage.getItem('contactConfig');
    if (savedContactConfig) {
      setContactConfig(JSON.parse(savedContactConfig));
    }
  }, []);

  const handleConfigChange = (section, field, value) => {
    const updated = { 
      ...contactConfig, 
      [section]: { 
        ...contactConfig[section], 
        [field]: value 
      } 
    };
    setContactConfig(updated);
    setContactChanged(true);
  };

  const handleNestedConfigChange = (section, subsection, field, value) => {
    const updated = { 
      ...contactConfig, 
      [section]: { 
        ...contactConfig[section], 
        [subsection]: { 
          ...contactConfig[section][subsection], 
          [field]: value 
        } 
      } 
    };
    setContactConfig(updated);
    setContactChanged(true);
  };

  const handleContactMethodChange = (index, field, value) => {
    const updatedMethods = [...contactConfig.contactMethods];
    updatedMethods[index] = { ...updatedMethods[index], [field]: value };
    
    const updated = { 
      ...contactConfig, 
      contactMethods: updatedMethods 
    };
    setContactConfig(updated);
    setContactChanged(true);
  };

  const addContactMethod = () => {
    const newMethod = {
      title: 'New Contact Method',
      icon: 'BusinessIcon',
      contact: '+1 (555) 000-0000',
      email: 'new@gascylinder.app',
      hours: 'Mon-Fri 9AM-5PM PST',
      description: 'Description for new contact method',
      enabled: true
    };
    
    const updated = { 
      ...contactConfig, 
      contactMethods: [...contactConfig.contactMethods, newMethod] 
    };
    setContactConfig(updated);
    setContactChanged(true);
  };

  const removeContactMethod = (index) => {
    const updatedMethods = contactConfig.contactMethods.filter((_, i) => i !== index);
    const updated = { ...contactConfig, contactMethods: updatedMethods };
    setContactConfig(updated);
    setContactChanged(true);
  };

  const handleFormOptionChange = (field, value) => {
    const updated = { 
      ...contactConfig, 
      form: { 
        ...contactConfig.form, 
        [field]: value 
      } 
    };
    setContactConfig(updated);
    setContactChanged(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('contactConfig', JSON.stringify(contactConfig));
      
      // In production, you might also save to database
      // await supabase.from('organization_settings').upsert({
      //   organization_id: profile.organization_id,
      //   contact_config: contactConfig
      // });

      setContactChanged(false);
      setSnackbar({ open: true, message: 'Contact page configuration saved successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error saving contact config:', error);
      setSnackbar({ open: true, message: 'Error saving contact configuration', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const renderHeaderEditor = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Page Header
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Page Title"
              value={contactConfig.header.title}
              onChange={(e) => handleConfigChange('header', 'title', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Page Subtitle"
              value={contactConfig.header.subtitle}
              onChange={(e) => handleConfigChange('header', 'subtitle', e.target.value)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderContactMethodsEditor = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Contact Methods</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={addContactMethod}
            variant="outlined"
            size="small"
          >
            Add Method
          </Button>
        </Box>
        
        <List>
          {contactConfig.contactMethods.map((method, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Typography variant="subtitle1">{method.title}</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={method.enabled}
                        onChange={(e) => handleContactMethodChange(index, 'enabled', e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                    label="Enabled"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Title"
                      value={method.title}
                      onChange={(e) => handleContactMethodChange(index, 'title', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Icon</InputLabel>
                      <Select
                        value={method.icon}
                        onChange={(e) => handleContactMethodChange(index, 'icon', e.target.value)}
                        label="Icon"
                      >
                        <MenuItem value="SalesIcon">Sales</MenuItem>
                        <MenuItem value="SupportIcon">Support</MenuItem>
                        <MenuItem value="ChatIcon">Chat</MenuItem>
                        <MenuItem value="BusinessIcon">Business</MenuItem>
                        <MenuItem value="PhoneIcon">Phone</MenuItem>
                        <MenuItem value="EmailIcon">Email</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={method.contact}
                      onChange={(e) => handleContactMethodChange(index, 'contact', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={method.email}
                      onChange={(e) => handleContactMethodChange(index, 'email', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Hours"
                      value={method.hours}
                      onChange={(e) => handleContactMethodChange(index, 'hours', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      value={method.description}
                      onChange={(e) => handleContactMethodChange(index, 'description', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      startIcon={<DeleteIcon />}
                      onClick={() => removeContactMethod(index)}
                      color="error"
                      variant="outlined"
                      size="small"
                    >
                      Remove Method
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  const renderCompanyInfoEditor = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Company Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Company Name"
              value={contactConfig.companyInfo.name}
              onChange={(e) => handleConfigChange('companyInfo', 'name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Street Address"
              value={contactConfig.companyInfo.address.street}
              onChange={(e) => handleNestedConfigChange('companyInfo', 'address', 'street', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City, State, ZIP"
              value={contactConfig.companyInfo.address.city}
              onChange={(e) => handleNestedConfigChange('companyInfo', 'address', 'city', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Weekdays Hours"
              value={contactConfig.companyInfo.businessHours.weekdays}
              onChange={(e) => handleNestedConfigChange('companyInfo', 'businessHours', 'weekdays', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Saturday Hours"
              value={contactConfig.companyInfo.businessHours.saturday}
              onChange={(e) => handleNestedConfigChange('companyInfo', 'businessHours', 'saturday', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Sunday Hours"
              value={contactConfig.companyInfo.businessHours.sunday}
              onChange={(e) => handleNestedConfigChange('companyInfo', 'businessHours', 'sunday', e.target.value)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderFormEditor = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Contact Form</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={contactConfig.form.enabled}
                onChange={(e) => handleConfigChange('form', 'enabled', e.target.checked)}
              />
            }
            label="Enable Form"
          />
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Form Title"
              value={contactConfig.form.title}
              onChange={(e) => handleConfigChange('form', 'title', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Form Options
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Company Size Options</InputLabel>
              <Select
                multiple
                value={contactConfig.form.companySizeOptions}
                onChange={(e) => handleFormOptionChange('companySizeOptions', e.target.value)}
                label="Company Size Options"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {contactConfig.form.companySizeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Current Solution Options</InputLabel>
              <Select
                multiple
                value={contactConfig.form.currentSolutionOptions}
                onChange={(e) => handleFormOptionChange('currentSolutionOptions', e.target.value)}
                label="Current Solution Options"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {contactConfig.form.currentSolutionOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Inquiry Type Options</InputLabel>
              <Select
                multiple
                value={contactConfig.form.inquiryTypeOptions}
                onChange={(e) => handleFormOptionChange('inquiryTypeOptions', e.target.value)}
                label="Inquiry Type Options"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {contactConfig.form.inquiryTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Timeframe Options</InputLabel>
              <Select
                multiple
                value={contactConfig.form.timeframeOptions}
                onChange={(e) => handleFormOptionChange('timeframeOptions', e.target.value)}
                label="Timeframe Options"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {contactConfig.form.timeframeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Budget Options</InputLabel>
              <Select
                multiple
                value={contactConfig.form.budgetOptions}
                onChange={(e) => handleFormOptionChange('budgetOptions', e.target.value)}
                label="Budget Options"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {contactConfig.form.budgetOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderMessagesEditor = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Messages
        </Typography>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Success Message</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Success Title"
                  value={contactConfig.successMessage.title}
                  onChange={(e) => handleConfigChange('successMessage', 'title', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Success Message"
                  value={contactConfig.successMessage.message}
                  onChange={(e) => handleConfigChange('successMessage', 'message', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Button Text"
                  value={contactConfig.successMessage.buttonText}
                  onChange={(e) => handleConfigChange('successMessage', 'buttonText', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Footer Message</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Footer Message"
              value={contactConfig.footerMessage}
              onChange={(e) => handleConfigChange('footerMessage', '', e.target.value)}
            />
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );

  const tabs = [
    { label: 'Header', icon: <ContactSupportIcon />, content: renderHeaderEditor() },
    { label: 'Contact Methods', icon: <PhoneIcon />, content: renderContactMethodsEditor() },
    { label: 'Company Info', icon: <BusinessIcon />, content: renderCompanyInfoEditor() },
    { label: 'Form', icon: <EditIcon />, content: renderFormEditor() },
    { label: 'Messages', icon: <EmailIcon />, content: renderMessagesEditor() }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Contact Page Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={loading || !contactChanged}
        >
          {loading ? <CircularProgress size={20} /> : 'Save Changes'}
        </Button>
      </Box>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Configure all aspects of your contact page including headers, contact methods, company information, form fields, and messaging.
        </Typography>
      </Alert>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab.label} icon={tab.icon} />
        ))}
      </Tabs>

      {tabs[activeTab].content}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 