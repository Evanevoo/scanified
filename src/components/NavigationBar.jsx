import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Fade,
  useScrollTrigger,
  Slide
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';

const navigationItems = [
  {
    label: 'Features',
    path: '/features',
    description: 'Explore all capabilities'
  },
  {
    label: 'Pricing',
    path: '/pricing',
    description: 'Simple, transparent pricing'
  },
  {
    label: 'Demo',
    path: '/demo',
    description: 'Try it yourself'
  },
  {
    label: 'Resources',
    items: [
      { label: 'Case Studies', path: '/case-studies' },
      { label: 'Documentation', path: '/documentation' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Blog', path: '/blog' },
      { label: 'Support', path: '/support' }
    ]
  },
  {
    label: 'Company',
    items: [
      { label: 'About Us', path: '/about' },
      { label: 'Contact', path: '/contact' },
      { label: 'Reviews', path: '/reviews' },
      
    ]
  }
];

function HideOnScroll({ children }) {
  const trigger = useScrollTrigger();
  
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

export default function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { config } = useAssetConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [resourcesAnchor, setResourcesAnchor] = useState(null);
  const [companyAnchor, setCompanyAnchor] = useState(null);
  
  // Calculate scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const progress = (scrollTop / documentHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    setResourcesAnchor(null);
    setCompanyAnchor(null);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Don't show navigation on certain pages
  const hideNavPages = ['/login', '/register'];
  if (hideNavPages.includes(location.pathname) || profile) {
    return null;
  }

  return (
    <>
      <HideOnScroll>
        <AppBar 
          position="sticky" 
          color="default" 
          elevation={0}
          sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Container maxWidth="lg">
            <Toolbar sx={{ py: 1 }}>
              {/* Logo */}
              <Typography 
                variant="h5" 
                fontWeight={700} 
                sx={{ 
                  color: '#3B82F6', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
                onClick={() => navigate('/')}
              >
                {config.appName || 'Scanified'}
              </Typography>

              {/* Desktop Navigation */}
              <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', gap: 1 }}>
                {navigationItems.map((item) => (
                  item.items ? (
                    <Box key={item.label}>
                      <Button
                        endIcon={<ArrowDownIcon />}
                        onClick={(e) => item.label === 'Resources' ? setResourcesAnchor(e.currentTarget) : setCompanyAnchor(e.currentTarget)}
                        sx={{
                          color: 'text.primary',
                          fontWeight: 500,
                          textTransform: 'none',
                          px: 2,
                          '&:hover': {
                            bgcolor: 'rgba(59, 130, 246, 0.04)',
                            color: 'primary.main'
                          }
                        }}
                      >
                        {item.label}
                      </Button>
                      <Menu
                        anchorEl={item.label === 'Resources' ? resourcesAnchor : companyAnchor}
                        open={Boolean(item.label === 'Resources' ? resourcesAnchor : companyAnchor)}
                        onClose={() => item.label === 'Resources' ? setResourcesAnchor(null) : setCompanyAnchor(null)}
                        PaperProps={{
                          sx: {
                            mt: 1,
                            minWidth: 180,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                          }
                        }}
                      >
                        {item.items.map((subItem) => (
                          <MenuItem
                            key={subItem.path}
                            onClick={() => handleNavigate(subItem.path)}
                            sx={{
                              '&:hover': {
                                bgcolor: 'rgba(59, 130, 246, 0.04)',
                                color: 'primary.main'
                              }
                            }}
                          >
                            {subItem.label}
                          </MenuItem>
                        ))}
                      </Menu>
                    </Box>
                  ) : (
                    <Button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      sx={{
                        color: isActive(item.path) ? 'primary.main' : 'text.primary',
                        fontWeight: isActive(item.path) ? 600 : 500,
                        textTransform: 'none',
                        px: 2,
                        position: 'relative',
                        '&:hover': {
                          bgcolor: 'rgba(59, 130, 246, 0.04)',
                          color: 'primary.main'
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: -8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: isActive(item.path) ? '80%' : '0%',
                          height: 2,
                          bgcolor: 'primary.main',
                          transition: 'width 0.3s ease'
                        }
                      }}
                    >
                      {item.label}
                    </Button>
                  )
                ))}
              </Box>

              {/* CTA Buttons */}
              <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2
                    }
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/register')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }
                  }}
                >
                  Start Free Trial
                </Button>
              </Stack>

              {/* Mobile Menu Button */}
              <IconButton
                edge="end"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                sx={{ display: { xs: 'flex', md: 'none' } }}
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            </Toolbar>
          </Container>

          {/* Progress Bar */}
          <LinearProgress 
            variant="determinate" 
            value={scrollProgress} 
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              bgcolor: 'transparent',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main'
              }
            }}
          />
        </AppBar>
      </HideOnScroll>

      {/* Mobile Menu */}
      <Fade in={mobileMenuOpen}>
        <Box
          sx={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'white',
            zIndex: 1200,
            display: { xs: mobileMenuOpen ? 'block' : 'none', md: 'none' },
            overflowY: 'auto'
          }}
        >
          <Container sx={{ py: 3 }}>
            <Stack spacing={2}>
              {navigationItems.map((item) => (
                item.items ? (
                  <Box key={item.label}>
                    <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>
                      {item.label}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {item.items.map((subItem) => (
                        <Button
                          key={subItem.path}
                          fullWidth
                          onClick={() => handleNavigate(subItem.path)}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            color: 'text.primary',
                            fontWeight: 500,
                            px: 2,
                            py: 1.5
                          }}
                        >
                          {subItem.label}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                ) : (
                  <Button
                    key={item.path}
                    fullWidth
                    onClick={() => handleNavigate(item.path)}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      color: isActive(item.path) ? 'primary.main' : 'text.primary',
                      fontWeight: isActive(item.path) ? 600 : 500,
                      px: 2,
                      py: 1.5,
                      bgcolor: isActive(item.path) ? 'rgba(59, 130, 246, 0.04)' : 'transparent'
                    }}
                  >
                    {item.label}
                  </Button>
                )
              ))}
              
              <Box sx={{ pt: 2 }}>
                <Stack spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleNavigate('/login')}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.5
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleNavigate('/register')}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.5
                    }}
                  >
                    Start Free Trial
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Container>
        </Box>
      </Fade>
    </>
  );
}