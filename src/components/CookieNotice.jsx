import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Divider,
  Stack,
  Link,
  Slide,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function CookieNotice() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false
  });

  // Check if user has already made a choice
  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 2000);
    } else {
      // Load saved preferences
      const savedPreferences = JSON.parse(cookieConsent);
      setPreferences(savedPreferences);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    setPreferences(allAccepted);
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    setShowBanner(false);
    initializeServices(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    };
    setPreferences(onlyNecessary);
    localStorage.setItem('cookieConsent', JSON.stringify(onlyNecessary));
    setShowBanner(false);
    initializeServices(onlyNecessary);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    setShowBanner(false);
    setShowSettings(false);
    initializeServices(preferences);
  };

  const handlePreferenceChange = (category) => (event) => {
    if (category === 'necessary') return; // Can't disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [category]: event.target.checked
    }));
  };

  const initializeServices = (prefs) => {
    // Initialize analytics if accepted
    if (prefs.analytics && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }

    // Initialize marketing cookies if accepted
    if (prefs.marketing && window.fbq) {
      window.fbq('consent', 'grant');
    }

    // Initialize functional cookies if accepted
    if (prefs.functional) {
      // Enable chat widgets, etc.
    }
  };

  const cookieCategories = [
    {
      id: 'necessary',
      title: 'Necessary Cookies',
      description: 'These cookies are essential for the website to function properly. They enable core functionality such as security, network management, and accessibility.',
      required: true,
      examples: 'Authentication, security, load balancing'
    },
    {
      id: 'analytics',
      title: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.',
      required: false,
      examples: 'Google Analytics, page views, user behavior'
    },
    {
      id: 'marketing',
      title: 'Marketing Cookies',
      description: 'These cookies are used to track visitors across websites to display relevant advertisements and measure campaign effectiveness.',
      required: false,
      examples: 'Facebook Pixel, LinkedIn Insight, ad targeting'
    },
    {
      id: 'functional',
      title: 'Functional Cookies',
      description: 'These cookies enable enhanced functionality and personalization, such as live chat and social media features.',
      required: false,
      examples: 'Live chat, social media widgets, preferences'
    }
  ];

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          p: 3
        }}
      >
        <Box sx={{ maxWidth: 'lg', mx: 'auto' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                🍪 We use cookies
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We use cookies to enhance your browsing experience, serve personalized content, 
                and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.{' '}
                <Link href="/privacy-policy" target="_blank" underline="hover">
                  Learn more in our Privacy Policy
                </Link>
              </Typography>
            </Box>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 'fit-content' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowSettings(true)}
                startIcon={<SettingsIcon />}
                sx={{ textTransform: 'none' }}
              >
                Cookie Settings
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRejectAll}
                sx={{ textTransform: 'none' }}
              >
                Reject All
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleAcceptAll}
                sx={{ textTransform: 'none' }}
              >
                Accept All
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Cookie Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        TransitionComponent={Transition}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 1 }} />
            Cookie Preferences
          </Box>
          <IconButton onClick={() => setShowSettings(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            We use different types of cookies to optimize your experience on our website. 
            You can choose which categories you'd like to allow.
          </Typography>

          <Stack spacing={3}>
            {cookieCategories.map((category) => (
              <Box key={category.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {category.title}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences[category.id]}
                        onChange={handlePreferenceChange(category.id)}
                        disabled={category.required}
                      />
                    }
                    label={category.required ? 'Required' : 'Optional'}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {category.description}
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  <strong>Examples:</strong> {category.examples}
                </Typography>
                
                {category.id !== 'functional' && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </Stack>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note:</strong> Disabling certain cookies may impact your experience on our website. 
              Necessary cookies cannot be disabled as they are essential for the website to function properly.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowSettings(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleRejectAll} variant="outlined" sx={{ textTransform: 'none' }}>
            Reject All
          </Button>
          <Button onClick={handleSavePreferences} variant="contained" sx={{ textTransform: 'none' }}>
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 