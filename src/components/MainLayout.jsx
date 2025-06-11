import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import AssignmentIcon from '@mui/icons-material/Assignment';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useThemeContext } from '../context/ThemeContext';
import GlobalImportProgress from './GlobalImportProgress';
import ImportNotification from './ImportNotification';

const drawerWidth = 250;

const sidebarPages = [
  { label: 'Customers', icon: <PeopleIcon />, to: '/customers' },
  { label: 'Locations', icon: <LocationOnIcon />, to: '/locations' },
  { label: 'All Gas Assets', icon: <SwapVertIcon />, to: '/all-gas-assets' },
  { label: 'Scanned Orders', icon: <AssignmentIcon />, to: '/scanned-orders' },
  {
    label: 'Integrations', icon: <SwapVertIcon />, to: null, subItems: [
      { label: 'Import', to: '/import' },
      { label: 'Import Customers', to: '/import-customer-info' },
      { label: 'Import History', to: '/import-history' },
      { label: 'Import Approvals', to: '/import-approvals' },
      { label: 'Bottle Management', to: '/bottle-management' },
      { label: 'Customer ID Generator', to: '/integrations' },
    ]
  },
];

const topNavLinks = [
  { label: 'Home', to: '/home' },
  { label: 'Rentals', to: '/rentals' },
  { label: 'Orders', to: '/import-approvals' },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [integrationsOpen, setIntegrationsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeContext();

  useEffect(() => {
    setShowSuggestions(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSidebarToggle = () => setSidebarOpen(!sidebarOpen);

  const drawer = (
    <Box sx={{ bgcolor: '#fff', height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1.5px solid #eaeaea', minHeight: '100vh', width: drawerWidth, position: 'relative', overflowY: 'hidden', overflowX: 'hidden' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: '#fff', borderBottom: '1.5px solid #eaeaea' }}>
        <Toolbar sx={{ minHeight: 56, px: 2, py: 0, justifyContent: 'flex-start', bgcolor: '#fff' }}>
          <Button
            onClick={handleSidebarToggle}
            sx={{
              color: '#111',
              fontWeight: 700,
              fontSize: '1rem',
              textTransform: 'none',
              pl: 0,
              bgcolor: '#fff',
              minHeight: 40,
              minWidth: 0,
              boxShadow: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#f5faff' },
            }}
            startIcon={<MenuOpenIcon />}
          >
            Hide Sidebar
          </Button>
        </Toolbar>
      </Box>
      <Divider sx={{ my: 1, bgcolor: '#eaeaea' }} />
      <List sx={{ flex: 1 }}>
        {sidebarPages.map((item, idx) => (
          <React.Fragment key={item.label}>
            {item.label !== 'Integrations' ? (
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={item.to && location.pathname === item.to}
                  onClick={() => item.to && navigate(item.to)}
                  sx={{
                    borderRadius: 8,
                    mx: 1,
                    my: 0.5,
                    py: 1.1,
                    px: 2,
                    fontWeight: 700,
                    color: location.pathname === item.to ? '#00aaff' : '#111',
                    backgroundColor: location.pathname === item.to ? '#f5faff' : 'transparent',
                    '&:hover': {
                      backgroundColor: '#f5faff',
                      color: '#00aaff',
                    },
                    fontFamily: 'Inter, Montserrat, Arial, sans-serif',
                    fontSize: '1.05rem',
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  <ListItemIcon sx={{ color: '#888', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700, fontFamily: 'Inter, Montserrat, Arial, sans-serif', fontSize: '1.05rem' }} />
                </ListItemButton>
              </ListItem>
            ) : (
              <>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setIntegrationsOpen(open => !open)}
                    sx={{
                      borderRadius: 8,
                      mx: 1,
                      my: 0.5,
                      py: 1.1,
                      px: 2,
                      fontWeight: 700,
                      color: '#111',
                      backgroundColor: 'transparent',
                      '&:hover': {
                        backgroundColor: '#f5faff',
                        color: '#00aaff',
                      },
                      fontFamily: 'Inter, Montserrat, Arial, sans-serif',
                      fontSize: '1.05rem',
                      textTransform: 'none',
                      letterSpacing: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ListItemIcon sx={{ color: '#888', minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700, fontFamily: 'Inter, Montserrat, Arial, sans-serif', fontSize: '1.05rem' }} />
                    {integrationsOpen ? <ExpandMoreIcon sx={{ ml: 'auto' }} /> : <ChevronRightIcon sx={{ ml: 'auto' }} />}
                  </ListItemButton>
                </ListItem>
                {integrationsOpen && (
                  <List disablePadding sx={{ pl: 5, mb: 0.5 }}>
                    {item.subItems.map(sub => (
                      <ListItem key={sub.label} disablePadding>
                        <ListItemButton
                          selected={location.pathname === sub.to}
                          onClick={() => navigate(sub.to)}
                          sx={{
                            borderRadius: 8,
                            mx: 0.5,
                            my: 0.2,
                            py: 0.9,
                            px: 2,
                            fontWeight: 500,
                            color: location.pathname === sub.to ? '#00aaff' : '#111',
                            backgroundColor: location.pathname === sub.to ? '#f5faff' : 'transparent',
                            '&:hover': {
                              backgroundColor: '#f5faff',
                              color: '#00aaff',
                            },
                            fontFamily: 'Inter, Montserrat, Arial, sans-serif',
                            fontSize: '1rem',
                            textTransform: 'none',
                            letterSpacing: 0,
                          }}
                        >
                          <ListItemText primary={sub.label} primaryTypographyProps={{ fontWeight: 500, fontFamily: 'Inter, Montserrat, Arial, sans-serif', fontSize: '1rem' }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            )}
          </React.Fragment>
        ))}
      </List>
      <Box sx={{ flexGrow: 0, height: 24 }} />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff' }}>
      <CssBaseline />
      {sidebarOpen ? (
        <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="sidebar">
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                bgcolor: '#fff',
                borderRight: '1.5px solid #eaeaea',
                overflowY: 'hidden',
                overflowX: 'hidden',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      ) : (
        <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1300 }}>
          <Button onClick={handleSidebarToggle} sx={{ color: '#111', fontWeight: 700, fontSize: '1rem', textTransform: 'none', borderRadius: 2, bgcolor: '#fff', boxShadow: 1, minWidth: 0, p: 1 }} startIcon={<MenuIcon />}>
            Show Sidebar
          </Button>
        </Box>
      )}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#fff',
          color: '#111',
          boxShadow: 'none',
          border: 'none',
          minHeight: 64,
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: 3 }}>
          <Typography
            variant="h5"
            component="div"
            sx={{ fontFamily: 'Inter, Montserrat, Arial, sans-serif', fontWeight: 900, color: '#111', letterSpacing: '-0.01em', fontSize: '1.6rem', mr: 3, cursor: 'pointer' }}
            onClick={() => navigate('/home')}
            title="Go to Home"
          >
            LessAnnoyingScan
          </Typography>
          <Box sx={{ flexGrow: 1, maxWidth: 400, ml: 1 }}>
            <TextField
              size="small"
              placeholder="Search customers, orders, cylinders..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: '#bbb', mr: 1 }} />,
                sx: {
                  bgcolor: '#f8f8f8',
                  borderRadius: 32,
                  fontFamily: 'Inter, Montserrat, Arial, sans-serif',
                  fontWeight: 500,
                  fontSize: '1rem',
                  height: 40,
                  pl: 1,
                  pr: 1,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#eaeaea',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00aaff',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00aaff',
                    borderWidth: 2,
                  },
                  '& input': {
                    color: '#111',
                    '&::placeholder': {
                      color: '#bbb',
                      opacity: 1,
                    },
                  },
                },
              }}
              fullWidth
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 4 }}>
            {topNavLinks.map(link => (
              <Button
                key={link.label}
                onClick={() => navigate(link.to)}
                sx={{
                  color: location.pathname === link.to ? '#00aaff' : '#111',
                  fontWeight: 700,
                  fontFamily: 'Inter, Montserrat, Arial, sans-serif',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mx: 1.5,
                  px: 2,
                  minWidth: 0,
                  borderBottom: location.pathname === link.to ? '2.5px solid #00aaff' : '2.5px solid transparent',
                  transition: 'color 0.2s, border-bottom 0.2s',
                }}
              >
                {link.label}
              </Button>
            ))}
            <IconButton sx={{ color: '#111', ml: 2 }} onClick={() => navigate('/settings')} aria-label="Settings">
              <SettingsIcon />
            </IconButton>
            <IconButton sx={{ color: '#111', ml: 1 }} onClick={() => { localStorage.clear(); navigate('/login'); }} aria-label="Logout">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          maxWidth: '100%',
          bgcolor: '#fff',
          minHeight: '100vh',
        }}
      >
        <Toolbar sx={{ minHeight: 64 }} />
        <Outlet />
        <GlobalImportProgress />
        <ImportNotification />
      </Box>
    </Box>
  );
} 