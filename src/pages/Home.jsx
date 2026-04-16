import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { fetchWorkspaceFilteredRentals } from '../services/rentalWorkspaceMerge';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Button,
  LinearProgress, IconButton, Tooltip,
  Paper, Stack
} from '@mui/material';
import {
  People, Inventory, Receipt, Analytics,
  AdminPanelSettings, Settings,
  Schedule, Add as AddIcon,
  Refresh as RefreshIcon, Dashboard as DashboardIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

export default function Home() {
  const { profile, organization } = useAuth();
  const { isAdmin, isManager } = usePermissions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    customers: 0,
    cylinders: 0,
    activeRentals: 0,
    pendingDeliveries: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && organization) {
      fetchDashboardData();
    }
  }, [profile, organization]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Core statistics - available to all users
      const [customersRes, cylindersRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('bottles').select('id', { count: 'exact' }).eq('organization_id', organization.id)
      ]);

      // Same merged rental rows as /rentals (monthly + yearly lines, ghost rows dropped) — not bottle status alone
      let activeRentalsCount = 0;
      try {
        const { filteredRentals } = await fetchWorkspaceFilteredRentals(organization.id);
        activeRentalsCount = filteredRentals.length;
        logger.log('Dashboard active rentals (workspace lines, matches Rentals):', { activeRentalsCount });
      } catch (error) {
        logger.error('Error calculating active rentals:', error);
        activeRentalsCount = 0;
      }

      const newStats = {
        customers: customersRes.count || 0,
        cylinders: cylindersRes.count || 0,
        activeRentals: activeRentalsCount,
        totalUsers: 0,
      };

      // Admin-only statistics
      if (isAdmin()) {
        const usersRes = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id);
        newStats.totalUsers = usersRes.count || 0;
      }

      setStats(newStats);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = () => {
    if (isAdmin()) {
      return [
        { title: 'Add New Customer', path: '/customers', icon: <AddIcon />, color: 'primary' },
        { title: 'User Management', path: '/settings?tab=team', icon: <AdminPanelSettings />, color: 'secondary' },
        { title: 'View Analytics', path: '/analytics', icon: <Analytics />, color: 'info' },
        { title: 'Organization Settings', path: '/settings', icon: <Settings />, color: 'warning' },
        { title: 'Billing Management', path: '/billing', icon: <Receipt />, color: 'success' },
        { title: 'Organization Tools', path: '/organization-tools', icon: <SecurityIcon />, color: 'error' }
      ];
    } else if (isManager()) {
      return [
        { title: 'Add New Customer', path: '/customers', icon: <AddIcon />, color: 'primary' },
        { title: 'View Reports', path: '/reports', icon: <Analytics />, color: 'info' },
        { title: 'Organization Tools', path: '/organization-tools', icon: <SecurityIcon />, color: 'error' }
      ];
    } else {
      return [
        { title: 'View Customers', path: '/customers', icon: <People />, color: 'primary' },
        { title: 'Check Inventory', path: '/inventory', icon: <Inventory />, color: 'secondary' },
        { title: 'View Rentals', path: '/rentals', icon: <Schedule />, color: 'success' },
        { title: 'View Invoices', path: '/billing', icon: <Receipt />, color: 'warning' },
        { title: 'Customer Portal', path: '/portal', icon: <DashboardIcon />, color: 'error' }
      ];
    }
  };

  const getWelcomeMessage = () => {
    if (isAdmin()) {
      return {
        title: `Welcome back, ${profile?.full_name || 'Administrator'}!`,
        subtitle: 'You have full administrative access to manage your organization.',
        chip: { label: 'Administrator', color: 'primary' }
      };
    } else if (isManager()) {
      return {
        title: `Welcome back, ${profile?.full_name || 'Manager'}!`,
        subtitle: 'Manage your team\'s operations and advanced features.',
        chip: { label: 'Manager', color: 'secondary' }
      };
    } else {
      return {
        title: `Welcome back, ${profile?.full_name || 'User'}!`,
        subtitle: 'Access your daily operations and customer information.',
        chip: { label: 'Team Member', color: 'default' }
      };
    }
  };

  const getStatCards = () => {
    const baseCards = [
      { 
        title: 'Customers', 
        value: stats.customers, 
        icon: <People />, 
        color: primaryColor,
        onClick: () => {
          logger.log('🔄 Navigating to /customers');
          navigate('/customers');
        }
      },
      { 
        title: 'Cylinders', 
        value: stats.cylinders, 
        icon: <Inventory />, 
        color: primaryColor,
        onClick: () => {
          logger.log('🔄 Navigating to /inventory');
          navigate('/inventory');
        }
      },
      { 
        title: 'Active Rentals', 
        value: stats.activeRentals, 
        icon: <Schedule />, 
        color: primaryColor,
        onClick: () => {
          logger.log('🔄 Navigating to /rentals');
          navigate('/rentals');
        }
      },
    ];

    if (isAdmin()) {
      baseCards.push({
        title: 'Total Users',
        value: stats.totalUsers,
        icon: <AdminPanelSettings />,
        color: primaryColor,
        onClick: () => {
          logger.log('🔄 Navigating to Settings Team tab');
          navigate('/settings?tab=team');
        },
      });
    }

    return baseCards;
  };

  const welcomeMessage = getWelcomeMessage();
  const quickActions = getQuickActions();
  const statCards = getStatCards();
  const roleLabel = isAdmin() ? 'Administrator' : isManager() ? 'Manager' : 'Team Member';

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
        <Typography variant="body2" sx={{ mt: 2, color: '#6b7280' }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, backgroundColor: 'transparent', minHeight: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.25, sm: 2.75 },
          mb: 3.5,
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {roleLabel} {organization?.name ? `· ${organization.name}` : ''}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '1.6rem', sm: '2rem' }, letterSpacing: '-0.03em' }}>
              {welcomeMessage.title}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Tooltip title="Refresh dashboard">
              <IconButton
                onClick={fetchDashboardData}
                sx={{
                  borderRadius: 2,
                  width: 44,
                  height: 44,
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  backgroundColor: '#fff',
                  '&:hover': { backgroundColor: '#f8fafc' },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/customers')}
              sx={{
                borderRadius: 2.5,
                px: 2,
                py: 1.15,
                textTransform: 'none',
                fontWeight: 700,
                backgroundColor: primaryColor,
                boxShadow: 'none',
                '&:hover': { backgroundColor: primaryColor, opacity: 0.92, boxShadow: 'none' },
              }}
            >
              Add customer
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        {statCards.slice(0, 4).map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              onClick={card.onClick}
              elevation={0}
              sx={{ 
                height: '100%', 
                backgroundColor: '#fff',
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.06)',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              <CardContent sx={{ p: 2.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {card.title}
                  </Typography>
                  <Box 
                    sx={{ 
                      color: '#fff',
                      backgroundColor: card.color || primaryColor,
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '1.75rem', letterSpacing: '-0.02em' }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
              Quick actions
            </Typography>
          </Box>
        </Stack>
        <Grid container spacing={1.5}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Button
                fullWidth
                variant="outlined"
                color={action.color}
                startIcon={action.icon}
                onClick={(e) => {
                  e.stopPropagation();
                  logger.log('Quick action clicked:', action.title, action.path);
                  navigate(action.path);
                }}
                sx={{
                  justifyContent: 'flex-start',
                  minHeight: 44,
                  py: 1.25,
                  px: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.15s, border-color 0.15s',
                  backgroundColor: '#fcfcfd',
                  '&:hover': {
                    borderWidth: '1.5px',
                    backgroundColor: '#fff',
                  },
                }}
              >
                {action.title}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Box>
  );
} 