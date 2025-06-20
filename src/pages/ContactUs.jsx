import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button, 
  Alert, CircularProgress, Divider, Link
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';

function ContactUs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });

  // This would typically come from organization settings or environment variables
  const contactInfo = {
    email: 'contact@lessannoyingscan.com', // Owner can configure this
    phone: '+1 (555) 123-4567', // Owner can configure this
    address: '123 Business St, Suite 100, City, State 12345' // Owner can configure this
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Here you would typically send the contact form data to your backend
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: ''
      });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('Failed to send message. Please try again or contact us directly.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 2
    }}>
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Back to Home Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              sx={{ 
                color: 'text.secondary',
                '&:hover': { 
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.primary'
                }
              }}
            >
              Back to Home
            </Button>
          </Box>

          <Typography variant="h4" align="center" gutterBottom>
            Contact Us
          </Typography>
          
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Get in touch with us for support, questions, or to learn more about our gas cylinder management solution.
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Thank you for your message! We'll get back to you soon.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
            {/* Contact Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <Typography variant="h6" gutterBottom>
                Send us a message
              </Typography>
              
              <TextField
                fullWidth
                label="Your Name"
                value={formData.name}
                onChange={handleChange('name')}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Company Name"
                value={formData.company}
                onChange={handleChange('company')}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Subject"
                value={formData.subject}
                onChange={handleChange('subject')}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Message"
                multiline
                rows={4}
                value={formData.message}
                onChange={handleChange('message')}
                required
                sx={{ mb: 3 }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                endIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Send Message
              </Button>
            </Box>

            {/* Contact Information */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Link href={`mailto:${contactInfo.email}`} sx={{ textDecoration: 'none' }}>
                      {contactInfo.email}
                    </Link>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Link href={`tel:${contactInfo.phone}`} sx={{ textDecoration: 'none' }}>
                      {contactInfo.phone}
                    </Link>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <LocationOnIcon sx={{ mr: 2, color: 'primary.main', mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body2">
                      {contactInfo.address}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Business Hours
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Monday - Friday: 9:00 AM - 6:00 PM EST
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Saturday: 10:00 AM - 2:00 PM EST
              </Typography>
              <Typography variant="body2">
                Sunday: Closed
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ContactUs; 