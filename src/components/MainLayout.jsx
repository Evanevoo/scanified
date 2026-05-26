import logger from '../utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useTheme as useMuiTheme, alpha } from '@mui/material/styles';
import { useTheme, resolveAccentToHex } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionsContext';
import GlobalImportProgress from './GlobalImportProgress';
import ImportNotification from './ImportNotification';
import { useOwnerAccess } from '../hooks/useOwnerAccess';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import { SearchInputWithIcon, APP_SHELL_SEARCH_INPUT_CLASSNAME } from './ui/search-input-with-icon';
import { postgrestQuotedIlikeContains } from '../utils/postgrestFilterEscape';


const drawerWidth = 280;
const collapsedWidth = 72;

export default function MainLayout({ children }) {
  const { profile, organization } = useAuth();
  const { organizationColors, accent } = useTheme();
  const { isAdmin, isManager } = usePermissions();
  const muiTheme = useMuiTheme();
  const isDarkShell = muiTheme.palette.mode === 'dark';
  const primaryColor = resolveAccentToHex(accent);
  const rolePillLabel =
    profile?.role === 'owner'
      ? 'Owner'
      : isAdmin()
        ? 'Administrator'
        : isManager()
          ? 'Manager'
          : 'Team member';
  const displayName = (profile?.full_name || profile?.email || 'User').trim();
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const navUserLine =
    nameParts.length > 1
      ? `${nameParts[0]} ${(nameParts[nameParts.length - 1][0] || '').toUpperCase()}.`
      : displayName;
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const searchRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner } = useOwnerAccess();
  const isOwnerPortal = profile?.role === 'owner' && location.pathname.startsWith('/owner-portal');

  // Top navigation — classic tab bar (pre–post-login redesign); hidden for platform owner
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
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        const ilikeOperand = postgrestQuotedIlikeContains(searchTerm);
        if (!ilikeOperand) {
          if (active) setSuggestions([]);
          return;
        }
        // For regular users: only show data from their organization
        // Customers: by name or ID (filtered by organization)
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('CustomerListID, name, phone')
          .eq('organization_id', organization.id)
          .or(`CustomerListID.ilike.${ilikeOperand},name.ilike.${ilikeOperand}`)
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
          .or(`serial_number.ilike.${ilikeOperand},barcode_number.ilike.${ilikeOperand},product_code.ilike.${ilikeOperand}`)
          .limit(5);
        
        if (bottleError) {
          logger.error('Error fetching bottles for search:', bottleError);
        }
        
        // SECURITY CHECK: Double-verify all bottles belong to current organization
        const verifiedBottles = (bottles || []).filter(b => b.organization_id === organization.id);
        
        const seenCustomerSuggestionKeys = new Set();
        const customerResults = (customers || []).reduce((acc, c) => {
          const customerName = (c.name || '').trim();
          const customerListId = (c.CustomerListID || '').trim();
          const dedupeKey = `${customerName.toLowerCase()}::${customerListId.toLowerCase()}`;

          if (seenCustomerSuggestionKeys.has(dedupeKey)) {
            return acc;
          }

          seenCustomerSuggestionKeys.add(dedupeKey);
          acc.push({
            type: 'customer',
            id: c.CustomerListID,
            label: c.name,
            sub: c.CustomerListID,
          });
          return acc;
        }, []);
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

  const isTopNavActive = (to) => {
    const path = location.pathname;
    if (to === '/home') return path === '/home';
    if (to === '/inventory') return path.startsWith('/inventory') || path.startsWith('/assets');
    if (to === '/import-approvals') return path.startsWith('/import-approval');
    if (to === '/rentals') return path.startsWith('/rentals') || path.startsWith('/subscriptions');
    return path === to || path.startsWith(`${to}/`);
  };

  const handleLogout = async () => {
    logger.log('MainLayout: Logout button clicked');
    setLogoutLoading(true);
    
    try {
      // Clear storage but keep org-scoped invoice templates (otherwise logout wipes Settings
      // → Email Message Template and PDF branding stored in localStorage).
      const preservedLocal = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (
          key
          && (key.startsWith('invoiceEmailTemplate_') || key.startsWith('invoiceTemplate_'))
        ) {
          preservedLocal.push([key, localStorage.getItem(key)]);
        }
      }
      localStorage.clear();
      preservedLocal.forEach(([key, val]) => {
        if (val != null) localStorage.setItem(key, val);
      });
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
      background: isDarkShell
        ? `linear-gradient(145deg, ${muiTheme.palette.background.default} 0%, ${alpha(muiTheme.palette.background.paper, 0.95)} 48%, ${muiTheme.palette.background.default} 100%)`
        : muiTheme.palette?.background?.default
          ? `linear-gradient(145deg, ${muiTheme.palette.background.default} 0%, #f4f2ff 45%, #faf8ff 100%)`
          : 'linear-gradient(145deg, #f0f2f7 0%, #f4f2ff 38%, #faf8ff 72%, #fff5f8 100%)',
      overflow: 'hidden',
      // Tablet-specific optimizations
      '@media (min-width: 768px) and (max-width: 1024px)': {
        '& .MuiDrawer-paper': {
          width: sidebarCollapsed ? collapsedWidth : Math.min(drawerWidth, 240), // Reduce sidebar width on tablet
        }
      }
    }}>
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
          bgcolor: isDarkShell ? alpha(muiTheme.palette.background.paper, 0.88) : 'rgba(255,255,255,0.68)',
          backdropFilter: 'blur(14px)',
          color: 'text.primary',
          boxShadow: isDarkShell ? '0 8px 28px rgba(0,0,0,0.45)' : '0 8px 24px rgba(99,102,241,0.08)',
          borderBottom: isDarkShell ? `1px solid ${alpha('#fff', 0.1)}` : '1px solid rgba(255,255,255,0.8)',
          minHeight: 64,
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'transparent', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Box
              sx={{
                height: 40,
                width: 40,
                borderRadius: '8px',
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
                position: 'relative',
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
                    borderRadius: 8,
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                organization?.name?.charAt(0)?.toUpperCase() || 'W'
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '18px', display: { xs: 'none', sm: 'block' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {organization?.name || 'WeldCor'}
              </Typography>
              {!isOwnerPortal && (
                <Chip
                  label={rolePillLabel}
                  size="small"
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    fontSize: '0.62rem',
                    height: 26,
                    borderRadius: '8px',
                    bgcolor: isDarkShell ? alpha('#fff', 0.08) : 'rgba(139, 123, 168, 0.14)',
                    color: isDarkShell ? 'text.secondary' : '#57496f',
                    border: isDarkShell ? `1px solid ${alpha('#fff', 0.14)}` : '1px solid rgba(139, 123, 168, 0.32)',
                  }}
                />
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flex: 1,
              minWidth: 0,
              justifyContent: 'flex-end',
            }}
          >
            {topNavLinks.length > 0 && (
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  gap: 0,
                  flexShrink: 0,
                }}
              >
                {topNavLinks.map((link) => {
                  const active = isTopNavActive(link.to);
                  return (
                  <Button
                    key={link.label}
                    onClick={() => navigate(link.to)}
                    sx={{
                      color: active ? primaryColor : 'text.primary',
                      fontWeight: active ? 700 : 500,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      px: 2,
                      py: 0,
                      minHeight: 40,
                      borderRadius: '8px',
                      borderBottom: 'none',
                      backgroundColor: active
                        ? (isDarkShell ? alpha('#fff', 0.12) : 'rgba(255,255,255,0.95)')
                        : 'transparent',
                      boxShadow: active
                        ? (isDarkShell ? '0 8px 20px rgba(0,0,0,0.35)' : '0 8px 18px rgba(99,102,241,0.12)')
                        : 'none',
                      transition: 'all 0.2s',
                      '&:hover': {
                        color: primaryColor,
                        bgcolor: isDarkShell ? alpha('#fff', 0.08) : 'rgba(255,255,255,0.9)',
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                );
                })}
              </Box>
            )}

            <Box
              sx={{
                flex: '1 1 0%',
                minWidth: 0,
                maxWidth: { xs: 'none', sm: 460, md: 560, lg: 720 },
                position: 'relative',
              }}
              ref={searchRef}
            >
              <SearchInputWithIcon
                placeholder="Search customers & assets — or press Ctrl+K for pages"
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
                className={APP_SHELL_SEARCH_INPUT_CLASSNAME}
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
                    borderRadius: '12px',
                    border: isDarkShell ? `1px solid ${alpha('#fff', 0.12)}` : '1px solid rgba(255,255,255,0.78)',
                    bgcolor: isDarkShell ? alpha(muiTheme.palette.background.paper, 0.97) : 'rgba(255,255,255,0.76)',
                    backdropFilter: 'blur(14px)',
                    boxShadow: isDarkShell ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 34px rgba(99,102,241,0.15)',
                  }}
                  elevation={isDarkShell ? 8 : 3}
                >
                  <List dense>
                    {suggestions.map((suggestion, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemButton
                          onClick={() => handleSelectSuggestion(suggestion)}
                          sx={{
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {suggestion.label}
                              </Typography>
                            }
                            secondary={
                              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
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

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexShrink: 0,
              }}
            >
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', alignItems: 'flex-end', mr: 0.25, pr: 0.25 }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', color: 'text.secondary', lineHeight: 1.15 }}>
                {navUserLine.toUpperCase()}
              </Typography>
            </Box>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                display: { xs: 'none', sm: 'flex' },
                fontWeight: 800,
                bgcolor: primaryColor,
                fontSize: '0.85rem',
                boxShadow: '0 6px 16px rgba(64,181,173,0.28)',
              }}
              alt={displayName}
            >
              {nameParts.length
                ? nameParts.map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : '?'}
            </Avatar>
            <IconButton sx={{ color: 'text.primary', width: 40, height: 40, flexShrink: 0, bgcolor: isDarkShell ? alpha('#fff', 0.08) : 'rgba(255,255,255,0.72)', border: isDarkShell ? `1px solid ${alpha('#fff', 0.12)}` : '1px solid rgba(255,255,255,0.8)', '&:hover': { bgcolor: isDarkShell ? alpha('#fff', 0.14) : 'rgba(255,255,255,0.92)' } }} aria-label="Notifications">
              <NotificationsIcon />
            </IconButton>
            <IconButton sx={{ color: 'text.primary', width: 40, height: 40, flexShrink: 0, bgcolor: isDarkShell ? alpha('#fff', 0.08) : 'rgba(255,255,255,0.72)', border: isDarkShell ? `1px solid ${alpha('#fff', 0.12)}` : '1px solid rgba(255,255,255,0.8)', '&:hover': { bgcolor: isDarkShell ? alpha('#fff', 0.14) : 'rgba(255,255,255,0.92)' } }} onClick={() => navigate('/settings')} aria-label="Settings">
              <SettingsIcon />
            </IconButton>
            <Button
              onClick={handleLogout}
              startIcon={<LogoutIcon fontSize="small" />}
              disabled={logoutLoading}
              sx={{
                textTransform: 'none',
                display: { xs: 'none', sm: 'inline-flex' },
                fontWeight: 600,
                color: 'text.primary',
                minHeight: 40,
                py: 0.5,
                borderRadius: '8px',
                bgcolor: isDarkShell ? alpha('#fff', 0.08) : 'rgba(255,255,255,0.72)',
                border: isDarkShell ? `1px solid ${alpha('#fff', 0.12)}` : '1px solid rgba(255,255,255,0.8)',
                '&:hover': { bgcolor: isDarkShell ? alpha('#fff', 0.14) : 'rgba(255,255,255,0.92)' },
              }}
            >
              {logoutLoading ? 'Signing out...' : 'Sign out'}
            </Button>
            </Box>
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
          '@media (min-width: 768px) and (max-width: 1024px)': {
            width: isOwnerPortal ? '100vw' : `calc(100vw - ${sidebarCollapsed ? collapsedWidth : 240}px)`,
            p: 2,
          }
        }}
      >
        <Toolbar sx={{ minHeight: 64 }} />
        <Box sx={{
          flex: 1,
          width: '100%',
          bgcolor: isDarkShell ? alpha(muiTheme.palette.background.paper, 0.55) : 'rgba(255,255,255,0.38)',
          p: { xs: 2, sm: 2.5, md: 3 },
          borderRadius: 12,
          border: isDarkShell ? `1px solid ${alpha('#fff', 0.1)}` : '1px solid rgba(255,255,255,0.85)',
          boxShadow: isDarkShell
            ? '0 20px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 20px 50px rgba(99,102,241,0.11), inset 0 1px 0 rgba(255,255,255,0.9)',
          backdropFilter: 'blur(16px)',
          backgroundImage: isDarkShell
            ? `linear-gradient(165deg, ${alpha(muiTheme.palette.background.paper, 0.85)} 0%, ${alpha(muiTheme.palette.background.default, 0.9)} 50%, ${alpha(muiTheme.palette.background.paper, 0.75)} 100%)`
            : 'linear-gradient(165deg, rgba(255,255,255,0.72) 0%, rgba(252,251,255,0.45) 45%, rgba(255,250,252,0.35) 100%)',
          minHeight: 'calc(100vh - 64px)',
          overflow: 'auto',
        }}>
          {children || <Outlet />}
        </Box>
        <GlobalImportProgress />
        <ImportNotification />
        <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      </Box>
    </Box>
  );
} 