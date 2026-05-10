import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase/client';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  IconButton,
  Tooltip,
  Stack,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  People,
  Inventory,
  Receipt,
  Analytics,
  AdminPanelSettings,
  Settings,
  Schedule,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  ChevronRight,
  QrCodeScanner,
} from '@mui/icons-material';
import { commonStyles, brandColors } from '../styles/theme';

const glassSurface = {
  ...commonStyles.card,
  borderRadius: 24,
};

const QUICK_ACTION_PALETTE = {
  primary:   { base: brandColors.primary,   accent: '#2E9B94' },
  secondary: { base: brandColors.secondary, accent: '#6F60A0' },
  info:      { base: brandColors.info,      accent: '#2563EB' },
  success:   { base: brandColors.success,   accent: '#0E9F6E' },
  warning:   { base: brandColors.warning,   accent: '#D97706' },
  error:     { base: brandColors.error,     accent: '#DC2626' },
};

const getQuickActionPalette = (color) =>
  QUICK_ACTION_PALETTE[color] || QUICK_ACTION_PALETTE.primary;

export default function Home() {
  const { profile, organization } = useAuth();
  const { isAdmin, isManager } = usePermissions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';
  const secondaryPurple = '#8B7BA8';
  const navigate = useNavigate();

  const subCtx = useSubscriptions();

  const [stats, setStats] = useState({
    customers: 0,
    activeRentals: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const statsLoadedForOrgRef = useRef(null);

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }
      const orgKey = organization.id;
      const showFullPageLoader = statsLoadedForOrgRef.current !== orgKey;
      if (showFullPageLoader) setLoading(true);

      const [customersRes, bottlesRes, rentalsRes, activeSubsRes, usersRes] = await Promise.allSettled([
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
        supabase.from('bottles').select('assigned_customer, customer_id:customer_uuid, customer_name').eq('organization_id', organization.id),
        supabase
          .from('rentals')
          .select('customer_id, customer_name')
          .eq('organization_id', organization.id)
          .is('rental_end_date', null),
        Promise.resolve({ count: (subCtx.activeSubscriptions || []).length }),
        isAdmin()
          ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id)
          : Promise.resolve({ count: 0 }),
      ]);

      if (!active) return;

      const ctxBottleCustomerIds = new Set(
        (subCtx.bottles || []).map((b) => b.assigned_customer || b.customer_id || b.customer_name).filter(Boolean)
      );
      const bottleCustomerIds = new Set(
        (bottlesRes.status === 'fulfilled' ? (bottlesRes.value.data || []) : [])
          .map((b) => b.assigned_customer || b.customer_id || b.customer_name)
          .filter(Boolean)
      );
      const rentalCustomerIds = new Set(
        (rentalsRes.status === 'fulfilled' ? (rentalsRes.value.data || []) : [])
          .map((r) => r.customer_id || r.customer_name)
          .filter(Boolean)
      );

      const customersCountFromDb = customersRes.status === 'fulfilled' ? (customersRes.value.count || 0) : 0;
      const activeSubsCountFromDb = activeSubsRes.status === 'fulfilled' ? (activeSubsRes.value.count || 0) : 0;
      const totalUsers = usersRes.status === 'fulfilled' ? (usersRes.value.count || 0) : 0;

      setStats({
        customers: Math.max(customersCountFromDb, bottleCustomerIds.size, rentalCustomerIds.size, (subCtx.customers || []).length, ctxBottleCustomerIds.size),
        activeRentals: Math.max(activeSubsCountFromDb, bottleCustomerIds.size, rentalCustomerIds.size, (subCtx.activeSubscriptions || []).length),
        totalUsers,
      });
      if (showFullPageLoader) {
        statsLoadedForOrgRef.current = orgKey;
        setLoading(false);
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, [organization?.id, subCtx.customers.length, subCtx.activeSubscriptions.length, subCtx.bottles.length]);

  const getQuickActions = () => {
    if (isAdmin()) {
      return [
        { title: 'Add New Customer', path: '/customers', icon: <AddIcon />, color: 'primary' },
        { title: 'User Management', path: '/settings?tab=team', icon: <AdminPanelSettings />, color: 'secondary' },
        { title: 'View Analytics', path: '/analytics', icon: <Analytics />, color: 'info' },
        { title: 'Organization Settings', path: '/settings', icon: <Settings />, color: 'warning' },
        { title: 'Rentals & invoices', path: '/rentals', icon: <Receipt />, color: 'success' },
        { title: 'Organization Tools', path: '/organization-tools', icon: <SecurityIcon />, color: 'error' },
      ];
    }
    if (isManager()) {
      return [
        { title: 'Add New Customer', path: '/customers', icon: <AddIcon />, color: 'primary' },
        { title: 'View Reports', path: '/reports', icon: <Analytics />, color: 'info' },
        { title: 'Organization Tools', path: '/organization-tools', icon: <SecurityIcon />, color: 'error' },
      ];
    }
    return [
      { title: 'View Customers', path: '/customers', icon: <People />, color: 'primary' },
      { title: 'Check Inventory', path: '/inventory', icon: <Inventory />, color: 'secondary' },
      { title: 'Rentals', path: '/rentals', icon: <Schedule />, color: 'success' },
      { title: 'Rentals & invoices', path: '/rentals', icon: <Receipt />, color: 'warning' },
      { title: 'Customer Portal', path: '/portal', icon: <DashboardIcon />, color: 'error' },
    ];
  };

  const getWelcomeMessage = () => {
    if (isAdmin()) {
      return {
        title: `Welcome back, ${profile?.full_name || 'Administrator'}!`,
        subtitle: 'You have full administrative access to manage your organization.',
        chip: { label: 'Administrator', color: 'primary' },
      };
    }
    if (isManager()) {
      return {
        title: `Welcome back, ${profile?.full_name || 'Manager'}!`,
        subtitle: "Manage your team's operations and advanced features.",
        chip: { label: 'Manager', color: 'secondary' },
      };
    }
    return {
      title: `Welcome back, ${profile?.full_name || 'User'}!`,
      subtitle: 'Access your daily operations and customer information.',
      chip: { label: 'Team Member', color: 'default' },
    };
  };

  const getStatCards = () => {
    const baseCards = [
      {
        title: 'Customers',
        value: stats.customers,
        icon: <People />,
        color: primaryColor,
        onClick: () => navigate('/customers'),
      },
      {
        title: 'Active Rentals',
        value: stats.activeRentals,
        icon: <Schedule />,
        color: primaryColor,
        onClick: () => navigate('/rentals'),
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

  const displayName = (profile?.full_name || profile?.email || 'User').trim();
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const avatarLetters = nameParts.length ? nameParts.map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  const rentalLinkRate = stats.customers > 0 ? Math.min(100, Math.round((stats.activeRentals / stats.customers) * 100)) : 0;

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress sx={{ borderRadius: 999, height: 6 }} />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading dashboard…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, backgroundColor: 'transparent', minHeight: '100%' }}>
      <Card elevation={0} sx={{ ...glassSurface, p: { xs: 2.5, sm: 3 }, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Avatar
                sx={{
                  width: { xs: 64, sm: 76 },
                  height: { xs: 64, sm: 76 },
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  bgcolor: primaryColor,
                  boxShadow: `0 12px 28px ${primaryColor}55`,
                }}
                alt={displayName}
              >
                {avatarLetters}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  {roleLabel}
                  {organization?.name ? ` · ${organization.name}` : ''}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mt: 0.5, fontSize: { xs: '1.45rem', sm: '1.85rem' } }}>
                  {welcomeMessage.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, maxWidth: 520 }}>
                  {welcomeMessage.subtitle}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
                  Key numbers are in the summary cards below—tap a card to open that area.
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box
              sx={{
                borderRadius: 22,
                p: 2.5,
                background: 'linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(244,242,255,0.85) 100%)',
                border: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 12px 32px rgba(99,102,241,0.08)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.07em', color: 'text.secondary' }}>
                RENTAL COVERAGE
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 0.5, lineHeight: 1.45 }}>
                Active rental balances as a share of customers on file (not a billing rate). Details: use the cards below.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', py: 1.5 }}>
                <CircularProgress
                  variant="determinate"
                  value={rentalLinkRate}
                  size={132}
                  thickness={3.2}
                  sx={{
                    color: primaryColor,
                    '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                    filter: 'drop-shadow(0 0 12px rgba(64,181,173,0.35))',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1 }}>
                    {rentalLinkRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
                    rental / customer
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Tooltip title="Refresh dashboard">
            <IconButton
              onClick={() => subCtx.refresh()}
              sx={{
                borderRadius: 3,
                width: 44,
                height: 44,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                bgcolor: 'rgba(255,255,255,0.85)',
                '&:hover': { bgcolor: '#fff' },
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
              borderRadius: 999,
              px: 2.75,
              py: 1.25,
              textTransform: 'none',
              fontWeight: 800,
              background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryPurple} 100%)`,
              boxShadow: '0 12px 28px rgba(99,102,241,0.22)',
              '&:hover': {
                background: `linear-gradient(90deg, #2E9B94 0%, #6B5A87 100%)`,
                boxShadow: '0 14px 32px rgba(99,102,241,0.28)',
              },
            }}
          >
            Add customer
          </Button>
        </Stack>
      </Card>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            onClick={() => navigate('/inventory')}
            sx={{
              ...glassSurface,
              height: '100%',
              cursor: 'pointer',
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 200,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
                  Inventory spotlight
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>
                  Cylinders & assets
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 360 }}>
                  Review balances, locations, and serials in one place—optimized for floor scanning workflows.
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  bgcolor: `${primaryColor}18`,
                  color: primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Inventory />
              </Box>
            </Stack>
            <Button
              endIcon={<ChevronRight />}
              sx={{ alignSelf: 'flex-start', mt: 2, textTransform: 'none', fontWeight: 700, color: primaryColor }}
            >
              Open inventory
            </Button>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 24,
              minHeight: 200,
              p: 2.75,
              cursor: 'pointer',
              color: '#fff',
              background: `linear-gradient(135deg, ${secondaryPurple} 0%, #c084fc 38%, ${primaryColor} 100%)`,
              boxShadow: '0 20px 50px rgba(139,123,168,0.35)',
              border: '1px solid rgba(255,255,255,0.25)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 24px 56px rgba(139,123,168,0.42)',
              },
            }}
            onClick={() => navigate('/rentals/customer-history')}
          >
            <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.1em', opacity: 0.92 }}>
                  History
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                  Review the latest cylinder history
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.95, maxWidth: 400 }}>
                  Jump into the recent cylinder history to see movement and status changes at a glance.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Inventory />}
                sx={{
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 800,
                  px: 2.5,
                  bgcolor: 'rgba(255,255,255,0.98)',
                  color: secondaryPurple,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                  '&:hover': { bgcolor: '#fff' },
                }}
              >
                View history
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.slice(0, 4).map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              onClick={card.onClick}
              elevation={0}
              sx={{
                ...glassSurface,
                height: '100%',
                cursor: 'pointer',
              }}
            >
              <CardContent sx={{ p: 2.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    {card.title}
                  </Typography>
                  <Box
                    sx={{
                      color: '#fff',
                      bgcolor: card.color || primaryColor,
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 8px 18px ${(card.color || primaryColor)}55`,
                      '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em', fontSize: '1.85rem' }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <Card
            elevation={0}
            sx={{ ...glassSurface, p: 2.5, cursor: 'pointer', height: '100%' }}
            onClick={() => navigate('/import-approvals')}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
                  Orders & imports
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                  Review pending approvals
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Stay on top of file imports and approvals in one place.
                </Typography>
              </Box>
              <Chip label="Go" size="small" sx={{ fontWeight: 800, bgcolor: 'rgba(16,185,129,0.16)', color: '#059669' }} />
            </Stack>
            <Button endIcon={<ChevronRight />} sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}>
              View import approvals
            </Button>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ ...glassSurface, p: { xs: 2.25, sm: 2.75 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
                  Quick actions
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Jump straight into the things you do most.
                </Typography>
              </Box>
              <Chip
                label={`${quickActions.length} shortcut${quickActions.length === 1 ? '' : 's'}`}
                size="small"
                sx={{
                  borderRadius: 999,
                  fontWeight: 700,
                  bgcolor: 'rgba(99,102,241,0.10)',
                  color: '#4338CA',
                }}
              />
            </Stack>
            <Grid container spacing={1.5}>
              {quickActions.map((action) => {
                const palette = getQuickActionPalette(action.color);
                return (
                  <Grid item xs={12} sm={6} key={action.title}>
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        logger.log('Quick action clicked:', action.title, action.path);
                        navigate(action.path);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(action.path);
                        }
                      }}
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 1.75,
                        py: 1.5,
                        borderRadius: 18,
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: `linear-gradient(140deg, rgba(255,255,255,0.92) 0%, ${palette.base}10 100%)`,
                        border: `1px solid ${palette.base}33`,
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          background: `linear-gradient(140deg, rgba(255,255,255,0.98) 0%, ${palette.base}1F 100%)`,
                          borderColor: `${palette.base}66`,
                          boxShadow: `0 14px 28px ${palette.base}22`,
                        },
                        '&:focus-visible': {
                          outline: 'none',
                          boxShadow: `0 0 0 3px ${palette.base}55`,
                        },
                        '&:active': {
                          transform: 'translateY(-1px) scale(0.995)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          flexShrink: 0,
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: palette.accent,
                          background: `linear-gradient(140deg, ${palette.base}26 0%, ${palette.base}3D 100%)`,
                          border: `1px solid ${palette.base}33`,
                          '& svg': { fontSize: 22 },
                        }}
                      >
                        {action.icon}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            color: '#1F2937',
                            lineHeight: 1.2,
                          }}
                          noWrap
                        >
                          {action.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.01em' }}
                        >
                          Open
                        </Typography>
                      </Box>
                      <ChevronRight
                        sx={{
                          color: palette.accent,
                          opacity: 0.85,
                          transition: 'transform 0.18s ease',
                          'div[role="button"]:hover &': { transform: 'translateX(2px)' },
                        }}
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
