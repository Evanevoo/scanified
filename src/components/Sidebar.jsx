import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { useTheme } from '../context/ThemeContext';
import { ListItem, ListItemButton, ListItemIcon, ListItemText, TextField, InputAdornment } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  List, Divider, Box, Typography, Collapse, Chip, IconButton, Tooltip
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
  const accentColor = organizationColors?.primary || '#667eea';
  const accentSelectedBg = alpha(accentColor, 0.15);
  const accentHoverBg = alpha(accentColor, 0.08);
  const accentShadow = alpha(accentColor, 0.25);
  
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

  const isActive = (path) => location.pathname === path;

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
                    border: '1px solid #eee',
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
        { title: 'Verification Center', path: '/verification-center', icon: <CheckCircle />, roles: ['admin', 'user', 'manager'] },
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
        { title: 'Dashboard', path: '/dashboard', icon: <Dashboard />, roles: ['admin', 'user', 'manager'] },
        { title: 'Industry Analytics', path: '/industry-analytics', icon: <Analytics />, roles: ['admin', 'user', 'manager'] },
        { title: 'Customers', path: '/customers', icon: <People />, roles: ['admin', 'user', 'manager'] },
        { title: 'Locations', path: '/locations', icon: <LocationIcon />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    operations: {
      title: 'Operations',
      icon: <LocalShipping />,
      items: [
        { title: 'Deliveries', path: '/deliveries', icon: <LocalShipping />, roles: ['admin', 'user', 'manager'] },
        { title: 'Rentals', path: '/rentals', icon: <Schedule />, roles: ['admin', 'user', 'manager'] },
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
        { title: 'Asset History Lookup', path: '/asset-history-lookup', icon: <SearchIcon />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    analytics: {
      title: 'Analytics & Reports',
      icon: <Analytics />,
      items: [
        { title: 'Organization Analytics', path: '/organization-analytics', icon: <Analytics />, roles: ['admin', 'user', 'manager'] },
        { title: 'Custom Reports', path: '/custom-reports', icon: <ReportIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Audit Management', path: '/audit-management', icon: <Assessment />, roles: ['admin', 'manager'] }
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
      mt: 8, 
      height: 'calc(100% - 64px)',
      backgroundColor: '#fafbfc',
      borderRight: '1px solid #e1e5e9'
    }}>
        {/* Collapse Toggle */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: isCollapsed ? 'center' : 'flex-end', 
          p: 2, 
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IconButton 
              onClick={onToggleCollapse}
              size="small"
              sx={{
                backgroundColor: isCollapsed ? 'primary.main' : '#f8f9fa',
                color: isCollapsed ? 'white' : 'text.secondary',
                borderRadius: 2,
                border: '1px solid #e1e5e9',
                '&:hover': {
                  backgroundColor: isCollapsed ? 'primary.dark' : '#e9ecef',
                  transform: 'scale(1.05)',
                  transition: 'all 0.2s ease'
                }
              }}
            >
              {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Organization Info */}
        {organization && (
          <Box sx={{ 
            p: isCollapsed ? 1.5 : 2.5, 
            borderBottom: '1px solid #e1e5e9', 
            backgroundColor: '#ffffff',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: isCollapsed ? 0 : 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            {organization.logo_url ? (
              <img 
                key={organization.logo_url}
                src={organization.logo_url} 
                alt="Org Logo" 
                style={{ 
                  height: isCollapsed ? 28 : 36, 
                  width: isCollapsed ? 28 : 36, 
                  objectFit: 'contain', 
                  borderRadius: 8, 
                  background: '#fff', 
                  border: '2px solid #e1e5e9',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onError={(e) => {
                  logger.error('Failed to load logo:', organization.logo_url);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <Box 
                sx={{ 
                  height: isCollapsed ? 28 : 36, 
                  width: isCollapsed ? 28 : 36, 
                  borderRadius: 8, 
                  background: `linear-gradient(135deg, ${organizationColors?.primary || '#40B5AD'} 0%, ${organizationColors?.secondary || '#48C9B0'} 100%)`,
                  border: '2px solid #e1e5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: isCollapsed ? '12px' : '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {organization.name?.charAt(0)?.toUpperCase() || '?'}
              </Box>
            )}
            {!isCollapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" color="primary" noWrap sx={{ fontWeight: 600, fontSize: '14px' }}>
                  {organization.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '12px' }}>
                  {getRoleDisplayName(actualRole)} • {profile?.full_name}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Search */}
        {!isCollapsed && (
          <Box sx={{ 
            p: 2.5, 
            borderBottom: '1px solid #e1e5e9',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <TextField
              size="small"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e1e5e9',
                  '&:hover': {
                    borderColor: accentColor,
                    backgroundColor: '#ffffff'
                  },
                  '&.Mui-focused': {
                    borderColor: accentColor,
                    backgroundColor: '#ffffff',
                    boxShadow: `0 0 0 3px ${alpha(accentColor, 0.15)}`
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#6c757d' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}

        {/* Menu Sections */}
        <List sx={{ py: 0 }}>
          {Object.entries(filteredSections).map(([sectionKey, section], sectionIndex) => (
            <React.Fragment key={sectionKey}>
              {/* Section Divider */}
              {sectionIndex > 0 && <Divider />}
              
              {/* Section Header */}
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => !isCollapsed && toggleSection(sectionKey)}
                  sx={{ 
                    py: 1.5,
                    px: 2,
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #e1e5e9',
                    borderRadius: 0,
                    '&:hover': {
                      backgroundColor: '#e9ecef',
                      transform: 'translateX(2px)',
                      transition: 'all 0.2s ease'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 40 }}>
                    <Tooltip title={isCollapsed ? section.title : ''} placement="right">
                      <Box sx={{ 
                        color: accentColor,
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {section.icon}
                      </Box>
                    </Tooltip>
                  </ListItemIcon>
                  {!isCollapsed && (
                    <>
                      <ListItemText 
                        primary={section.title}
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          fontWeight: 700,
                          color: '#495057',
                          fontSize: '13px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}
                      />
                      <Box sx={{ 
                        color: '#6c757d',
                        transition: 'transform 0.2s ease',
                        transform: sections[sectionKey] ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}>
                        {sections[sectionKey] ? <ExpandLess /> : <ExpandMore />}
                      </Box>
                    </>
                  )}
                </ListItemButton>
              </ListItem>

              {/* Section Items */}
              <Collapse in={isCollapsed || sections[sectionKey]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {section.items.map((item, index) => (
                    <React.Fragment key={item.path}>
                      <ListItem disablePadding>
                        <ListItemButton
                          selected={isActive(item.path)}
                          onClick={() => handleNavigation(item.path)}
                          sx={{
                            pl: isCollapsed ? 1.5 : 3.5,
                            py: 1.2,
                            px: 2,
                            borderBottom: index < section.items.length - 1 ? '1px solid #e9ecef' : 'none',
                            borderRadius: 0,
                            backgroundColor: isActive(item.path) ? accentSelectedBg : 'transparent',
                            borderLeft: isActive(item.path) ? `4px solid ${accentColor}` : '4px solid transparent',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: isActive(item.path) ? accentSelectedBg : accentHoverBg,
                              transform: 'translateX(4px)',
                              borderLeft: `4px solid ${accentColor}`,
                              boxShadow: `0 2px 8px ${accentShadow}`
                            },
                            '&.Mui-selected': {
                              backgroundColor: accentSelectedBg,
                              borderLeft: `4px solid ${accentColor}`,
                              '&:hover': {
                                backgroundColor: accentSelectedBg,
                                transform: 'translateX(4px)',
                              },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 40 }}>
                            <Tooltip title={isCollapsed ? item.title : ''} placement="right">
                              <Box sx={{ 
                                color: isActive(item.path) ? accentColor : '#6c757d',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s ease'
                              }}>
                                {item.icon}
                              </Box>
                            </Tooltip>
                          </ListItemIcon>
                          {!isCollapsed && (
                            <ListItemText 
                              primary={item.title}
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: isActive(item.path) ? 600 : 500,
                                color: isActive(item.path) ? '#495057' : '#6c757d',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                              }}
                            />
                          )}
                        </ListItemButton>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
    </Box>
  );
};

export default Sidebar;