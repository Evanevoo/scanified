import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
  Chip
} from '@mui/material';
import {
  Rocket as RocketIcon,
  Phone as PhoneIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function CTABanner({ 
  title = "Ready to Transform Your Asset Management?",
  subtitle = "Join thousands of businesses already using Scanified",
  primaryAction = "Start Free Trial",
  secondaryAction = "Schedule Demo",
  showBadges = true,
  variant = "gradient" // gradient, simple, urgent
}) {
  const navigate = useNavigate();

  const getBannerStyles = () => {
    switch (variant) {
      case 'urgent':
        return {
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: 'white'
        };
      case 'simple':
        return {
          bgcolor: 'grey.50',
          color: 'text.primary'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
          color: 'white'
        };
    }
  };

  const getButtonStyles = (isPrimary) => {
    if (variant === 'simple') {
      return isPrimary 
        ? { variant: 'contained' }
        : { variant: 'outlined' };
    }
    
    return isPrimary 
      ? { 
          variant: 'contained',
          sx: { 
            bgcolor: 'white',
            color: variant === 'urgent' ? '#EF4444' : '#3B82F6',
            '&:hover': { bgcolor: '#f8fafc' }
          }
        }
      : { 
          variant: 'outlined',
          sx: { 
            borderColor: 'white',
            color: 'white',
            '&:hover': { 
              borderColor: 'white',
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }
        };
  };

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Paper 
          elevation={0}
          sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            ...getBannerStyles()
          }}
        >
          {/* Background decoration */}
          {variant === 'gradient' && (
            <>
              <Box sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                zIndex: 0
              }} />
              <Box sx={{
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 150,
                height: 150,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                zIndex: 0
              }} />
            </>
          )}

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {showBadges && (
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                <Chip 
                  icon={<RocketIcon />}
                  label="7-Day Free Trial" 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: variant === 'simple' ? 'primary.main' : 'white',
                    fontWeight: 600
                  }} 
                />
                <Chip 
                  label="No Credit Card Required" 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: variant === 'simple' ? 'primary.main' : 'white',
                    fontWeight: 600
                  }} 
                />
                <Chip 
                  label="Setup in Minutes" 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: variant === 'simple' ? 'primary.main' : 'white',
                    fontWeight: 600
                  }} 
                />
              </Stack>
            )}

            <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
              {title}
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 4, 
                opacity: variant === 'simple' ? 0.8 : 0.9,
                maxWidth: 600,
                mx: 'auto'
              }}
            >
              {subtitle}
            </Typography>

            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3} 
              justifyContent="center"
              sx={{ mb: 4 }}
            >
              <Button
                {...getButtonStyles(true)}
                size="large"
                startIcon={<RocketIcon />}
                onClick={() => navigate('/register')}
                sx={{ 
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  ...getButtonStyles(true).sx
                }}
              >
                {primaryAction}
              </Button>
              <Button
                {...getButtonStyles(false)}
                size="large"
                startIcon={<PhoneIcon />}
                onClick={() => navigate('/demo')}
                sx={{ 
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  ...getButtonStyles(false).sx
                }}
              >
                {secondaryAction}
              </Button>
            </Stack>

            <Stack 
              direction="row" 
              spacing={4} 
              justifyContent="center" 
              alignItems="center"
              sx={{ opacity: variant === 'simple' ? 0.8 : 0.7 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ChatIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2">
                  24/7 Live Support
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2">
                  1-800-SCANIFY
                </Typography>
              </Box>
              <Typography variant="body2">
                ⭐ 4.9/5 Customer Rating
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}