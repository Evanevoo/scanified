import logger from '../utils/logger';
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
import CircularProgress from '@mui/material/CircularProgress';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '../context/ThemeContext';
import GlobalImportProgress from './GlobalImportProgress';
import ImportNotification from './ImportNotification';
import { useOwnerAccess } from '../hooks/useOwnerAccess';
import { supabase } from '../supabase/client';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';
import TextField from '@mui/material/TextField';
import Sidebar from './Sidebar';
import InputAdornment from '@mui/material/InputAdornment';


const drawerWidth = 280;
const collapsedWidth = 72;

export default function MainLayout({ children }) {
  const { profile, organization, signOut } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  const [integrationsOpen, setIntegrationsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const searchRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { can } = usePermissions();
  const { isOwner } = useOwnerAccess();
  const isOwnerPortal = profile?.role === 'owner' && location.pathname.startsWith('/owner-portal');

  // Top navigation links - only show for organizations, not for owner
  const topNavLinks = profile?.role === 'owner' 
    ? [] 
    : [
        { label: 'Home', to: '/home' },
        { label: 'Inventory', to: '/inventory' },
        { label: 'Orders', to: '/import-approvals' },
        { label: 'Billing', to: '/billing' },
      ];

  useEffect(() => {
    setShowSuggestions(false);
  }, [location.pathname]);

  useEffect(() => {
    logger.log('Search term changed:', searchTerm);
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const fetchSuggestions = async () => {
      // Different search behavior based on user role and current page
      const isInOwnerPortal = location.pathname.startsWith('/owner-portal');
      
      if (isOwner && isInOwnerPortal) {
        // For owners in owner portal: search organizations and system-wide data
        const { data: organizations, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, subscription_status')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        
        if (orgError) {
          logger.error('Error fetching organizations for search:', orgError);
        }
        
        const orgResults = (organizations || []).map(org => ({
          type: 'organization',
          id: org.id,
          label: org.name,
          sub: `Status: ${org.subscription_status || 'Unknown'}`,
        }));
        
        if (active) {
          logger.log('Setting owner portal suggestions:', orgResults);
          setSuggestions(orgResults);
        }
      } else if (organization?.id) {
        // For regular users: only show data from their organization
        // Customers: by name or ID (filtered by organization)
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('CustomerListID, name, phone')
          .eq('organization_id', organization.id)
          .or(`CustomerListID.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .limit(5);
        
        if (customerError) {
          logger.error('Error fetching customers for search:', customerError);
        }
        
        // Bottles: by serial number or barcode (filtered by organization)
        const { data: bottles, error: bottleError } = await supabase
          .from('bottles')
          .select('id, serial_number, barcode_number, assigned_customer, product_code')
          .eq('organization_id', organization.id)
          .or(`serial_number.ilike.%${searchTerm}%,barcode_number.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%`)
          .limit(5);
        
        if (bottleError) {
          logger.error('Error fetching bottles for search:', bottleError);
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
          label: b.barcode_number || b.serial_number || b.product_code,
          sub: b.product_code || b.serial_number || b.barcode_number,
        }));
        
        if (active) {
          logger.log('Setting organization suggestions:', [...customerResults, ...bottleResults]);
          setSuggestions([...customerResults, ...bottleResults]);
        }
      } else {
        // No organization context - clear suggestions
        if (active) {
          setSuggestions([]);
        }
      }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [searchTerm, isOwner, organization?.id, location.pathname]);

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
    logger.log('Selected suggestion:', item);
    setShowSuggestions(false);
    setSearchTerm('');
    if (item.type === 'customer') {
      navigate(`/customer/${item.id}`);
    } else if (item.type === 'bottle') {
      // Navigate to bottle detail page
      navigate(`/bottle/${item.id}`);
    } else if (item.type === 'asset') {
      // Legacy support for old asset references
      navigate(`/asset/${item.id}`);
    } else if (item.type === 'organization') {
      navigate(`/owner-portal/customer-management?org=${item.id}`);
    }
  };

  const handleLogout = async () => {
    logger.log('MainLayout: Logout button clicked');
    setLogoutLoading(true);
    
    try {
      // Clear all storage immediately
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cached data
      if (window.indexedDB) {
        try {
          const databases = await window.indexedDB.databases();
          databases.forEach(db => {
            window.indexedDB.deleteDatabase(db.name);
          });
        } catch (indexedDBError) {
          logger.warn('Could not clear IndexedDB:', indexedDBError);
        }
      }
      
      // Sign out from Supabase directly
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Supabase signOut error:', error);
      }
      
      logger.log('MainLayout: Logout completed, redirecting...');
      
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      // Always redirect to login page
      window.location.href = '/login';
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      position: 'relative',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      overflow: 'hidden',
      // Tablet-specific optimizations
      '@media (min-width: 768px) and (max-width: 1024px)': {
        '& .MuiDrawer-paper': {
          width: sidebarCollapsed ? collapsedWidth : Math.min(drawerWidth, 240), // Reduce sidebar width on tablet
        }
      }
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
      {!isOwnerPortal && (
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarCollapsed ? collapsedWidth : drawerWidth,
            flexShrink: 0,
            height: '100vh',
            overflow: 'hidden',
            transition: 'width 0.3s ease',
            // Force width with !important to override any conflicting styles
            '& .MuiDrawer-paper': {
              width: `${sidebarCollapsed ? collapsedWidth : drawerWidth}px !important`,
              minWidth: `${sidebarCollapsed ? collapsedWidth : drawerWidth}px !important`,
              maxWidth: `${sidebarCollapsed ? collapsedWidth : drawerWidth}px !important`,
              boxSizing: 'border-box',
              top: 0,
              height: '100vh',
              overflow: 'hidden',
              transition: 'width 0.3s ease',
              zIndex: (theme) => theme.zIndex.drawer,
            },
          }}
        >
          <Sidebar 
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </Drawer>
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
        <Toolbar sx={{ minHeight: 64, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Logo and Company Name */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                    logger.error('Failed to load logo in header:', organization.logo_url);
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    logger.log('Logo loaded successfully in header:', organization.logo_url);
                  }}
                />
              )}
              <Typography
                variant="h5"
                component="div"
                sx={{ fontFamily: 'Inter, Montserrat, Arial, sans-serif', fontWeight: 900, color: '#111', letterSpacing: '-0.01em', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                onClick={() => navigate(profile?.role === 'owner' ? '/owner-portal' : '/home')}
                title="Go to Home"
              >
                {assetConfig.appName}
              </Typography>
            </Box>
            
            {/* Navigation Links */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {topNavLinks.map(link => (
                <Button
                  key={link.label}
                  onClick={() => navigate(link.to)}
                  sx={{
                    color: location.pathname === link.to ? '#1976d2' : '#111',
                    fontWeight: 700,
                    fontFamily: 'Inter, Montserrat, Arial, sans-serif',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    px: 2,
                    py: 1,
                    minHeight: 48,
                    borderRadius: 0,
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
            </Box>
          </Box>
          
          {/* Right Section: Search, Settings, Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Search Bar */}
            <Box sx={{ width: 400, position: 'relative' }} ref={searchRef}>
            <TextField
              placeholder={
                isOwner && location.pathname.startsWith('/owner-portal') 
                  ? "Search organizations..." 
                  : "Search customers, bottles..."
              }
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
                fontSize: '0.95rem',
                width: '100%',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#1976d2',
                  fontWeight: 500,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
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
                '& .MuiOutlinedInput-input': {
                  padding: '8px 12px',
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                },
                '& input': {
                  color: '#1976d2',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#1976d2', mr: 1 }} />
                  </InputAdornment>
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
                      {item.type === 'customer' ? 'Customer' : item.type === 'organization' ? 'Organization' : 'Bottle'} • {item.sub}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            </Box>
            
            {/* Icon Buttons */}
            <IconButton sx={{ color: '#111', width: 40, height: 40, '&:hover': { backgroundColor: 'rgba(25,118,210,0.07)' } }} onClick={() => navigate('/settings')} aria-label="Settings">
              <SettingsIcon />
            </IconButton>
            <IconButton 
              sx={{ color: '#111', width: 40, height: 40, '&:hover': { backgroundColor: 'rgba(25,118,210,0.07)' } }} 
              onClick={handleLogout} 
              aria-label="Logout"
              disabled={logoutLoading}
            >
              {logoutLoading ? <CircularProgress size={20} /> : <LogoutIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: isOwnerPortal ? '100vw' : `calc(100vw - ${sidebarCollapsed ? collapsedWidth : drawerWidth}px)`,
          bgcolor: 'transparent',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          // Tablet optimizations
          '@media (min-width: 768px) and (max-width: 1024px)': {
            width: isOwnerPortal ? '100vw' : `calc(100vw - ${sidebarCollapsed ? collapsedWidth : 240}px)`,
            p: 2, // Reduce padding on tablet
          }
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
          {children || <Outlet />}
        </Box>
        <GlobalImportProgress />
        <ImportNotification />
      </Box>
    </Box>
  );
} 