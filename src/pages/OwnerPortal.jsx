import React, { useState, useEffect } from 'react';
import {
  Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, 
  ListItemText, IconButton, Card, CardContent, Grid, Button, Chip,
  Avatar, Menu, MenuItem, Divider, Badge, Tooltip, Tabs, Tab
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Email as EmailIcon,
  Support as SupportIcon,
  Business as BusinessIcon,
  ExitToApp as ExitToAppIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PriceCheck as PriceCheckIcon,
  Build as BuildIcon,
  Article as ArticleIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import { useNavigate, Routes, Route, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOwnerAccess } from '../hooks/useOwnerAccess';
import OwnerDashboard from './OwnerDashboard';
import OwnerAnalytics from './OwnerAnalytics';
import OwnerTools from './OwnerTools';
import OwnerPortalLanding from './OwnerPortalLanding';
import NotificationCenter from '../components/NotificationCenter';
import { supabase } from '../supabase/client';
import PlanManagement from './OwnerPortal/PlanManagement';
import PageBuilder from './OwnerPortal/PageBuilder';
import RoleManagement from './OwnerPortal/RoleManagement';

const drawerWidth = 280;

function TabPanel(props) {
export default function OwnerPortal() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [quickStats, setQuickStats] = useState({});
  const [systemStatus, setSystemStatus] = useState({});

  useEffect(() => {
    loadQuickStats();
    checkSystemStatus();
  }, []);

  const loadQuickStats = async () => {
    try {
      const { data: organizations } = await supabase
        .from('organizations')
        .select('*');

      if (organizations) {
        const active = organizations.filter(org => org.subscription_status === 'active').length;
        const trial = organizations.filter(org => org.subscription_status === 'trial').length;
        const cancelled = organizations.filter(org => org.subscription_status === 'cancelled').length;

        setQuickStats({
          total: organizations.length,
          active,
          trial,
          cancelled,
          revenue: active * 99 // Rough estimate
        });
      }
    } catch (err) {
      console.error('Error loading quick stats:', err);
    }
  };

  const checkSystemStatus = async () => {
    try {
      // Simple health check
      const { data } = await supabase.from('organizations').select('count', { count: 'exact', head: true });
      
      setSystemStatus({
        database: data !== null ? 'healthy' : 'error',
        lastChecked: new Date().toISOString()
      });
    } catch (err) {
      setSystemStatus({
        database: 'error',
        lastChecked: new Date().toISOString()
      });
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/owner-portal' },
    { text: 'Customer Management', icon: <PeopleIcon />, path: '/owner-portal/customers' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/owner-portal/analytics' },
    { text: 'Plan Management', icon: <PriceCheckIcon />, path: '/owner-portal/plan-management' },
    { text: 'Page Builder', icon: <ArticleIcon />, path: '/owner-portal/page-builder' },
    { text: 'Role Management', icon: <VpnKeyIcon />, path: '/owner-portal/role-management' },
    { text: 'Tools & Operations', icon: <SettingsIcon />, path: '/owner-portal/tools' },
    { text: 'Support Center', icon: <SupportIcon />, path: '/owner-portal/support' },
    { text: 'System Health', icon: <CheckCircleIcon />, path: '/owner-portal/health' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <ErrorIcon color="error" />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <BusinessIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Owner Portal
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationCenter />
            
            <Tooltip title="Access Main Website">
              <Button
                color="inherit"
                startIcon={<ExitToAppIcon />}
                onClick={() => window.open('/home', '_blank')}
                sx={{ mr: 1 }}
              >
                Main Site
              </Button>
            </Tooltip>

            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem>
          <Typography variant="body2">
            Signed in as: {user?.email}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>
          <ExitToAppIcon sx={{ mr: 1 }} />
          Sign Out
        </MenuItem>
      </Menu>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            marginTop: '64px'
          },
        }}
      >
        <Box sx={{ overflow: 'auto', p: 2 }}>
          {/* Quick Stats */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="h4" color="primary">
                    {quickStats.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Customers
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4" color="success.main">
                    {quickStats.active || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4" color="warning.main">
                    {quickStats.trial || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Trial
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4" color="error.main">
                    {quickStats.cancelled || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cancelled
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {getStatusIcon(systemStatus.database)}
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2">Database</Typography>
                  <Chip 
                    label={systemStatus.database || 'checking'} 
                    color={getStatusColor(systemStatus.database)}
                    size="small"
                  />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Last checked: {systemStatus.lastChecked ? new Date(systemStatus.lastChecked).toLocaleTimeString() : 'Never'}
              </Typography>
            </CardContent>
          </Card>

          {/* Navigation */}
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {/* Quick Actions */}
          <Typography variant="subtitle2" gutterBottom>
            Quick Actions
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EmailIcon />}
            fullWidth
            sx={{ mb: 1 }}
            onClick={() => navigate('/owner-portal/tools')}
          >
            Send Bulk Email
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TrendingUpIcon />}
            fullWidth
            onClick={() => navigate('/owner-portal/analytics')}
          >
            View Analytics
          </Button>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: '64px' }}>
        <Routes>
          <Route path="/" element={<OwnerPortalLanding />} />
          <Route path="/customers" element={<OwnerDashboard />} />
          <Route path="/analytics" element={<OwnerAnalytics />} />
          <Route path="/plan-management" element={<PlanManagement />} />
          <Route path="/page-builder" element={<PageBuilder />} />
          <Route path="/role-management" element={<RoleManagement />} />
          <Route path="/tools" element={<OwnerTools />} />
          <Route path="/support" element={<SupportCenter />} />
          <Route path="/health" element={<SystemHealth />} />
        </Routes>
      </Box>
    </Box>
  );
}

// Placeholder components for additional pages
function SupportCenter() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Support Center
      </Typography>
      <Typography variant="body1">
        Customer support tools and ticket management coming soon...
      </Typography>
    </Box>
  );
}

function SystemHealth() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Health
      </Typography>
      <Typography variant="body1">
        Detailed system monitoring and health checks coming soon...
      </Typography>
    </Box>
  );
} 