import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, TextField,
  Alert, CircularProgress, Snackbar, Divider, FormControl, InputLabel,
  Select, MenuItem, Stack
} from '@mui/material';
import {
  ContactSupport as ContactSupportIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function ContactManagement() {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [loading, setLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: '',
    address: '',
    businessName: '',
    businessHours: {
      monday: '9:00 AM - 5:00 PM',
      tuesday: '9:00 AM - 5:00 PM',
      wednesday: '9:00 AM - 5:00 PM',
      thursday: '9:00 AM - 5:00 PM',
      friday: '9:00 AM - 5:00 PM',
      saturday: 'Closed',
      sunday: 'Closed'
    }
  });
  const [contactChanged, setContactChanged] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    // Load existing contact info from localStorage
    const savedContactInfo = localStorage.getItem('contactInfo');
    if (savedContactInfo) {
      setContactInfo(JSON.parse(savedContactInfo));
    }
  }, []);

  const handleContactChange = (key, value) => {
    const updated = { ...contactInfo, [key]: value };
    setContactInfo(updated);
    setContactChanged(true);
  };

  const handleBusinessHoursChange = (day, value) => {
    const updated = { 
      ...contactInfo, 
      businessHours: { 
        ...contactInfo.businessHours, 
        [day]: value 
      } 
    };
    setContactInfo(updated);
    setContactChanged(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('contactInfo', JSON.stringify(contactInfo));
      
      // In production, you might also save to database
      // await supabase.from('organization_settings').upsert({
      //   organization_id: profile.organization_id,
      //   contact_info: contactInfo
      // });

      setContactChanged(false);
      setSnackbar({ open: true, message: 'Contact information saved successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error saving contact info:', error);
      setSnackbar({ open: true, message: 'Error saving contact information', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Contact Information Management
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Manage your organization's contact information that will be displayed to customers and potential clients. 
          This information appears on your public contact page and is used for customer inquiries.
        </Typography>
      </Alert>

      <Stack spacing={3}>
        {/* Header with Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Organization Contact Details
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!contactChanged || loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Basic Contact Info */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ContactSupportIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Basic Information
                  </Typography>
                </Box>
                
                                      <TextField
                        fullWidth
                        label="Business Name"
                        value={contactInfo.businessName}
                        onChange={(e) => handleContactChange('businessName', e.target.value)}
                        sx={{ mb: 2 }}
                        helperText="Your business name as it appears to customers"
                      />
                      
                      <TextField
                        fullWidth
                        label="Contact Email"
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => handleContactChange('email', e.target.value)}
                        sx={{ mb: 2 }}
                        helperText="Primary contact email for customers and inquiries"
                        InputProps={{
                          startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={contactInfo.phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Business phone number for customer support"
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Business Address"
                  multiline
                  rows={3}
                  value={contactInfo.address}
                  onChange={(e) => handleContactChange('address', e.target.value)}
                  helperText="Full business address for customers"
                  InputProps={{
                    startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary', alignSelf: 'flex-start', mt: 1 }} />
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Business Hours */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Business Hours
                  </Typography>
                </Box>
                
                {Object.entries(contactInfo.businessHours).map(([day, hours]) => (
                  <Box key={day} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 80, textTransform: 'capitalize', fontWeight: 500 }}>
                      {day}:
                    </Typography>
                    <TextField
                      size="small"
                      value={hours}
                      onChange={(e) => handleBusinessHoursChange(day, e.target.value)}
                      sx={{ flexGrow: 1 }}
                      placeholder="e.g., 9:00 AM - 6:00 PM"
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Preview */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preview - How Customers Will See Your Contact Info
                </Typography>
                <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Contact Information
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Business:
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          {contactInfo.businessName}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Email:
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          {contactInfo.email}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Phone:
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          {contactInfo.phone}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Address:
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          {contactInfo.address}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Business Hours
                      </Typography>
                      {Object.entries(contactInfo.businessHours).map(([day, hours]) => (
                        <Box key={day} sx={{ display: 'flex', mb: 1 }}>
                          <Typography variant="body2" sx={{ minWidth: 80, textTransform: 'capitalize', fontWeight: 500 }}>
                            {day}:
                          </Typography>
                          <Typography variant="body2">
                            {hours}
                          </Typography>
                        </Box>
                      ))}
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  <Grid item>
                    <Button
                      variant="outlined"
                      onClick={() => window.open('/contact', '_blank')}
                    >
                      View Public Contact Page
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        const mailtoLink = `mailto:${contactInfo.email}?subject=Inquiry about Gas Cylinder Management`;
                        window.open(mailtoLink);
                      }}
                    >
                      Test Email Link
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        const telLink = `tel:${contactInfo.phone}`;
                        window.open(telLink);
                      }}
                    >
                      Test Phone Link
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 