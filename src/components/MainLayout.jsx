import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
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
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useThemeContext } from '../context/ThemeContext';
import GlobalImportProgress from './GlobalImportProgress';
import ImportNotification from './ImportNotification';
import { useOwnerAccess } from '../hooks/useOwnerAccess';
import { supabase } from '../supabase/client';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../hooks/useAuth';
import TextField from '@mui/material/TextField';


const drawerWidth = 250;

export default function MainLayout() {
  const { profile, organization } = useAuth();
  const [integrationsOpen, setIntegrationsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const searchRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeContext();
  const { isOwner } = useOwnerAccess();
  const { can } = usePermissions();

  // Sidebar logic - only show owner links for owner, show full navigation for organizations
  const sidebarPages = profile?.role === 'owner'
    ? [
        { label: 'Platform Overview', icon: <BusinessIcon />, to: '/owner-portal' },
        { label: 'Customer Management', icon: <PeopleIcon />, to: '/owner-portal/customer-management' },
      ]
    : [
        { label: 'Dashboard', icon: <AdminPanelSettingsIcon />, to: '/dashboard' },
        { label: 'Customers', icon: <PeopleIcon />, to: '/customers' },
        { label: 'Inventory', icon: <SwapVertIcon />, to: '/assets' },
        { label: 'Orders & Scans', icon: <AssignmentIcon />, to: '/scanned-orders' },
        {
          label: 'Data & Import', icon: <SwapVertIcon />, to: null, subItems: [
            { label: 'Import Data', to: '/import' },
            { label: 'Import Customers', to: '/import-customer-info' },
            { label: 'Approval Queue', to: '/import-approvals' },
            { label: 'Bottle Management', to: '/bottle-management' },
          ]
        },
        { label: 'Help & Support', icon: <AssignmentIcon />, to: '/support' },
      ];

  useEffect(() => {
    setShowSuggestions(false);
  }, [location.pathname]);

  useEffect(() => {
    console.log('Search term changed:', searchTerm);
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const fetchSuggestions = async () => {
      // Customers: by name or ID
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('CustomerListID, name, phone')
        .or(`CustomerListID.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .limit(5);
      
      if (customerError) {
        console.error('Error fetching customers for search:', customerError);
      }
      
      // Bottles: by serial number or barcode
      const { data: bottles, error: bottleError } = await supabase
        .from('bottles')
        .select('id, serial_number, barcode_number, assigned_customer')
        .or(`serial_number.ilike.%${searchTerm}%,barcode_number.ilike.%${searchTerm}%`)
        .limit(5);
      
      if (bottleError) {
        console.error('Error fetching bottles for search:', bottleError);
      }
      const customerResults = (customers || []).map(c => ({
        type: 'customer',
        id: c.CustomerListID,
        label: c.name,
        sub: c.CustomerListID,
      }));
      const bottleResults = (bottles || []).map(b => ({
        type: 'bottle',
        id: b.id,
        label: b.serial_number || b.barcode_number,
        sub: b.barcode_number || b.serial_number,
      }));
      if (active) {
        console.log('Setting suggestions:', [...customerResults, ...bottleResults]);
        setSuggestions([...customerResults, ...bottleResults]);
      }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item) => {
    console.log('Selected suggestion:', item);
    setShowSuggestions(false);
    setSearchTerm('');
    if (item.type === 'customer') {
      navigate(`/customer/${item.id}`);
    } else if (item.type === 'bottle') {
      navigate(`/bottle/${item.id}`);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear any cached data
      if (window.indexedDB) {
        const databases = await window.indexedDB.databases();
        databases.forEach(db => {
          window.indexedDB.deleteDatabase(db.name);
        });
      }
      
      // Navigate to login page using React Router
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: navigate anyway
      navigate('/login');
    }
  };

  const drawer = (
    <Box sx={{ 
      bgcolor: '#fff', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      borderRight: '1.5px solid #eaeaea', 
      minHeight: '100vh', 
      width: drawerWidth, 
      position: 'relative', 
      overflowY: 'hidden', 
      overflowX: 'hidden',
      boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
    }}>
      <Box sx={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 2, 
        bgcolor: '#fff', 
        borderBottom: '1.5px solid #eaeaea',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        <Toolbar sx={{ minHeight: 56, px: 2, py: 0, justifyContent: 'flex-start', bgcolor: 'transparent' }}>
          <Button
            sx={{ 
              color: '#1976d2', 
              fontWeight: 700, 
              fontSize: '1rem', 
              textTransform: 'none', 
              pl: 0, 
              bgcolor: 'transparent', 
              minHeight: 40, 
              minWidth: 0, 
              boxShadow: 'none', 
              borderRadius: 2, 
              '&:hover': { 
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                color: '#1565c0'
              } 
            }}
            startIcon={<MenuOpenIcon />}
          >
            Hide Sidebar
          </Button>
        </Toolbar>
      </Box>
      <Divider sx={{ my: 1, bgcolor: 'var(--divider)' }} />
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

  // Top navigation links - only show for organizations, not for owner
  const topNavLinks = profile?.role === 'owner' 
    ? [] 
    : [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Inventory', to: '/rentals' },
        { label: 'Orders', to: '/import-approvals' },
        { label: 'Billing', to: '/billing' },
      ];

  return (
    <Box sx={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      position: 'relative',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      overflow: 'hidden',
    }}>
      {/* Background overlay for depth */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at 60% 0%, rgba(66,165,245,0.12) 0%, rgba(25,118,210,0.08) 60%, transparent 100%)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          height: '100vh',
          overflow: 'hidden',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            zIndex: (theme) => theme.zIndex.drawer
          },
        }}
      >
        <Box sx={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
          {drawer}
        </Box>
      </Drawer>
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
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            {organization?.logo_url && (
              <img 
                key={organization.logo_url}
                src={organization.logo_url} 
                alt="Org Logo" 
                style={{ 
                  height: 32, 
                  width: 32, 
                  objectFit: 'contain', 
                  borderRadius: 4, 
                  background: '#fff', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  marginRight: 12
                }} 
                onError={(e) => {
                  console.error('Failed to load logo in header:', organization.logo_url);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('Logo loaded successfully in header:', organization.logo_url);
                }}
              />
            )}
            <Typography
              variant="h5"
              component="div"
              sx={{ fontFamily: 'Inter, Montserrat, Arial, sans-serif', fontWeight: 900, color: '#111', letterSpacing: '-0.01em', fontSize: '1.6rem', cursor: 'pointer' }}
              onClick={() => navigate('/dashboard')}
              title="Go to Dashboard"
            >
              LessAnnoyingScan
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 4 }}>
            {topNavLinks.map(link => (
              <Button
                key={link.label}
                onClick={() => navigate(link.to)}
                sx={{
                  color: location.pathname === link.to ? '#1976d2' : '#111',
                  fontWeight: 700,
                  fontFamily: 'Inter, Montserrat, Arial, sans-serif',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mx: 1.5,
                  px: 2,
                  minWidth: 0,
                  borderBottom: location.pathname === link.to ? '2.5px solid #1976d2' : '2.5px solid transparent',
                  transition: 'color 0.2s, border-bottom 0.2s',
                  '&:hover': {
                    color: '#1976d2',
                    backgroundColor: 'rgba(25,118,210,0.07)',
                  },
                }}
              >
                {link.label}
              </Button>
            ))}
            <IconButton sx={{ color: '#111', ml: 2, '&:hover': { backgroundColor: 'rgba(25,118,210,0.07)' } }} onClick={() => navigate('/settings')} aria-label="Settings">
              <SettingsIcon />
            </IconButton>
            <IconButton sx={{ color: '#111', ml: 1, '&:hover': { backgroundColor: 'rgba(25,118,210,0.07)' } }} onClick={handleLogout} aria-label="Logout">
              <LogoutIcon />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1, maxWidth: 400, ml: 1, position: 'relative' }} ref={searchRef}>
            <TextField
              placeholder="Search customers, bottles..."
              size="small"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              sx={{
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '24px',
                border: '1.5px solid rgba(255,255,255,0.3)',
                color: '#1976d2',
                fontSize: '1.1rem',
                width: 320,
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#1976d2',
                  fontWeight: 500,
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'white',
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.2)',
                    outline: 'none',
                  },
                  '&.Mui-focused': {
                    outline: 'none',
                  },
                  '& input:focus': {
                    outline: 'none',
                  },
                  '& .MuiInputAdornment-root .MuiSvgIcon-root': {
                    color: '#1976d2',
                  },
                },
                '& input': {
                  color: '#1976d2',
                  fontWeight: 500,
                  fontSize: '1.1rem',
                  '&::placeholder': {
                    color: 'rgba(25, 118, 210, 0.7)',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <SearchIcon style={{ color: '#1976d2', marginRight: 8 }} />
                ),
              }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <Box sx={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 1000,
                mt: 1,
                maxHeight: 300,
                overflow: 'auto',
                border: '1px solid #e0e0e0'
              }}>
                {suggestions.map((item, index) => (
                  <Box
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelectSuggestion(item)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                      '&:hover': {
                        bgcolor: '#f5f5f5'
                      }
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {item.type === 'customer' ? 'Customer' : 'Bottle'} • {item.sub}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100vw - ${drawerWidth}px)`,
          bgcolor: 'transparent',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          overflow: 'hidden',
        }}
      >
        <Toolbar sx={{ minHeight: 64 }} />
        <Box sx={{
          flex: 1,
          width: '100%',
          bgcolor: '#fff',
          p: 0,
          borderRadius: 0,
          boxShadow: 'none',
          minHeight: 'calc(100vh - 64px)',
          overflow: 'auto',
        }}>
          <Outlet />
        </Box>
        <GlobalImportProgress />
        <ImportNotification />
      </Box>
    </Box>
  );
} 