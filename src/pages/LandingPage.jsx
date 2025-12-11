import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, Stack, Divider, Avatar, Chip, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';
import AnimatedSection from '../components/AnimatedSection';
export default function LandingPage() {
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();

  const features = [
    {
      icon: <QrCodeScannerIcon sx={{ fontSize: 48, color: '#3B82F6' }} />,
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

  // Testimonials data
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Operations Manager',
      company: 'Industrial Gas Solutions',
      text: 'This platform transformed our cylinder tracking. We went from manual spreadsheets to real-time visibility in just one day.',
      avatar: 'SJ',
      rating: 5
    },
    {
      name: 'Mike Chen',
      role: 'Fleet Supervisor',
      company: 'Metro Gas Distribution',
      text: 'Finally, a system that actually works in the field. Our drivers love the mobile scanning, and I love the real-time reports.',
      avatar: 'MC',
      rating: 5
    },
    {
      name: 'Jennifer Martinez',
      role: 'Business Owner',
      company: 'Southwest Cylinder Co.',
      text: 'Switched from legacy systems and never looked back. This is what modern software should be - simple, powerful, and affordable.',
      avatar: 'JM',
      rating: 5
    }
  ];

  // Stats data
  const stats = [
    { label: 'Active Users', value: '10K+', icon: <PeopleIcon />, color: '#3B82F6' },
    { label: 'Assets Tracked', value: '500K+', icon: <QrCodeScannerIcon />, color: '#10B981' },
    { label: 'Uptime', value: '99.9%', icon: <VerifiedUserIcon />, color: '#F59E0B' },
    { label: 'Time Saved', value: '20hrs/week', icon: <TrendingUpIcon />, color: '#8B5CF6' }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box sx={{ 
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          zIndex: 0
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          top: '-300px',
          right: '-300px',
          zIndex: 0,
          animation: 'float 20s ease-in-out infinite'
        }
      }}>
        {/* 3D Floating Elements */}
        <Box
          sx={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            top: '10%',
            left: '5%',
            zIndex: 0,
            opacity: 0.1,
            transform: 'perspective(1000px) rotateY(45deg) rotateX(15deg)',
            animation: 'float3D 15s ease-in-out infinite',
            '@keyframes float3D': {
              '0%, 100%': {
                transform: 'perspective(1000px) rotateY(45deg) rotateX(15deg) translateY(0px)',
              },
              '50%': {
                transform: 'perspective(1000px) rotateY(225deg) rotateX(15deg) translateY(-30px)',
              }
            }
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3)',
              transform: 'perspective(1000px) rotateY(45deg)',
            }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            width: '150px',
            height: '150px',
            bottom: '15%',
            right: '10%',
            zIndex: 0,
            opacity: 0.1,
            transform: 'perspective(1000px) rotateY(-45deg) rotateX(-15deg)',
            animation: 'float3DReverse 18s ease-in-out infinite',
            '@keyframes float3DReverse': {
              '0%, 100%': {
                transform: 'perspective(1000px) rotateY(-45deg) rotateX(-15deg) translateY(0px)',
              },
              '50%': {
                transform: 'perspective(1000px) rotateY(-225deg) rotateX(-15deg) translateY(30px)',
              }
            }
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #10B981, #3B82F6)',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(16, 185, 129, 0.3)',
              transform: 'perspective(1000px) rotateY(-45deg)',
            }}
          />
        </Box>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(30px, -30px) rotate(120deg); }
            66% { transform: translate(-20px, 20px) rotate(240deg); }
          }
        `}</style>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 16 }, position: 'relative', zIndex: 1 }}>
          <AnimatedSection animation="fadeInUp">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Chip 
                label="Trusted by 1000+ businesses" 
                color="primary" 
                sx={{ mb: 3, py: 2, px: 1, fontSize: '0.9rem', fontWeight: 600 }}
                icon={<VerifiedUserIcon />}
              />
              
              <Typography 
                variant="h1" 
                fontWeight={800} 
                sx={{ 
                  mb: 3, 
                  fontSize: { xs: '2.5rem', sm: '3rem', md: '4rem' },
                  lineHeight: 1.1,
                  background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #1E40AF 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em'
                }}
              >
                Modern Asset Management
                <br />
                Made Simple
              </Typography>
              
              <Typography 
                variant="h5" 
                color="text.secondary" 
                sx={{ 
                  mb: 6, 
                  maxWidth: 800, 
                  mx: 'auto', 
                  lineHeight: 1.7,
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  fontWeight: 400
                }}
              >
                Track your {assetConfig.assetTypePlural}, manage customers, and streamline operations 
                with our mobile-first platform. Built for modern businesses.
              </Typography>
              
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={3} 
                justifyContent="center"
                sx={{ mb: 5 }}
              >
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={() => navigate('/create-organization')}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ 
                    py: 2.5, 
                    px: 6,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 3,
                    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 12px 35px rgba(59, 130, 246, 0.5)',
                      transform: 'translateY(-3px)',
                    }
                  }}
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{ 
                    py: 2.5, 
                    px: 6,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 3,
                    borderWidth: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderWidth: 2,
                      transform: 'translateY(-3px)',
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  Sign In
                </Button>
              </Stack>
              
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                justifyContent="center"
                alignItems="center"
                sx={{ mb: 6 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    7-day free trial
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    No credit card required
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Cancel anytime
                  </Typography>
                </Box>
              </Stack>

              {/* Stats Section */}
              <AnimatedSection animation="fadeInUp" delay={0.2}>
                <Grid container spacing={3} sx={{ mt: 4, mb: 6, perspective: '1000px' }}>
                  {stats.map((stat, index) => (
                    <Grid item xs={6} sm={3} key={index}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          textAlign: 'center',
                          borderRadius: 3,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          transformStyle: 'preserve-3d',
                          position: 'relative',
                          '&:hover': {
                            transform: 'perspective(1000px) rotateY(5deg) rotateX(-5deg) translateY(-8px) scale(1.02)',
                            boxShadow: `0 20px 40px ${stat.color}40, 0 0 0 1px ${stat.color}20`,
                            borderColor: stat.color,
                            '& .stat-icon': {
                              transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(20px)',
                            },
                            '& .stat-value': {
                              transform: 'translateZ(10px)',
                            }
                          }
                        }}
                      >
                        <Box 
                          className="stat-icon"
                          sx={{ 
                            display: 'inline-flex', 
                            p: 1.5, 
                            borderRadius: 2, 
                            bgcolor: `${stat.color}15`,
                            color: stat.color,
                            mb: 2,
                            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            transform: 'perspective(1000px) rotateY(0deg)',
                          }}
                        >
                          {React.cloneElement(stat.icon, { sx: { fontSize: 32 } })}
                        </Box>
                        <Typography 
                          className="stat-value"
                          variant="h4" 
                          fontWeight={700} 
                          sx={{ 
                            mb: 0.5, 
                            color: stat.color,
                            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          {stat.label}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </AnimatedSection>

              {/* Getting Started Options */}
              <AnimatedSection animation="fadeInUp" delay={0.3}>
                <Box sx={{ 
                  maxWidth: 900, 
                  mx: 'auto', 
                  p: { xs: 3, md: 5 }, 
                  bgcolor: 'background.paper',
                  borderRadius: 4, 
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                  mb: 4,
                  perspective: '1200px'
                }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 4, textAlign: 'center' }}>
                    Two Ways to Get Started
                  </Typography>
                  <Grid container spacing={4} alignItems="stretch">
                    <Grid item xs={12} md={6}>
                      <Card sx={{ 
                        p: 4,
                        height: '100%',
                        textAlign: 'center',
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: 'primary.main',
                        bgcolor: 'primary.50',
                        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transformStyle: 'preserve-3d',
                        position: 'relative',
                        '&:hover': {
                          transform: 'perspective(1200px) rotateY(-8deg) rotateX(5deg) translateY(-8px) scale(1.03)',
                          boxShadow: '0 20px 50px rgba(59, 130, 246, 0.3)',
                          '& .emoji-3d': {
                            transform: 'perspective(1200px) rotateY(0deg) rotateX(0deg) translateZ(30px) scale(1.2)',
                          }
                        }
                      }}>
                        <Typography 
                          className="emoji-3d"
                          variant="h4" 
                          sx={{ 
                            mb: 2,
                            transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            display: 'inline-block',
                            transform: 'perspective(1200px) rotateY(0deg)',
                          }}
                        >
                          🏢
                        </Typography>
                        <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mb: 2 }}>
                          Create Your Organization
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                          Start your own organization and invite team members. Perfect for business owners and managers.
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ 
                        p: 4,
                        height: '100%',
                        textAlign: 'center',
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: 'success.main',
                        bgcolor: 'success.50',
                        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transformStyle: 'preserve-3d',
                        position: 'relative',
                        '&:hover': {
                          transform: 'perspective(1200px) rotateY(8deg) rotateX(5deg) translateY(-8px) scale(1.03)',
                          boxShadow: '0 20px 50px rgba(16, 185, 129, 0.3)',
                          '& .emoji-3d': {
                            transform: 'perspective(1200px) rotateY(0deg) rotateX(0deg) translateZ(30px) scale(1.2)',
                          }
                        }
                      }}>
                        <Typography 
                          className="emoji-3d"
                          variant="h4" 
                          sx={{ 
                            mb: 2,
                            transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            display: 'inline-block',
                            transform: 'perspective(1200px) rotateY(0deg)',
                          }}
                        >
                          🔗
                        </Typography>
                        <Typography variant="h6" fontWeight={600} color="success.main" sx={{ mb: 2 }}>
                          Join with Code/Link
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                          Received an invitation link or join code? Sign in to connect to your organization.
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              </AnimatedSection>
            </Box>
          </AnimatedSection>
        </Container>
      </Box>

      {/* Key Benefits Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <AnimatedSection animation="fadeInUp">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
              Why Choose Us?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Everything you need to manage your assets efficiently
            </Typography>
          </Box>
          <Grid container spacing={4} sx={{ maxWidth: 1000, mx: 'auto', perspective: '1000px' }} alignItems="stretch">
            <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
              <Card sx={{ 
                p: 4, 
                borderRadius: 3, 
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transformStyle: 'preserve-3d',
                '&:hover': {
                  transform: 'perspective(1000px) rotateY(-5deg) rotateX(3deg) translateY(-10px) scale(1.02)',
                  boxShadow: '0 20px 40px rgba(59, 130, 246, 0.2)',
                  borderColor: 'primary.main',
                  '& .benefit-icon-3d': {
                    transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(30px) scale(1.15)',
                  }
                }
              }}>
                <Box 
                  className="benefit-icon-3d"
                  sx={{ 
                    display: 'inline-flex', 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    mb: 2,
                    width: 'fit-content',
                    transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: 'perspective(1000px) rotateY(0deg)',
                  }}
                >
                  <PhoneIphoneIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mb: 1.5 }}>
                  Mobile-First
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Scan and track assets from any smartphone or tablet. No expensive hardware needed.
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
              <Card sx={{ 
                p: 4, 
                borderRadius: 3, 
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transformStyle: 'preserve-3d',
                '&:hover': {
                  transform: 'perspective(1000px) rotateY(0deg) rotateX(3deg) translateY(-10px) scale(1.02)',
                  boxShadow: '0 20px 40px rgba(16, 185, 129, 0.2)',
                  borderColor: 'success.main',
                  '& .benefit-icon-3d': {
                    transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(30px) scale(1.15)',
                  }
                }
              }}>
                <Box 
                  className="benefit-icon-3d"
                  sx={{ 
                    display: 'inline-flex', 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: 'success.50',
                    color: 'success.main',
                    mb: 2,
                    width: 'fit-content',
                    transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: 'perspective(1000px) rotateY(0deg)',
                  }}
                >
                  <CloudSyncIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={600} color="success.main" sx={{ mb: 1.5 }}>
                  Real-Time Sync
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Instant updates across all devices and team members. Always stay in sync.
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
              <Card sx={{ 
                p: 4, 
                borderRadius: 3, 
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transformStyle: 'preserve-3d',
                '&:hover': {
                  transform: 'perspective(1000px) rotateY(5deg) rotateX(3deg) translateY(-10px) scale(1.02)',
                  boxShadow: '0 20px 40px rgba(245, 158, 11, 0.2)',
                  borderColor: 'warning.main',
                  '& .benefit-icon-3d': {
                    transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(30px) scale(1.15)',
                  }
                }
              }}>
                <Box 
                  className="benefit-icon-3d"
                  sx={{ 
                    display: 'inline-flex', 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: 'warning.50',
                    color: 'warning.main',
                    mb: 2,
                    width: 'fit-content',
                    transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: 'perspective(1000px) rotateY(0deg)',
                  }}
                >
                  <SpeedIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={600} color="warning.main" sx={{ mb: 1.5 }}>
                  Easy Setup
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Get started in minutes with simple onboarding. No training required.
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </AnimatedSection>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <AnimatedSection animation="fadeInUp">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography variant="h2" fontWeight={700} sx={{ mb: 3, fontSize: { xs: '2rem', md: '2.75rem' } }}>
                Everything You Need
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>
                Powerful features designed to make asset management effortless
              </Typography>
            </Box>
          </AnimatedSection>

          <Grid container spacing={4} sx={{ perspective: '1000px' }}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <AnimatedSection animation="fadeInUp" delay={index * 0.1}>
                  <Card sx={{ 
                    p: 4, 
                    height: '100%',
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    cursor: 'pointer',
                    transformStyle: 'preserve-3d',
                    position: 'relative',
                    '&:hover': {
                      transform: 'perspective(1000px) rotateY(5deg) rotateX(-5deg) translateY(-12px) scale(1.02)',
                      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                      borderColor: 'primary.main',
                      '& .feature-icon-3d': {
                        transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(40px) scale(1.15)',
                      },
                      '& .feature-title-3d': {
                        transform: 'translateZ(20px)',
                      }
                    }
                  }}>
                    <Box 
                      className="feature-icon-3d"
                      sx={{ 
                        mb: 3,
                        display: 'inline-flex',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'grey.100',
                        transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transform: 'perspective(1000px) rotateY(0deg)',
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography 
                      className="feature-title-3d"
                      variant="h5" 
                      fontWeight={600} 
                      sx={{ 
                        mb: 2,
                        transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                  </Card>
                </AnimatedSection>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <AnimatedSection animation="fadeInUp">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h2" fontWeight={700} sx={{ mb: 3, fontSize: { xs: '2rem', md: '2.75rem' } }}>
              Loved by Businesses
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>
              See what our customers are saying about their experience
            </Typography>
          </Box>
        </AnimatedSection>

        <Grid container spacing={4} sx={{ perspective: '1000px' }}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <AnimatedSection animation="fadeInUp" delay={index * 0.1}>
                <Card sx={{ 
                  p: 4, 
                  height: '100%',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transformStyle: 'preserve-3d',
                  position: 'relative',
                  '&:hover': {
                    transform: 'perspective(1000px) rotateY(-5deg) rotateX(3deg) translateY(-8px) scale(1.02)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                    '& .avatar-3d': {
                      transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(25px) scale(1.1)',
                    },
                    '& .stars-3d': {
                      transform: 'translateZ(15px)',
                    }
                  }
                }}>
                  <Box 
                    className="stars-3d"
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      mb: 3,
                      transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    }}
                  >
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <StarIcon key={i} sx={{ color: '#FBBF24', fontSize: 20 }} />
                    ))}
                  </Box>
                  <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, fontStyle: 'italic', color: 'text.secondary' }}>
                    "{testimonial.text}"
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar 
                      className="avatar-3d"
                      sx={{ 
                        bgcolor: 'primary.main', 
                        width: 48, 
                        height: 48,
                        transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transform: 'perspective(1000px) rotateY(0deg)',
                      }}
                    >
                      {testimonial.avatar}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {testimonial.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {testimonial.role} at {testimonial.company}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </AnimatedSection>
            </Grid>
          ))}
        </Grid>

        {/* CTA Section */}
        <AnimatedSection animation="fadeInUp" delay={0.3}>
          <Box sx={{ 
            mt: 10, 
            textAlign: 'center',
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            bgcolor: 'primary.main',
            color: 'white',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
            position: 'relative',
            perspective: '1200px',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'perspective(1200px) rotateX(2deg)',
              '& .cta-button-3d': {
                transform: 'perspective(1200px) rotateY(0deg) rotateX(0deg) translateZ(20px) scale(1.05)',
              }
            }
          }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 2, fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
              Join thousands of businesses already using our platform to streamline their operations
            </Typography>
            <Button
              className="cta-button-3d"
              variant="contained"
              size="large"
              onClick={() => navigate('/create-organization')}
              endIcon={<ArrowForwardIcon />}
              sx={{
                py: 2,
                px: 6,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 3,
                bgcolor: 'white',
                color: 'primary.main',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: 'perspective(1200px) rotateY(0deg)',
                '&:hover': {
                  bgcolor: 'grey.100',
                  transform: 'perspective(1200px) rotateY(0deg) rotateX(0deg) translateZ(25px) scale(1.08)',
                  boxShadow: '0 15px 40px rgba(0, 0, 0, 0.35)'
                }
              }}
            >
              Start Your Free Trial
            </Button>
          </Box>
        </AnimatedSection>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1F2937', color: 'white', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={4}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: '#3B82F6' }}>
                {assetConfig.appName}
              </Typography>
              <Typography color="grey.400" sx={{ mb: 3, lineHeight: 1.7, fontSize: '0.95rem' }}>
                Modern asset management platform built for today's businesses. Streamline your operations with our mobile-first solution.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Chip 
                  icon={<SecurityIcon sx={{ color: 'grey.300' }} />}
                  label="Secure"
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'grey.300' }}
                  size="small"
                />
                <Chip 
                  icon={<CheckCircleIcon sx={{ color: 'grey.300' }} />}
                  label="Cloud-Based"
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'grey.300' }}
                  size="small"
                />
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: 'white' }}>
                Product
              </Typography>
              <Stack spacing={1.5}>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/features')}
                >
                  Features
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/pricing')}
                >
                  Pricing
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/demo')}
                >
                  Demo
                </Button>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: 'white' }}>
                Resources
              </Typography>
              <Stack spacing={1.5}>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/documentation')}
                >
                  Documentation
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/faq')}
                >
                  FAQ
                </Button>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: 'white' }}>
                Company
              </Typography>
              <Stack spacing={1.5}>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/contact')}
                >
                  Contact
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/reviews')}
                >
                  Reviews
                </Button>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: 'white' }}>
                Legal
              </Typography>
              <Stack spacing={1.5}>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/privacy-policy')}
                >
                  Privacy Policy
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none', 
                    color: 'grey.400', 
                    p: 0,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => navigate('/terms-of-service')}
                >
                  Terms of Service
                </Button>
              </Stack>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 6, borderColor: 'grey.700' }} />
          
          <Grid container spacing={4} alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={6}>
              <Typography color="grey.400" variant="body2" sx={{ lineHeight: 1.7 }}>
                © {new Date().getFullYear()} {assetConfig.appName}. All rights reserved.
              </Typography>
              <Typography color="grey.500" variant="body2" sx={{ mt: 1 }}>
                Built with ❤️ for modern businesses
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: { xs: 'flex-start', md: 'flex-end' }, 
                gap: 3,
                flexWrap: 'wrap'
              }}>
                <Chip
                  icon={<SecurityIcon sx={{ color: 'grey.400' }} />}
                  label="Secure & Reliable"
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.05)', 
                    color: 'grey.300',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  size="small"
                />
                <Chip
                  icon={<CheckCircleIcon sx={{ color: 'grey.400' }} />}
                  label="Cloud-Based"
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.05)', 
                    color: 'grey.300',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>

          {/* Contact Info */}
          <Box sx={{ 
            mt: 6, 
            pt: 4, 
            borderTop: 1, 
            borderColor: 'grey.700', 
            textAlign: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 2,
            p: 3
          }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
              Questions? We're here to help.
            </Typography>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3} 
              justifyContent="center" 
              alignItems="center"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" color="grey.300" sx={{ fontWeight: 500 }}>
                  📧 support@scanified.com
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" color="grey.300" sx={{ fontWeight: 500 }}>
                  💬 Available for support
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
} 