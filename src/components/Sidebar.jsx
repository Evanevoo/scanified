import logger from '../utils/logger';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { useTheme } from '../context/ThemeContext';
import { ListItem, ListItemButton, ListItemIcon, ListItemText, TextField, InputAdornment } from '@mui/material';
import {
  List, Divider, Box, Typography, Collapse, IconButton, Tooltip, Avatar, Button,
} from '@mui/material';
import {
  Dashboard, People, Inventory, LocalShipping, Schedule, Receipt, 
  AdminPanelSettings, Analytics, Payment, Settings, Assessment,
  TrendingUp,   Build as BuildIcon, Business as BusinessIcon,
  AutoFixHigh as AutomationIcon, People as CustomerServiceIcon,
  SwapHoriz as SwapIcon, 
  ExpandLess, ExpandMore, Work as WorkIcon, Person as PersonIcon,
  Palette as PaletteIcon, Store as StoreIcon, Upload, History, CheckCircle,
  Home as HomeIcon, LocationOn as LocationIcon, Place as PlaceIcon, Search as SearchIcon,
  Assignment as OrdersIcon, IntegrationInstructions as IntegrationIcon,
  Report as ReportIcon, Inventory2 as InventoryIcon, Support,
  Security as ShieldIcon, Build as WrenchIcon, Description as FileTextIcon,
  Inventory as PackageIcon, Calculate as CalculatorIcon, Psychology as BrainIcon,
  ChevronLeft, ChevronRight, Menu as MenuIcon, QrCode as QrCodeIcon, Notifications as NotificationsIcon,
  Assignment as AssignmentIcon,
  Category as RentalCategoryIcon,
  Link as ProductMapIcon,
  PriceChange as PriceChangeIcon
} from '@mui/icons-material';
import { getPrimaryPathsForRole, getDefaultFullMenuExpanded } from '../nav/appNavConfig';

const drawerWidth = 280;
const collapsedWidth = 72;

/** First-visit defaults: admins/managers see more sections open; standard users get a shorter menu. */
function getDefaultSectionsForRole(role) {
  const r = (role || '').toLowerCase();
  const collapsed = {
    dashboard: true,
    operations: true,
    customers: true,
    subscriptions: true,
    inventory: true,
    pricing: false,
    billing: false,
    reports: false,
    admin: false,
  };
  if (r === 'admin' || r === 'orgowner' || r === 'manager') {
    return { ...collapsed, pricing: true, billing: true, reports: true, admin: true };
  }
  return collapsed;
}

