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
import NotificationsIcon from '@mui/icons-material/Notifications';
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
import Paper from '@mui/material/Paper';
import { SearchInputWithIcon } from './ui/search-input-with-icon';


const drawerWidth = 280;
const collapsedWidth = 72;

export default function MainLayout({ children }) {
  const { profile, organization, signOut } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#FF6B35';
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
  const permissions = usePermissions();
  const { can } = permissions || { can: () => false };
  const { isOwner } = useOwnerAccess();
  const isOwnerPortal = profile?.role === 'owner' && location.pathname.startsWith('/owner-portal');

  // Top navigation links - only show for organizations, not for owner
  const topNavLinks = profile?.role === 'owner' 
    ? [] 
    : [
        { label: 'Home', to: '/home' },
        { label: 'Inventory', to: '/inventory' },
        { label: 'Orders', to: '/import-approvals' },
        { label: 'Rentals', to: '/rentals' },
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
        // CRITICAL SECURITY: Must always filter by organization_id
        const { data: bottles, error: bottleError } = await supabase
          .from('bottles')
          .select('id, serial_number, barcode_number, assigned_customer, product_code, organization_id')
          .eq('organization_id', organization.id)
          .or(`serial_number.ilike.%${searchTerm}%,barcode_number.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%`)
          .limit(5);
        
        if (bottleError) {
          logger.error('Error fetching bottles for search:', bottleError);
        }
        
        // SECURITY CHECK: Double-verify all bottles belong to current organization
        const verifiedBottles = (bottles || []).filter(b => b.organization_id === organization.id);
        
        const customerResults = (customers || []).map(c => ({
          type: 'customer',
          id: c.CustomerListID,
          label: c.name,
          sub: c.CustomerListID,
        }));
        const bottleResults = verifiedBottles.map(b => ({
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
              top: 64,
              height: 'calc(100vh - 64px)',
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
          bgcolor: 'background.paper',
          color: '#111',
          boxShadow: 'none',
          border: 'none',
          minHeight: 64,
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', gap: 2 }}>
          {/* Logo and Company Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Box 
              sx={{ 
                height: 40, 
                width: 40, 
                borderRadius: 2, 
                background: organization?.logo_url ? 'transparent' : primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                fontWeight: 'bold',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {organization?.logo_url ? (
                <img 
                  src={organization.logo_url} 
                  alt="Logo" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain', 
                    borderRadius: 2 
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                organization?.name?.charAt(0)?.toUpperCase() || 'W'
              )}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111', fontSize: '18px', display: { xs: 'none', sm: 'block' } }}>
              {organization?.name || 'WeldCor'}
            </Typography>
          </Box>

          {/* Right Section: Navigation Tabs, Search Bar, and Icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' }}>
            {/* Navigation Links */}
            {topNavLinks.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0 }}>
                {topNavLinks.map(link => (
                  <Button
                    key={link.label}
                    onClick={() => navigate(link.to)}
                    sx={{
                    color: location.pathname === link.to ? primaryColor : '#111',
                    fontWeight: location.pathname === link.to ? 700 : 500,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.875rem',
                    textTransform: 'none',
                    px: 2,
                    py: 1,
                    minHeight: 48,
                    borderRadius: 0,
                    borderBottom: location.pathname === link.to ? `2px solid ${primaryColor}` : '2px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      color: primaryColor,
                      backgroundColor: 'transparent',
                    },
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
              </Box>
            )}
            
            {/* Search Bar - Next to Navigation Buttons */}
            <Box sx={{ width: '100%', maxWidth: 400, position: 'relative' }} ref={searchRef}>
              <SearchInputWithIcon
                placeholder="Search customers, bottles, orders..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                className="w-full"
              />
              {showSuggestions && suggestions.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    mt: 1,
                    maxHeight: 400,
                    overflow: 'auto',
                    zIndex: 1300,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    borderRadius: 2,
                  }}
                >
                  <List dense>
                    {suggestions.map((suggestion, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemButton
                          onClick={() => handleSelectSuggestion(suggestion)}
                          sx={{
                            '&:hover': {
                              backgroundColor: '#F3F4F6',
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 600, color: '#111' }}>
                                {suggestion.label}
                              </Typography>
                            }
                            secondary={
                              <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                {suggestion.type === 'customer' ? 'Customer' : suggestion.type === 'organization' ? 'Organization' : 'Bottle'} • {suggestion.sub}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
            
            {/* Icon Buttons */}
            <IconButton sx={{ color: '#111', width: 40, height: 40, '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' } }} aria-label="Notifications">
              <NotificationsIcon />
            </IconButton>
            <IconButton sx={{ color: '#111', width: 40, height: 40, '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' } }} onClick={() => navigate('/settings')} aria-label="Settings">
              <SettingsIcon />
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