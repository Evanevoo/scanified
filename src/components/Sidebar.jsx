import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { ListItem, ListItemButton, ListItemIcon, ListItemText, TextField, InputAdornment } from '@mui/material';
import {
  Drawer, List, Divider, Box, Typography, Collapse, Chip, IconButton, Tooltip
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
  ChevronLeft, ChevronRight, Menu as MenuIcon, QrCode as QrCodeIcon
} from '@mui/icons-material';

const drawerWidth = 280;
const collapsedWidth = 64;

const Sidebar = ({ open, onClose, isCollapsed, onToggleCollapse }) => {
  const { profile, organization } = useAuth();
  const { can, isOrgAdmin } = usePermissions();
  
  if (!profile) return null;
  
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

  const toggleSection = (section) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const isActive = (path) => location.pathname === path;

  // Owner gets special navigation ONLY if they don't have an organization
  if (profile?.role === 'owner' && !organization) {
    const ownerMenuItems = [

      {
        title: 'Owner Portal',
        path: '/owner-portal',
        icon: <BusinessIcon />, 
        roles: ['owner']
      }
    ];

    return (
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            top: 0,
            height: '100%',
            zIndex: (theme) => theme.zIndex.drawer
          },
        }}
      >
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
                    console.error('Failed to load logo:', organization.logo_url);
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Logo loaded successfully:', organization.logo_url);
                  }}
                />
              ) : (
                <Box 
                  sx={{ 
                    height: 40, 
                    width: 40, 
                    borderRadius: 6, 
                    background: '#f0f0f0', 
                    border: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    fontSize: '12px'
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
      </Drawer>
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
        { title: 'File Format Manager', path: '/file-format-manager', icon: <Settings />, roles: ['admin', 'manager'] },
        { title: 'Import Asset Balance', path: '/import-asset-balance', icon: <Upload />, roles: ['admin', 'user', 'manager'] },
        { title: 'Import Approvals', path: '/import-approvals', icon: <CheckCircle />, roles: ['admin', 'user', 'manager'] },
        { title: 'Import History', path: '/import-approvals-history', icon: <History />, roles: ['admin', 'user', 'manager'] },
        { title: 'Organization Tools', path: '/organization-tools', icon: <BuildIcon />, roles: ['admin', 'manager'] },
        { title: 'User Management', path: '/user-management', icon: <AdminPanelSettings />, roles: ['admin', 'manager'] },
        { title: 'Customer Portal', path: '/customer-portal', icon: <PersonIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Billing', path: '/billing', icon: <Payment />, roles: ['admin'] },
        { title: 'Settings', path: '/settings', icon: <Settings />, roles: ['admin'] },
        { title: 'Support Center', path: '/support', icon: <Support />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    core: {
      title: 'Core',
      icon: <HomeIcon />,
      items: [

        { title: 'Industry Analytics', path: '/industry-analytics', icon: <Analytics />, roles: ['admin', 'user', 'manager'] },
        { title: 'Customers', path: '/customers', icon: <People />, roles: ['admin', 'user', 'manager'] },
        { title: 'Temp Customer Management', path: '/temp-customer-management', icon: <SwapIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Locations', path: '/locations', icon: <LocationIcon />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    operations: {
      title: 'Operations',
      icon: <LocalShipping />,
      items: [
        { title: 'Deliveries', path: '/deliveries', icon: <LocalShipping />, roles: ['admin', 'user', 'manager'] },
        { title: 'Rentals', path: '/rentals', icon: <Schedule />, roles: ['admin', 'user', 'manager'] },
        { title: 'Scanned Orders', path: '/scanned-orders', icon: <OrdersIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Lease Agreements', path: '/lease-agreements', icon: <WorkIcon />, roles: ['admin', 'manager'] },
        { title: 'Generate Customer ID', path: '/generateid', icon: <IntegrationIcon />, roles: ['owner'] },
        { title: 'Barcode Generator', path: '/barcode-generator', icon: <QrCodeIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Accounting Integration', path: '/owner-portal/integration-settings', icon: <IntegrationIcon />, roles: ['owner', 'admin'] }
      ]
    },
    inventory: {
      title: 'Inventory',
      icon: <Inventory />,
      items: [
        { title: 'Assets', path: '/assets', icon: <Inventory />, roles: ['admin', 'user', 'manager'] },
        { title: 'Asset Management', path: '/inventory-management', icon: <Inventory />, roles: ['admin', 'user', 'manager'], dynamic: true, termKey: 'itemManagement' },
        { title: 'Smart Inventory', path: '/smart-inventory', icon: <InventoryIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Asset History Lookup', path: '/asset-history-lookup', icon: <SearchIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'All Asset Movements', path: '/all-asset-movements', icon: <TrendingUp />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    analytics: {
      title: 'Analytics & Reports',
      icon: <Analytics />,
      items: [
        { title: 'Analytics', path: '/analytics', icon: <Analytics />, roles: ['admin', 'manager'] },
        { title: 'Organization Analytics', path: '/organization-analytics', icon: <Analytics />, roles: ['admin', 'user', 'manager'] },
        { title: 'Custom Reports', path: '/custom-reports', icon: <ReportIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Predictive Analytics', path: '/predictive-analytics', icon: <BrainIcon />, roles: ['admin', 'manager'] },
        { title: 'Audit Management', path: '/audit-management', icon: <Assessment />, roles: ['admin', 'manager'] }
      ]
    }
  };

  // Filter items based on user role and search
  const filteredSections = Object.entries(menuSections).reduce((acc, [key, section]) => {
    const filteredItems = section.items.filter(item => {
      const hasRole = item.roles.includes(profile?.role);
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
    switch(role) {
      case 'admin': return 'Administrator';
      case 'manager': return 'Manager';
      case 'user': return 'User';
      default: return role;
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isCollapsed ? collapsedWidth : drawerWidth,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: isCollapsed ? collapsedWidth : drawerWidth,
          boxSizing: 'border-box',
          top: 0,
          height: '100%',
          zIndex: (theme) => theme.zIndex.drawer,
          transition: 'width 0.3s ease',
          overflowX: 'hidden'
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 8, height: 'calc(100% - 64px)' }}>
        {/* Collapse Toggle */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: isCollapsed ? 'center' : 'flex-end', 
          p: 1, 
          borderBottom: 1, 
          borderColor: 'divider' 
        }}>
          <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IconButton 
              onClick={onToggleCollapse}
              size="small"
            >
              {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Organization Info */}
        {organization && !isCollapsed && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
            {organization.logo_url ? (
              <img 
                key={organization.logo_url}
                src={organization.logo_url} 
                alt="Org Logo" 
                style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 4, background: '#fff', border: '1px solid #eee' }}
                onError={(e) => {
                  console.error('Failed to load logo:', organization.logo_url);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <Box 
                sx={{ 
                  height: 32, 
                  width: 32, 
                  borderRadius: 4, 
                  background: '#f0f0f0', 
                  border: '1px solid #eee',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '12px'
                }}
              >
                {organization.name?.charAt(0)?.toUpperCase() || '?'}
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" color="primary" noWrap>
                {organization.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {getRoleDisplayName(profile?.role)} • {profile?.full_name}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Search */}
        {!isCollapsed && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              size="small"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}

        {/* Menu Sections */}
        <List sx={{ py: 0 }}>
          {Object.entries(filteredSections).map(([sectionKey, section]) => (
            <React.Fragment key={sectionKey}>
              {/* Section Header */}
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => !isCollapsed && toggleSection(sectionKey)}
                  sx={{ 
                    py: 0.5,
                    bgcolor: 'action.hover',
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 40 }}>
                    <Tooltip title={isCollapsed ? section.title : ''} placement="right">
                      {section.icon}
                    </Tooltip>
                  </ListItemIcon>
                  {!isCollapsed && (
                    <>
                      <ListItemText 
                        primary={section.title}
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          fontWeight: 600,
                          color: 'text.secondary'
                        }}
                      />
                      {sections[sectionKey] ? <ExpandLess /> : <ExpandMore />}
                    </>
                  )}
                </ListItemButton>
              </ListItem>

              {/* Section Items */}
              <Collapse in={isCollapsed || sections[sectionKey]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {section.items.map((item) => (
                    <ListItem key={item.path} disablePadding>
                      <ListItemButton
                        selected={isActive(item.path)}
                        onClick={() => handleNavigation(item.path)}
                        sx={{
                          pl: isCollapsed ? 1 : 3,
                          py: 0.5,
                          '&.Mui-selected': {
                            backgroundColor: 'primary.light',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 40 }}>
                          <Tooltip title={isCollapsed ? item.title : ''} placement="right">
                            <Box sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
                              {item.icon}
                            </Box>
                          </Tooltip>
                        </ListItemIcon>
                        {!isCollapsed && (
                          <ListItemText 
                            primary={item.title}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: isActive(item.path) ? 600 : 400,
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 