const Sidebar = ({ open, onClose, isCollapsed, onToggleCollapse }) => {
  const { profile, organization } = useAuth();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';

  const { can, isOrgAdmin } = usePermissions();
  
  const [actualRole, setActualRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const lastFetchedRole = useRef('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sections, setSections] = useState({
    dashboard: true,
    operations: true,
    customers: true,
    subscriptions: true,
    inventory: true,
    pricing: false,
    billing: false,
    reports: false,
    admin: false
  });
  const [sectionsHydrated, setSectionsHydrated] = useState(false);
  const [fullMenuExpanded, setFullMenuExpanded] = useState(false);
  const [fullMenuHydrated, setFullMenuHydrated] = useState(false);
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

  useEffect(() => {
    setSectionsHydrated(false);
  }, [organization?.id]);

  useEffect(() => {
    setFullMenuHydrated(false);
  }, [organization?.id]);

  useEffect(() => {
    if (!organization?.id || !profile?.id || roleLoading) return;
    const key = `sidebar-full-menu-v1:${organization.id}:${profile.id}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null && raw !== '') {
        setFullMenuExpanded(JSON.parse(raw));
      } else {
        setFullMenuExpanded(getDefaultFullMenuExpanded(actualRole));
      }
    } catch {
      setFullMenuExpanded(getDefaultFullMenuExpanded(actualRole));
    }
    setFullMenuHydrated(true);
  }, [organization?.id, profile?.id, roleLoading, actualRole]);

  useEffect(() => {
    if (!fullMenuHydrated || !organization?.id || !profile?.id) return;
    const key = `sidebar-full-menu-v1:${organization.id}:${profile.id}`;
    try {
      localStorage.setItem(key, JSON.stringify(fullMenuExpanded));
    } catch {
      /* ignore */
    }
  }, [fullMenuExpanded, fullMenuHydrated, organization?.id, profile?.id]);

  // Restore sidebar section open/closed state per org + user; first visit uses role-based defaults.
  useEffect(() => {
    if (!organization?.id || !profile?.id || roleLoading) return;
    const key = `sidebar-sections-v1:${organization.id}:${profile.id}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSections((prev) => ({ ...prev, ...parsed }));
      } else {
        setSections(getDefaultSectionsForRole(actualRole));
      }
    } catch {
      setSections(getDefaultSectionsForRole(actualRole));
    }
    setSectionsHydrated(true);
  }, [organization?.id, profile?.id, roleLoading, actualRole]);

  useEffect(() => {
    if (!sectionsHydrated || !organization?.id || !profile?.id) return;
    const key = `sidebar-sections-v1:${organization.id}:${profile.id}`;
    try {
      localStorage.setItem(key, JSON.stringify(sections));
    } catch {
      /* ignore quota */
    }
  }, [sections, sectionsHydrated, organization?.id, profile?.id]);

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

  // Organized menu structure
  const menuSections = {
    dashboard: {
      title: 'Dashboard',
      icon: <HomeIcon />,
      items: [
        { title: 'Overview', subtitle: 'Home dashboard', path: '/home', icon: <Dashboard />, roles: ['admin', 'user', 'manager'] },
        { title: 'Industry Analytics', subtitle: 'Benchmarks and trends', path: '/industry-analytics', icon: <Analytics />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    operations: {
      title: 'Operations',
      icon: <LocalShipping />,
      items: [
        { title: 'Import Data', subtitle: 'Bring data into the app', path: '/import', icon: <Upload />, roles: ['admin', 'user', 'manager'] },
        { title: 'Bottles for Day', subtitle: "Today's route planning", path: '/bottles-for-day', icon: <Schedule />, roles: ['admin', 'user', 'manager'] },
        { title: 'Scanned Orders', subtitle: 'Orders from scanning', path: '/scanned-orders', icon: <OrdersIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Order Verification', subtitle: 'Approve pending imports', path: '/import-approvals', icon: <CheckCircle />, roles: ['admin', 'user', 'manager'] },
        { title: 'Verified Orders', subtitle: 'Completed verifications', path: '/verified-orders', icon: <AssignmentIcon />, roles: ['admin', 'user', 'manager'] },
      ]
    },
    customers: {
      title: 'Customers',
      icon: <People />,
      items: [
        { title: 'Customer List', subtitle: 'Search accounts', path: '/customers', icon: <People />, roles: ['admin', 'user', 'manager'] },
        { title: 'Import Customer Info', subtitle: 'Upload customer updates', path: '/import-customer-info', icon: <Upload />, roles: ['admin', 'user', 'manager'] },
        { title: 'Locations', subtitle: 'Branches / sites list', path: '/locations', icon: <LocationIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Join Codes', subtitle: 'Invite users to the org', path: '/organization-join-codes', icon: <QrCodeIcon />, roles: ['admin', 'manager'] }
      ]
    },
    subscriptions: {
      title: 'Rentals',
      icon: <Schedule />,
      items: [
        { title: 'Rentals', subtitle: 'Active rentals & billing', path: '/rentals', icon: <Schedule />, roles: ['admin', 'user', 'manager'] },
        { title: 'Lease Agreements', subtitle: 'Manage agreements and terms', path: '/lease-agreements', icon: <Schedule />, roles: ['admin', 'user', 'manager'] },
      ]
    },
    inventory: {
      title: 'Inventory',
      icon: <Inventory />,
      items: [
        { title: 'Bottle Management', subtitle: 'Bottles and assignments', path: '/bottle-management', icon: <Inventory />, roles: ['admin', 'user', 'manager'] },
        { title: 'Ownership Management', subtitle: 'Who owns which assets', path: '/ownership-management', icon: <BusinessIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Assets', subtitle: 'Full list and filters', path: '/assets', icon: <Inventory />, roles: ['admin', 'user', 'manager'] },
        { title: 'Where bottles are', subtitle: 'By warehouse or customer', path: '/bottle-locations', icon: <PlaceIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Asset History Lookup', subtitle: 'Trace a cylinder', path: '/asset-history-lookup', icon: <SearchIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Bottle Activity', subtitle: 'All bottle edit events', path: '/bottle-activity', icon: <History />, roles: ['admin', 'user', 'manager'] },
        { title: 'Recently Added Cylinders', subtitle: 'New inventory', path: '/recent-cylinders', icon: <Inventory />, roles: ['admin', 'user', 'manager'] }
      ]
    },
    pricing: {
      title: 'Pricing',
      icon: <PriceChangeIcon />,
      items: [
        { title: 'Asset Type Pricing', subtitle: 'Default rates per product', path: '/pricing/asset-types', icon: <RentalCategoryIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Customer Pricing', subtitle: 'Overrides & discounts', path: '/pricing/customers', icon: <PriceChangeIcon />, roles: ['admin', 'user', 'manager'] },
        { title: 'Tax Regions', subtitle: 'Location tax rates', path: '/pricing/tax-regions', icon: <LocationIcon />, roles: ['admin', 'user', 'manager'] },
      ]
    },
    billing: {
      title: 'Billing',
      icon: <Payment />,
      items: [
        { title: 'QuickBooks Export', subtitle: 'Export CSV for QB', path: '/invoices/export', icon: <Receipt />, roles: ['admin', 'user', 'manager'] },
      ]
    },
    reports: {
      title: 'Reports',
      icon: <ReportIcon />,
      items: [
        { title: 'Custom Reports', subtitle: 'Build your own', path: '/custom-reports', icon: <ReportIcon />, roles: ['admin', 'user', 'manager'] },
      ]
    },
    admin: {
      title: 'Admin',
      icon: <AdminPanelSettings />,
      items: [
        { title: 'Team', subtitle: 'Users and invites', path: '/settings?tab=team', icon: <AdminPanelSettings />, roles: ['admin', 'manager'] },
        { title: 'Organization Tools', subtitle: 'Org utilities', path: '/organization-tools', icon: <BuildIcon />, roles: ['admin', 'manager'] },
        { title: 'Roles & Permissions', subtitle: 'Access control', path: '/role-management', icon: <ShieldIcon />, roles: ['admin'] },
        { title: 'Settings', subtitle: 'Company preferences', path: '/settings', icon: <Settings />, roles: ['admin'] },
        { title: 'Support Center', subtitle: 'Help and tickets', path: '/support', icon: <Support />, roles: ['admin', 'user', 'manager'] }
      ]
    }
  };

  // Filter items based on user role and search (case-insensitive)
  // Org owners (role 'orgowner') see same menu as admin, plus owner-only items
  const isOrgOwnerRole = normalizeRole(actualRole) === 'orgowner';
  const filteredSections = Object.entries(menuSections).reduce((acc, [key, section]) => {
    const filteredItems = section.items.filter(item => {
      const hasRole = item.roles.some(role => normalizeRole(role) === normalizeRole(actualRole))
        || (isOrgOwnerRole && item.roles.some(role => ['admin', 'owner'].includes(normalizeRole(role))));
      const st = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        item.title.toLowerCase().includes(st) ||
        item.path.toLowerCase().includes(st) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(st));
      return hasRole && matchesSearch;
    });

    if (filteredItems.length > 0) {
      acc[key] = { ...section, items: filteredItems };
    }
    return acc;
  }, {});

  const pathBase = (p) => {
    if (!p) return '';
    const i = p.indexOf('?');
    return i >= 0 ? p.slice(0, i) : p;
  };

  const flatMenuItems = useMemo(() => {
    const isOrgOwnerRole = normalizeRole(actualRole) === 'orgowner';
    const out = [];
    Object.values(menuSections).forEach((section) => {
      section.items.forEach((item) => {
        const hasRole = item.roles.some((role) => normalizeRole(role) === normalizeRole(actualRole))
          || (isOrgOwnerRole && item.roles.some((role) => ['admin', 'owner'].includes(normalizeRole(role))));
        if (hasRole) out.push(item);
      });
    });
    return out;
  }, [actualRole]);

  const primaryItems = useMemo(() => {
    const paths = getPrimaryPathsForRole(actualRole);
    const seen = new Set();
    const items = [];
    for (const p of paths) {
      const found = flatMenuItems.find((it) => pathBase(it.path) === pathBase(p) || it.path === p);
      if (found && !seen.has(found.path)) {
        seen.add(found.path);
        items.push(found);
      }
    }
    return items.slice(0, 5);
  }, [actualRole, flatMenuItems]);

  const showCompactMenu = !isCollapsed && !searchTerm.trim() && !fullMenuExpanded && primaryItems.length > 0;

  // Get user's role display name
  const getRoleDisplayName = (role) => {
    const normalizedRole = normalizeRole(role);
    switch(normalizedRole) {
      case 'admin': return 'Administrator';
      case 'manager': return 'Manager';
      case 'user': return 'User';
      case 'owner': return 'Platform Owner';
      case 'orgowner': return 'Org Owner';
      default: return role;
    }
  };

  if (!profile) {
    return null;
  }

  if (roleLoading) {
    return (
      <Box sx={{ overflow: 'auto', mt: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Typography variant="body2" color="text.secondary">Loading menu...</Typography>
      </Box>
    );
  }

  if (normalizeRole(actualRole) === 'owner' && !organization) {
    const ownerMenuItems = [
      {
        title: 'Owner Portal',
        path: '/owner-portal',
        icon: <BusinessIcon />,
        roles: ['owner'],
      },
    ];

    return (
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        {organization && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
            {organization.logo_url ? (
              <Box
                component="img"
                key={organization.logo_url}
                src={organization.logo_url}
                alt="Org Logo"
                sx={{
                  height: 40,
                  width: 40,
                  objectFit: 'contain',
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                }}
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
                  border: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold',
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

        <List>
          {ownerMenuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ px: 2, py: 0.25 }}>
                <ListItemButton
                  selected={active}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    py: 1.1,
                    px: 1.5,
                    borderRadius: 2,
                    backgroundColor: active ? `${primaryColor}14` : 'transparent',
                    color: active ? primaryColor : 'text.primary',
                    borderLeft: active ? `3px solid ${primaryColor}` : '3px solid transparent',
                    '&.Mui-selected': {
                      backgroundColor: `${primaryColor}14`,
                      color: primaryColor,
                      '&:hover': { backgroundColor: `${primaryColor}1e` },
                    },
                    '&:hover': { backgroundColor: active ? `${primaryColor}1e` : 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{ fontWeight: active ? 600 : 500, fontSize: '0.875rem' }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      overflow: 'auto', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.paper',
      borderRight: 1,
      borderColor: 'divider',
    }}>
        {/* Sidebar collapse toggle */}
        {onToggleCollapse && (
          <Box sx={{ py: 1.5, px: 1, display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end' }}>
            <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <IconButton
                size="small"
                onClick={onToggleCollapse}
                sx={{ color: 'text.secondary', borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' } }}
              >
                {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Search */}
        {!isCollapsed && (
          <Box sx={{ px: 2, pb: 2 }}>
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
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f6f5f3',
                  fontSize: '0.875rem',
                  '& fieldset': {
                    borderColor: 'transparent',
                  },
                  '&:hover': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.09)' : '#eeedeb',
                  },
                  '&.Mui-focused': {
                    bgcolor: 'background.paper',
                    boxShadow: `0 0 0 2px ${primaryColor}20`,
                    '& fieldset': { borderColor: primaryColor },
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 0.5 }}>
              Tip: press Ctrl+K (⌘K on Mac) to search pages, customers, and barcodes
            </Typography>
          </Box>
        )}

        {!isCollapsed && showCompactMenu && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                px: 0.5,
                mb: 0.75,
                display: 'block',
              }}
            >
              Shortcuts
            </Typography>
            <List component="nav" disablePadding>
              {primaryItems.map((item) => {
                const active = isActive(item.path);
                const btn = (
                  <ListItemButton
                    selected={active}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderRadius: 2,
                      backgroundColor: active ? `${primaryColor}14` : 'transparent',
                      color: active ? primaryColor : 'text.primary',
                      borderLeft: active ? `3px solid ${primaryColor}` : '3px solid transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box sx={{ color: 'inherit', fontSize: '20px', display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      secondary={item.subtitle}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 600 : 500, fontSize: '0.875rem' }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        sx: {
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          lineHeight: 1.25,
                          mt: 0.125,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        },
                      }}
                    />
                  </ListItemButton>
                );
                return (
                  <ListItem key={item.path} disablePadding sx={{ py: 0.25 }}>
                    {btn}
                  </ListItem>
                );
              })}
            </List>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={() => setFullMenuExpanded(true)}
              sx={{ mt: 1, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              All pages
            </Button>
          </Box>
        )}

        {!isCollapsed && fullMenuExpanded && primaryItems.length > 0 && !showCompactMenu && (
          <Box sx={{ px: 2, pb: 0.5 }}>
            <Button size="small" onClick={() => setFullMenuExpanded(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Show fewer links
            </Button>
          </Box>
        )}

        {/* Menu Sections */}
        <Box sx={{ flex: 1, overflow: 'auto', display: showCompactMenu ? 'none' : 'block' }}>
            {Object.entries(filteredSections).map(([sectionKey, section], sectionIndex) => {
              const isSectionOpen = sections[sectionKey] !== false;
              return (
              <React.Fragment key={sectionKey}>
                {/* Section Header - clickable to collapse/expand section */}
                {!isCollapsed ? (
                  <ListItem disablePadding sx={{ px: 2 }}>
                    <ListItemButton
                      onClick={() => toggleSection(sectionKey)}
                      sx={{ 
                        px: 1.5, 
                        py: 1,
                        minHeight: 32,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          flex: 1
                        }}
                      >
                        {section.title}
                      </Typography>
                      {isSectionOpen ? <ExpandLess sx={{ fontSize: 18, color: 'text.disabled' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'text.disabled' }} />}
                    </ListItemButton>
                  </ListItem>
                ) : (
                  <ListItem disablePadding>
                    <Box sx={{ px: 2, py: 0.75, width: '100%' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {section.title}
                      </Typography>
                    </Box>
                  </ListItem>
                )}
                
                {/* Section Items - collapsible when sidebar is expanded */}
                <Collapse in={isCollapsed ? true : isSectionOpen} timeout="auto" unmountOnExit={false}>
                <List component="div" disablePadding sx={{ pb: 0.5 }}>
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    const tooltipTitle = item.subtitle ? `${item.title} — ${item.subtitle}` : item.title;
                    const listItemButton = (
                      <ListItemButton
                        selected={active}
                        onClick={() => handleNavigation(item.path)}
                        sx={{
                          py: 1.1,
                          px: 1.5,
                          borderRadius: 2,
                          backgroundColor: active ? `${primaryColor}14` : 'transparent',
                          color: active ? primaryColor : 'text.primary',
                          borderLeft: active ? `3px solid ${primaryColor}` : '3px solid transparent',
                          transition: 'background-color 0.15s, color 0.15s',
                          '&:hover': {
                            backgroundColor: active ? `${primaryColor}1e` : 'action.hover',
                          },
                          '&.Mui-selected': {
                            backgroundColor: `${primaryColor}14`,
                            color: primaryColor,
                            '&:hover': {
                              backgroundColor: `${primaryColor}1e`,
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box sx={{
                            color: 'inherit',
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
                            secondary={item.subtitle}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: active ? 600 : 500,
                              fontSize: '0.875rem',
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              sx: {
                                color: 'text.secondary',
                                fontSize: '0.7rem',
                                lineHeight: 1.25,
                                mt: 0.125,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              },
                            }}
                          />
                        )}
                      </ListItemButton>
                    );
                    return (
                      <ListItem key={item.path} disablePadding sx={{ px: 2, py: 0.25 }}>
                        {isCollapsed ? (
                          <Tooltip title={tooltipTitle} placement="right">
                            <Box sx={{ width: '100%' }}>{listItemButton}</Box>
                          </Tooltip>
                        ) : (
                          listItemButton
                        )}
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
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fafaf9',
            mt: 'auto'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: `${primaryColor}20`,
                  color: primaryColor,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
                  {profile?.full_name || 'User'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
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
                  color: 'text.secondary',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: 'action.hover' }
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
