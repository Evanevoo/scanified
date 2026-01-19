import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, Stack, Divider, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import LocalShipping from '@mui/icons-material/LocalShipping';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';
import AnimatedSection from '../components/AnimatedSection';
import BackgroundParallax from '../components/BackgroundParallax';
import ThreeVisionPanel from '../components/ThreeVisionPanel';
import StatCard from '../components/design-system/StatCard';
import ModernButton from '../components/design-system/ModernButton';
import { Touch3D, Card3D, MobileButton, MobileTypography, MobileStack } from '../components/design-system';
import { useMediaQuery, useTheme } from '@mui/material';

export default function LandingPage() {
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const features = [
    {
      icon: <QrCodeScannerIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Barcode Scanning',
      description: `Scan ${assetConfig.assetTypePlural} instantly with any smartphone. No expensive hardware needed.`,
    },
    {
      icon: <PhoneIphoneIcon sx={{ fontSize: 48, color: '#10B981' }} />,
      title: 'Mobile-First',
      description: 'Built for field work. Access everything from your phone or tablet, anywhere.',
    },
    {
      icon: <CloudSyncIcon sx={{ fontSize: 48, color: '#F59E0B' }} />,
      title: 'Real-Time Sync',
      description: 'Instant updates across all devices. Your team always has the latest information.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 48, color: '#8B5CF6' }} />,
      title: 'Quick Setup',
      description: 'Get started in minutes, not months. Simple onboarding process.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 48, color: '#EF4444' }} />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee.',
    },
    {
      icon: <CheckCircleIcon sx={{ fontSize: 48, color: '#84CC16' }} />,
      title: 'Easy to Use',
      description: 'Intuitive interface that your team will love. No training required.',
    },
  ];

  const stats = [
    {
      label: `Faster ${assetConfig.assetTypePlural} audits`,
      value: '5x',
      icon: <SpeedIcon />,
      color: 'primary.main',
    },
    {
      label: 'Reduction in lost assets',
      value: '40%',
      icon: <SecurityIcon />,
      color: '#10B981',
    },
    {
      label: 'Less admin time',
      value: '12h /wk',
      icon: <CloudSyncIcon />,
      color: '#F59E0B',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Hero Section - Upgraded */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #020617 0%, #0B1120 40%, #1D283A 100%)',
          backgroundColor: '#020617',
          color: 'white',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top left, rgba(64,181,173,0.2), transparent 55%), radial-gradient(circle at bottom right, rgba(72,201,176,0.15), transparent 55%)',
            opacity: 0.7,
            zIndex: 0,
          }}
        />
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.3 }}>
          <BackgroundParallax color1="#40B5AD" color2="#48C9B0" />
        </Box>
        <Box sx={{ position: 'absolute', right: { xs: 12, md: '10%' }, top: { xs: '40%', md: '30%' }, zIndex: 3, opacity: 0.6 }}>
          <ThreeVisionPanel />
        </Box>

        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            zIndex: 2,
            py: { xs: 10, md: 14 },
          }}
        >
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <AnimatedSection animation="fadeInUp">
                <Stack spacing={3}>
                  <Chip
                    label={organization?.name ? `Used by ${organization.name}` : 'Built for modern field operations'}
                    sx={{
                      alignSelf: { xs: 'center', md: 'flex-start' },
                      bgcolor: 'rgba(15,23,42,0.65)',
                      color: 'rgba(248,250,252,0.9)',
                      borderRadius: 999,
                      px: 1.5,
                      py: 0.5,
                      border: '1px solid rgba(148,163,184,0.5)',
                      backdropFilter: 'blur(12px)',
                      '& .MuiChip-label': { fontSize: 12, fontWeight: 600, letterSpacing: 0.3 },
                    }}
                  />

                  <MobileTypography
                    variant="h1"
                    sx={{
                      fontSize: { xs: '2rem', sm: '3.2rem', md: '3.8rem' },
                      lineHeight: { xs: 1.2, md: 1.15 },
                      textAlign: { xs: 'center', md: 'left' },
                      color: '#FFFFFF',
                      textShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)',
                      letterSpacing: { xs: '-0.02em', md: '-0.03em' },
                      fontWeight: 900,
                      mb: { xs: 2, md: 0 },
                    }}
                  >
                    Modern {assetConfig.assetTypePlural} tracking
                    {!isMobile && <br />}
                    {isMobile && ' '}
                    for serious operations.
                  </MobileTypography>

                  <MobileTypography
                    variant="h6"
                    sx={{
                      color: '#F3F4F6',
                      maxWidth: { xs: '100%', md: 560 },
                      textAlign: { xs: 'center', md: 'left' },
                      lineHeight: { xs: 1.6, md: 1.7 },
                      textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                      fontWeight: 500,
                      fontSize: { xs: '1rem', md: '1.25rem' },
                      px: { xs: 1, md: 0 },
                    }}
                  >
                    Replace spreadsheets and clipboards with a mobile-first platform that gives you
                    real-time visibility into every {assetConfig.assetTypeSingular ?? 'asset'} in the field,
                    from fill plant to customer site.
                  </MobileTypography>

                  <MobileStack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 2, sm: 2.5 }}
                    sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, pt: 1 }}
                  >
                    {isMobile ? (
                      <>
                        <MobileButton
                          variant="contained"
                          fullWidth
                          onClick={() => navigate('/create-organization')}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                        >
                          Start free 7‑day trial
                        </MobileButton>
                        <MobileButton
                          variant="outlined"
                          fullWidth
                          onClick={() => navigate('/login')}
                          sx={{
                            color: 'rgba(241,245,249,0.95)',
                            borderColor: 'rgba(148,163,184,0.8)',
                            bgcolor: 'rgba(15,23,42,0.6)',
                          }}
                        >
                          Sign in
                        </MobileButton>
                      </>
                    ) : (
                      <>
                        <ModernButton
                          showArrow
                          onClick={() => navigate('/create-organization')}
                        >
                          Start free 7‑day trial
                        </ModernButton>
                        <ModernButton
                          variant="outlined"
                          onClick={() => navigate('/login')}
                          sx={{
                            color: 'rgba(241,245,249,0.95)',
                            borderColor: 'rgba(148,163,184,0.8)',
                            bgcolor: 'rgba(15,23,42,0.6)',
                          }}
                        >
                          Sign in to existing account
                        </ModernButton>
                      </>
                    )}
                  </MobileStack>

                  <MobileTypography
                    variant="body2"
                    sx={{
                      color: '#D1D5DB',
                      pt: 1,
                      textAlign: { xs: 'center', md: 'left' },
                      fontWeight: 500,
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      display: { xs: 'flex', md: 'block' },
                      flexDirection: { xs: 'column', md: 'row' },
                      gap: { xs: 0.5, md: 0 },
                    }}
                  >
                    {isMobile ? (
                      <>
                        ✅ No credit card required<br />
                        ✅ Live onboarding support<br />
                        ✅ Cancel anytime
                      </>
                    ) : (
                      '✅ No credit card required • ✅ Live onboarding support • ✅ Cancel anytime'
                    )}
                  </MobileTypography>
                </Stack>
              </AnimatedSection>
            </Grid>

            <Grid item xs={12} md={5}>
              <AnimatedSection animation="fadeInUp" delay={0.15}>
                <Touch3D intensity="light">
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      bgcolor: 'rgba(15,23,42,0.85)',
                      border: '1px solid rgba(148,163,184,0.35)',
                      backdropFilter: 'blur(18px)',
                      boxShadow:
                        '0 20px 60px rgba(15,23,42,0.8), 0 0 0 1px rgba(148,163,184,0.3)',
                    }}
                  >
                  <Typography
                    variant="overline"
                    sx={{ color: '#D1D5DB', letterSpacing: 1.4, fontWeight: 600 }}
                  >
                    Operational snapshot
                  </Typography>

                  <Typography
                    variant="h5"
                    fontWeight={700}
                    sx={{ mt: 1, mb: 2, color: '#FFFFFF' }}
                  >
                    Every {assetConfig.assetTypeSingular ?? 'asset'} accounted for, in seconds.
                  </Typography>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <Typography
                        variant="body2"
                        sx={{ color: '#E5E7EB', mb: 1, fontWeight: 600 }}
                      >
                        Live status overview
                      </Typography>
                      <Stack spacing={1.2}>
                        <Chip
                          size="small"
                          label="On site"
                          sx={{
                            bgcolor: 'rgba(34,197,94,0.12)',
                            borderColor: 'rgba(34,197,94,0.55)',
                            color: '#BBF7D0',
                            borderRadius: 999,
                            border: '1px solid',
                            fontSize: 11,
                          }}
                        />
                        <Chip
                          size="small"
                          label="In transit"
                          sx={{
                            bgcolor: 'primary.light',
                            borderColor: 'primary.main',
                            opacity: 0.12,
                            color: 'primary.contrastText',
                            borderRadius: 999,
                            border: '1px solid',
                            fontSize: 11,
                          }}
                        />
                        <Chip
                          size="small"
                          label="Due for return"
                          sx={{
                            bgcolor: 'rgba(249,115,22,0.12)',
                            borderColor: 'rgba(249,115,22,0.65)',
                            color: '#FED7AA',
                            borderRadius: 999,
                            border: '1px solid',
                            fontSize: 11,
                          }}
                        />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography
                        variant="body2"
                        sx={{ color: '#E5E7EB', mb: 1, fontWeight: 600 }}
                      >
                        Field-ready experience
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: '#F3F4F6', lineHeight: 1.6 }}
                      >
                        Scan barcodes, capture deliveries, and reconcile inventory from the truck,
                        dock, or customer site in just a few taps.
                      </Typography>
                    </Grid>
                  </Grid>
                  </Box>
                </Touch3D>
              </AnimatedSection>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats + Social Proof */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4}>
              <AnimatedSection animation="fadeInUp">
                <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.4 }}>
                  Why teams switch
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{ mt: 1.5, mb: 1.5 }}
                >
                  From firefighting to predictable operations.
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 360 }}>
                  Eliminate lost {assetConfig.assetTypePlural}, manual spreadsheets, and late returns with
                  a system that keeps your whole team in sync.
                </Typography>
              </AnimatedSection>
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                {stats.map((stat, index) => (
                  <Grid item xs={12} sm={4} key={stat.label}>
                    <StatCard
                      label={stat.label}
                      value={stat.value}
                      icon={stat.icon}
                      color={stat.color}
                      delay={index * 0.08}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Mobile App Demo Section - 3rd Phone Mockup */}
      <Box 
        sx={{ 
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 10, md: 16 },
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
          color: 'white',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 50%, rgba(64,181,173,0.15), transparent 60%), radial-gradient(circle at 70% 50%, rgba(72,201,176,0.12), transparent 60%)',
            opacity: 0.8,
            zIndex: 0,
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <AnimatedSection animation="fadeInUp">
                <Stack spacing={3}>
                  <Chip
                    label="Mobile App Demo"
                    sx={{
                      alignSelf: { xs: 'center', md: 'flex-start' },
                      bgcolor: 'rgba(64,181,173,0.2)',
                      color: '#FFFFFF',
                      borderRadius: 999,
                      px: 2,
                      py: 0.5,
                      border: '1px solid rgba(64,181,173,0.5)',
                      backdropFilter: 'blur(12px)',
                      '& .MuiChip-label': { fontSize: 12, fontWeight: 600, letterSpacing: 0.5 },
                    }}
                  />
                  <MobileTypography
                    variant="h2"
                    sx={{
                      fontSize: { xs: '2rem', md: '3rem' },
                      fontWeight: 800,
                      textAlign: { xs: 'center', md: 'left' },
                      color: '#FFFFFF',
                      lineHeight: 1.2,
                    }}
                  >
                    See it in action
                  </MobileTypography>
                  <MobileTypography
                    variant="h6"
                    sx={{
                      color: '#E2E8F0',
                      textAlign: { xs: 'center', md: 'left' },
                      lineHeight: 1.7,
                      fontWeight: 400,
                      fontSize: { xs: '1rem', md: '1.25rem' },
                    }}
                  >
                    Experience the power of mobile-first asset tracking. Scan barcodes, track deliveries, 
                    and manage your entire {assetConfig.assetTypePlural} inventory from anywhere—all from your smartphone.
                  </MobileTypography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <QrCodeScannerIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 0.5 }}>
                          Instant Barcode Scanning
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                          Point and scan—works with any barcode format, even in low light with flash support
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LocalShipping sx={{ fontSize: 32, color: '#10B981' }} />
                      <Box>
                        <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 0.5 }}>
                          Real-Time Delivery Tracking
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                          Track deliveries, capture proof of delivery, and update status instantly
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CloudSyncIcon sx={{ fontSize: 32, color: '#F59E0B' }} />
                      <Box>
                        <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 0.5 }}>
                          Offline-First Sync
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                          Works offline and syncs automatically when you're back online
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Stack>
              </AnimatedSection>
            </Grid>
            <Grid item xs={12} md={6}>
              <AnimatedSection animation="fadeInUp" delay={0.2}>
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    perspective: '1000px',
                  }}
                >
                  {/* Phone Mockup Container */}
                  <Touch3D intensity="medium">
                    <Box
                      sx={{
                        position: 'relative',
                        width: { xs: 280, md: 360 },
                        height: { xs: 560, md: 720 },
                        borderRadius: { xs: 24, md: 32 },
                        bgcolor: '#0F172A',
                        border: '8px solid #1E293B',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(64,181,173,0.3), inset 0 0 60px rgba(64,181,173,0.1)',
                        overflow: 'hidden',
                        transform: 'rotateY(-5deg) rotateX(2deg)',
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                          transform: 'rotateY(0deg) rotateX(0deg) scale(1.02)',
                        },
                      }}
                    >
                      {/* Phone Notch */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: { xs: 120, md: 150 },
                          height: { xs: 20, md: 25 },
                          bgcolor: '#0F172A',
                          borderRadius: '0 0 12px 12px',
                          zIndex: 10,
                        }}
                      />
                      
                      {/* Screen Content */}
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          bgcolor: '#1E293B',
                          borderRadius: { xs: 16, md: 24 },
                          overflow: 'hidden',
                          position: 'relative',
                          mt: { xs: 1, md: 1.5 },
                          mx: { xs: 0.5, md: 1 },
                          mb: { xs: 0.5, md: 1 },
                        }}
                      >
                        {/* App Header */}
                        <Box
                          sx={{
                            bgcolor: 'primary.main',
                            p: { xs: 2, md: 2.5 },
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                            Scan {assetConfig.assetTypePlural}
                          </Typography>
                          <QrCodeScannerIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
                        </Box>
                        
                        {/* Camera View Mockup */}
                        <Box
                          sx={{
                            flex: 1,
                            bgcolor: '#0F172A',
                            position: 'relative',
                            height: 'calc(100% - 60px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {/* Scanning Frame */}
                          <Box
                            sx={{
                              width: { xs: 200, md: 260 },
                              height: { xs: 120, md: 150 },
                              border: '3px solid',
                              borderColor: 'primary.main',
                              borderRadius: 3,
                              position: 'relative',
                              mb: 4,
                            }}
                          >
                            {/* Corner Indicators */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: -3,
                                left: -3,
                                width: 20,
                                height: 20,
                                borderTop: '4px solid',
                                borderLeft: '4px solid',
                                borderColor: 'primary.main',
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: -3,
                                right: -3,
                                width: 20,
                                height: 20,
                                borderTop: '4px solid',
                                borderRight: '4px solid',
                                borderColor: 'primary.main',
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: -3,
                                left: -3,
                                width: 20,
                                height: 20,
                                borderBottom: '4px solid',
                                borderLeft: '4px solid',
                                borderColor: 'primary.main',
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: -3,
                                right: -3,
                                width: 20,
                                height: 20,
                                borderBottom: '4px solid',
                                borderRight: '4px solid',
                                borderColor: 'primary.main',
                              }}
                            />
                            
                            {/* Scanning Line Animation */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: 0,
                                right: 0,
                                height: 2,
                                bgcolor: 'primary.main',
                                opacity: 0.8,
                                animation: 'scanLine 2s infinite',
                                '@keyframes scanLine': {
                                  '0%': { transform: 'translateY(-60px)' },
                                  '100%': { transform: 'translateY(60px)' },
                                },
                              }}
                            />
                          </Box>
                          
                          {/* Flash Button */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: { xs: 16, md: 20 },
                              right: { xs: 16, md: 20 },
                              width: { xs: 44, md: 52 },
                              height: { xs: 44, md: 52 },
                              borderRadius: 2,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(255,255,255,0.2)',
                            }}
                          >
                            <QrCodeScannerIcon sx={{ fontSize: { xs: 20, md: 24 }, color: '#FFD700' }} />
                          </Box>
                          
                          {/* Instruction Text */}
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#E2E8F0',
                              textAlign: 'center',
                              px: 3,
                              fontSize: { xs: '0.75rem', md: '0.875rem' },
                            }}
                          >
                            Point camera at barcode
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Touch3D>
                </Box>
              </AnimatedSection>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
              Everything You Need
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Powerful features designed to make asset management effortless
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card3D intensity={isMobile ? 'light' : 'medium'}>
                  <Box sx={{ mb: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'center' }}>
                    {React.cloneElement(feature.icon, {
                      sx: { fontSize: { xs: 40, md: 48 }, ...feature.icon.props.sx }
                    })}
                  </Box>
                  <MobileTypography variant="h5" fontWeight={600} sx={{ mb: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                    {feature.title}
                  </MobileTypography>
                  <MobileTypography color="text.secondary" sx={{ lineHeight: { xs: 1.5, md: 1.6 }, textAlign: 'center', fontSize: { xs: '0.875rem', md: '1rem' } }}>
                    {feature.description}
                  </MobileTypography>
                </Card3D>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1F2937', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={4}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: 'primary.main' }}>
                {assetConfig.appName}
              </Typography>
              <Typography color="grey.400" sx={{ mb: 3, lineHeight: 1.6 }}>
                Modern asset management platform built for today's businesses. Streamline your operations with our mobile-first solution.
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Product
              </Typography>
              <Stack spacing={1}>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/features')}
                  >
                    Features
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/pricing')}
                  >
                    Pricing
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/demo')}
                  >
                    Demo
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/integrations')}
                  >
                    Integrations
                  </Button>
                </Touch3D>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Resources
              </Typography>
              <Stack spacing={1}>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/documentation')}
                  >
                    Documentation
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/support')}
                  >
                    Help Center
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/blog')}
                  >
                    Blog
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/faq')}
                  >
                    FAQ
                  </Button>
                </Touch3D>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Company
              </Typography>
              <Stack spacing={1}>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/about')}
                  >
                    About Us
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/contact')}
                  >
                    Contact
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/reviews')}
                  >
                    Reviews
                  </Button>
                </Touch3D>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Legal
              </Typography>
              <Stack spacing={1}>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/privacy-policy')}
                  >
                    Privacy Policy
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/terms-of-service')}
                  >
                    Terms of Service
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/security')}
                  >
                    Security
                  </Button>
                </Touch3D>
                <Touch3D intensity="light">
                  <Button 
                    color="inherit" 
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                    onClick={() => navigate('/security')}
                  >
                    Compliance
                  </Button>
                </Touch3D>
              </Stack>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 6, borderColor: 'grey.700' }} />
          
          <Grid container spacing={4} alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={6}>
              <Typography color="grey.400" variant="body2">
                © 2024 {assetConfig.appName}. All rights reserved. | Built with ❤️ for modern businesses
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' }, gap: 2 }}>
                <Typography variant="body2" color="grey.400" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon sx={{ fontSize: 16 }} />
                  Secure & Reliable
                </Typography>
                <Typography variant="body2" color="grey.400" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16 }} />
                  Cloud-Based
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Contact Info */}
          <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'grey.700', textAlign: 'center' }}>
            <Typography variant="body2" color="grey.400" sx={{ mb: 2 }}>
              Questions? We're here to help.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" alignItems="center">
              <Typography variant="body2" color="grey.300">
                📧 support@scanified.com
              </Typography>
              <Typography variant="body2" color="grey.300">
                💬 Available for support
              </Typography>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
} 