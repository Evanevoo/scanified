import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { useTheme } from '../context/ThemeContext';
import { ListItem, ListItemButton, ListItemIcon, ListItemText, TextField, InputAdornment } from '@mui/material';
import {
  List, Divider, Box, Typography, Collapse, Chip, IconButton, Tooltip, Avatar
} from '@mui/material';
import {
  Dashboard, People, Inventory, LocalShipping, Schedule, Receipt, 
  AdminPanelSettings, Analytics, Payment, Settings, Assessment,
  TrendingUp,   Build as BuildIcon, Business as BusinessIcon,
  LocalGasStation as TruckIcon, AutoFixHigh as AutomationIcon,
  Navigation as RouteOptimizationIcon, People as CustomerServiceIcon,
  SwapHoriz as SwapIcon, 
  ExpandLess, ExpandMore, Work as WorkIcon, Person as PersonIcon,
  Palette as PaletteIcon, Store as StoreIcon, Upload, History, CheckCircle,
  Home as HomeIcon, LocationOn as LocationIcon, Search as SearchIcon,
  Assignment as OrdersIcon, IntegrationInstructions as IntegrationIcon,
  Report as ReportIcon, Inventory2 as InventoryIcon, Support,
  Security as ShieldIcon, Build as WrenchIcon, Description as FileTextIcon,
  Inventory as PackageIcon, Calculate as CalculatorIcon, Psychology as BrainIcon,
  ChevronLeft, ChevronRight, Menu as MenuIcon, QrCode as QrCodeIcon, Notifications as NotificationsIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

const drawerWidth = 280;
const collapsedWidth = 72;

const Sidebar = ({ open, onClose, isCollapsed, onToggleCollapse }) => {
  const { profile, organization } = useAuth();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';
  
  // CRITICAL: Check profile BEFORE calling any other hooks to avoid hook inconsistency
  if (!profile) return null;
  
  const { can, isOrgAdmin } = usePermissions();
  
  const [actualRole, setActualRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const lastFetchedRole = useRef('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sections, setSections] = useState({
    core: true,
    operations: true,
    analytics: false,
    inventory: true,
    advanced: false,
    admin: false
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch actual role name if profile.role is a UUID
  useEffect(() => {
    const fetchRoleName = async () => {
      if (!profile?.role) {
        setRoleLoading(false);
        return;
      }
      
      // Don't refetch if we already resolved this exact role
      if (lastFetchedRole.current === profile.role) {
        setRoleLoading(false);
        return;
      }
      
      setRoleLoading(true);
      
      // Check if role is a UUID (contains hyphens)
      if (profile.role.includes('-')) {
        try {
          const { data: roleData, error } = await supabase
            .from('roles')
            .select('name')
            .eq('id', profile.role)
            .single();
          
          if (error) {
            logger.error('Error fetching role name:', error);
            // Fallback to treating it as a role name
            setActualRole(profile.role);
            lastFetchedRole.current = profile.role;
          } else {
            setActualRole(roleData.name);
            lastFetchedRole.current = profile.role;
            logger.log('Resolved role UUID to name:', profile.role, '->', roleData.name);
          }
        } catch (err) {
          logger.error('Error in role lookup:', err);
          setActualRole(profile.role);
          lastFetchedRole.current = profile.role;
        }
      } else {
        // Role is already a name, use it directly
        setActualRole(profile.role);
        lastFetchedRole.current = profile.role;
      }
      
      setRoleLoading(false);
    };

    fetchRoleName();
  }, [profile?.role]); // Only depend on the role field, not the entire profile object

  const toggleSection = (section) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  // Map paths to match dashboard route
  const normalizePath = (path) => {
    if (path === '/dashboard') return '/home';
    return path;
  };

  const isActive = (path) => {
    const normalizedPath = normalizePath(path);
    return location.pathname === normalizedPath || location.pathname.startsWith(normalizedPath + '/');
  };

  // Helper function to normalize role for case-insensitive comparison
  const normalizeRole = (role) => {
    if (!role) return '';
    return role.toLowerCase();
  };

  // Helper function to check if user has role (case-insensitive)
  const hasRole = (allowedRoles) => {
    const userRole = normalizeRole(actualRole);
    return allowedRoles.some(role => normalizeRole(role) === userRole);
  };

  // Show loading while fetching role
  if (roleLoading) {
    return (
      <Box sx={{ overflow: 'auto', mt: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Typography variant="body2" color="text.secondary">Loading menu...</Typography>
      </Box>
    );
  }

  // Owner gets special navigation ONLY if they don't have an organization
  if (normalizeRole(actualRole) === 'owner' && !organization) {
    const ownerMenuItems = [
      {
        title: 'Owner Portal',
        path: '/owner-portal',
        icon: <BusinessIcon />, 
        roles: ['owner']
      }
    ];

    return (
      <Box sx={{ overflow: 'auto', mt: 8 }}>
          {/* Organization Info */}
          {organization && (
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
              {organization.logo_url ? (
                <img 
                  key={organization.logo_url}
                  src={organization.logo_url} 
                  alt="Org Logo" 
                  style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 6, background: '#fff', border: '1px solid #eee' }}
                  onError={(e) => {
                    logger.error('Failed to load logo:', organization.logo_url);
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    logger.log('Logo loaded successfully:', organization.logo_url);
                  }}
                />
              ) : (
                <Box 
                  sx={{ 
                    height: 40, 
                    width: 40, 
                    borderRadius: 6, 
                    background: `linear-gradient(135deg, ${organizationColors?.primary || '#40B5AD'} 0%, ${organizationColors?.secondary || '#48C9B0'} 100%)`,
                    border: '1px solid',
borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {organization.name?.charAt(0)?.toUpperCase() || '?'}
                </Box>
              )}
              <Box>
                <Typography variant="h6" color="primary">
                  {organization.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Platform Owner • {profile?.full_name}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Main Menu */}
          <List>
            {ownerMenuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={isActive(item.path)}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.title}
                    sx={{ 
                      '& .MuiListItemText-primary': {
                        fontWeight: isActive(item.path) ? 600 : 400,
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
      </Box>
    );
  }

  // Organized menu structure
  const menuSections = {
    admin: {
      title: 'Administration',
      icon: <AdminPanelSettings />,
      items: [
        { title: 'Import Data', path: '/import', icon: <Upload />, roles: ['admin', 'user', 'manager'] },
        { title: 'Import Customers', path: '/import-customer-info', icon: <Upload />, roles: ['admin', 'user', 'manager'] },
        { title: 'Import Asset Balance', path: '/import-asset-balance', icon: <Upload />, roles: ['admin', 'user', 'manager'] },
        { title: 'Order Verification', path: '/import-approvals', icon: <CheckCircle />, roles: ['admin', 'user', 'manager'] },
        { title: 'Verified Orders', path: '/verified-orders', icon: <CheckCircle />, roles: ['admin', 'user', 'manager'] },
        { title: 'Organization Tools', path: '/organization-tools', icon: <BuildIcon />, roles: ['admin', 'manager'] },
              { title: 'User Management', path: '/settings?tab=team', icon: <AdminPanelSettings />, roles: ['admin', 'manager'] },
        { title: 'Join Codes', path: '/organization-join-codes', icon: <QrCodeIcon />, roles: ['admin', 'manager'] },
        { title: 'Role & Permission Management', path: '/role-management', icon: <ShieldIcon />, roles: ['admin'] },
        { title: 'Bulk Rental Pricing', path: '/bulk-rental-pricing', icon: <CalculatorIcon />, roles: ['admin', 'manager'] },
        { title: 'Billing', path: '/billing', icon: <Payment />, roles: ['admin'] },
        { title: 'Settings', path: '/settings', icon: <Settings />, roles: ['admin'] },
        { title: 'Support Center', path: '/support', icon: <Support />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    core: {
      title: 'Core',
      icon: <HomeIcon />,
      items: [
        { title: 'Dashboard', path: '/home', icon: <Dashboard />, roles: ['admin', 'user', 'manager'] },
        { title: 'Industry Analytics', path: '/industry-analytics', icon: <Analytics />, roles: ['admin', 'user', 'manager'] },
        { title: 'Customers', path: '/customers', icon: <People />, roles: ['admin', 'user', 'manager'] },
        { title: 'Locations', path: '/locations', icon: <LocationIcon />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    operations: {
      title: 'Operations',
      icon: <LocalShipping />,
      items: [
        { title: 'Bottles for Day', path: '/bottles-for-day', icon: <Schedule />, roles: ['admin', 'user', 'manager'] },
        { title: 'Rentals', path: '/rentals', icon: <Schedule />, roles: ['admin', 'user', 'manager'] },
        { title: 'Scanned Orders', path: '/scanned-orders', icon: <OrdersIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Lease Agreements', path: '/lease-agreements', icon: <WorkIcon />, roles: ['admin', 'manager'] },
        { title: 'Generate Customer ID', path: '/generateid', icon: <IntegrationIcon />, roles: ['owner'] },
        { title: 'Barcode Generator', path: '/barcode-generator', icon: <QrCodeIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Accounting Integration', path: '/owner-portal/integration-settings', icon: <IntegrationIcon />, roles: ['owner'] }
      ]
    },
    inventory: {
      title: 'Inventory',
      icon: <Inventory />,
      items: [
        { title: 'Bottle Management', path: '/bottle-management', icon: <Inventory />, roles: ['admin', 'user', 'manager'] },
        { title: 'Ownership Management', path: '/ownership-management', icon: <BusinessIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Assets', path: '/assets', icon: <Inventory />, roles: ['admin', 'user', 'manager'] },
        { title: 'Asset History Lookup', path: '/asset-history-lookup', icon: <SearchIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Recently Added Cylinders', path: '/recent-cylinders', icon: <Inventory />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    analytics: {
      title: 'Analytics & Reports',
      icon: <Analytics />,
      items: [
        { title: 'Custom Reports', path: '/custom-reports', icon: <ReportIcon />, roles: ['admin', 'user', 'manager'] }
      ]
    }
  };

  // Filter items based on user role and search (case-insensitive)
  const filteredSections = Object.entries(menuSections).reduce((acc, [key, section]) => {
    const filteredItems = section.items.filter(item => {
      const hasRole = item.roles.some(role => normalizeRole(role) === normalizeRole(actualRole));
      const matchesSearch = !searchTerm || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.path.toLowerCase().includes(searchTerm.toLowerCase());
      return hasRole && matchesSearch;
    });

    if (filteredItems.length > 0) {
      acc[key] = { ...section, items: filteredItems };
    }
    return acc;
  }, {});

  // Get user's role display name
  const getRoleDisplayName = (role) => {
    const normalizedRole = normalizeRole(role);
    switch(normalizedRole) {
      case 'admin': return 'Administrator';
      case 'manager': return 'Manager';
      case 'user': return 'User';
      case 'owner': return 'Owner';
      default: return role;
    }
  };

  return (
    <Box sx={{ 
      overflow: 'auto', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#F5F5F5', // Light gray background like in the image
      borderRight: 'none'
    }}>
        {/* Sidebar collapse toggle */}
        {onToggleCollapse && (
          <Box sx={{ p: 1, display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end' }}>
            <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <IconButton
                size="small"
                onClick={onToggleCollapse}
                sx={{ color: '#6B7280', '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' } }}
              >
                {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Search */}
        {!isCollapsed && (
          <Box sx={{ 
            p: 2.5, 
            backgroundColor: 'background.paper',
            border: 'none',
            borderBottom: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            boxShadow: 'none'
          }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'background.default',
                  border: 'none !important',
                  borderLeft: 'none !important',
                  borderRight: 'none !important',
                  borderTop: 'none !important',
                  borderBottom: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important',
                  '& fieldset': {
                    borderColor: '#e1e5e9 !important',
                    borderWidth: '1px !important',
                    borderStyle: 'solid !important',
                    borderLeftWidth: '1px !important',
                    borderRightWidth: '1px !important',
                    borderTopWidth: '1px !important',
                    borderBottomWidth: '1px !important',
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main !important',
                    borderWidth: '1px !important',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main !important',
                    borderWidth: '1px !important',
                  },
                  '&:hover': {
                    backgroundColor: '#ffffff'
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.paper',
                    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
                  }
                },
                '& .MuiOutlinedInput-input': {
                  border: 'none !important',
                  borderLeft: 'none !important',
                  borderRight: 'none !important',
                  borderTop: 'none !important',
                  borderBottom: 'none !important',
                  outline: 'none !important',
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}

        {/* Menu Sections */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            {Object.entries(filteredSections).map(([sectionKey, section], sectionIndex) => {
              const isSectionOpen = sections[sectionKey] !== false;
              return (
              <React.Fragment key={sectionKey}>
                {/* Section Header - clickable when expanded to collapse/expand section */}
                {!isCollapsed ? (
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => toggleSection(sectionKey)}
                      sx={{ 
                        px: 2.5, 
                        py: 1,
                        minHeight: 36,
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' }
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#6B7280',
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          flex: 1
                        }}
                      >
                        {section.title}
                      </Typography>
                      {isSectionOpen ? <ExpandLess sx={{ fontSize: 18, color: '#6B7280' }} /> : <ExpandMore sx={{ fontSize: 18, color: '#6B7280' }} />}
                    </ListItemButton>
                  </ListItem>
                ) : (
                  <ListItem disablePadding>
                    <Box sx={{ px: 2.5, py: 1, width: '100%' }}>
                      <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        {section.title}
                      </Typography>
                    </Box>
                  </ListItem>
                )}
                
                {/* Section Items - collapsible when sidebar is expanded */}
                <Collapse in={isCollapsed ? true : isSectionOpen} timeout="auto" unmountOnExit={false}>
                <List component="div" disablePadding>
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <ListItem key={item.path} disablePadding>
                        <ListItemButton
                          selected={active}
                          onClick={() => handleNavigation(item.path)}
                          sx={{
                            py: 1.25,
                            px: 2.5,
                            borderRadius: 2,
                            mx: 1,
                            mb: 0.5,
                            backgroundColor: active ? primaryColor : 'transparent',
                            color: active ? '#fff' : '#111',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: active ? primaryColor : 'rgba(0,0,0,0.05)',
                            },
                            '&.Mui-selected': {
                              backgroundColor: primaryColor,
                              color: '#fff',
                              '&:hover': {
                                backgroundColor: primaryColor,
                              },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Box sx={{ 
                              color: active ? '#fff' : '#6B7280',
                              fontSize: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {item.icon}
                            </Box>
                          </ListItemIcon>
                          {!isCollapsed && (
                            <ListItemText 
                              primary={item.title}
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: active ? 600 : 500,
                                color: active ? '#fff' : '#111',
                                fontSize: '14px'
                              }}
                            />
                          )}
                          {active && !isCollapsed && (
                            <Box sx={{ 
                              width: 4, 
                              height: 4, 
                              borderRadius: '50%', 
                              backgroundColor: '#fff',
                              ml: 1
                            }} />
                          )}
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
                </Collapse>
              </React.Fragment>
            );
            })}
        </Box>

        {/* User Profile Section at Bottom */}
        {!isCollapsed && profile && (
          <Box sx={{ 
            p: 2,
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F5F5F5',
            mt: 'auto'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: '#D1D5DB',
                  color: '#6B7280',
                  fontSize: '14px'
                }}
              >
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111', fontSize: '14px' }}>
                  {profile?.full_name || 'User'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '12px' }}>
                  {getRoleDisplayName(actualRole)}
                </Typography>
              </Box>
              <IconButton 
                size="small"
                onClick={() => {
                  supabase.auth.signOut();
                  navigate('/login');
                }}
                sx={{ 
                  color: '#6B7280',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' }
                }}
              >
                <Box component="svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 10V12C12 13.1046 11.1046 14 10 14H4C2.89543 14 2 13.1046 2 12V4C2 2.89543 2.89543 2 4 2H10C11.1046 2 12 2.89543 12 4V6M8 10L10 8M10 8L8 6M10 8H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </Box>
              </IconButton>
            </Box>
          </Box>
        )}
    </Box>
  );
};

export default Sidebar;