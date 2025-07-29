import React from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions, Button,
  Chip, Avatar, Divider, Alert
} from '@mui/material';
import {
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Support as SupportIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  HealthAndSafety as HealthIcon,
  AdminPanelSettings as AdminIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  ContactSupport as ContactSupportIcon,
  Psychology as AIIcon,
  AutoAwesome as AutoAwesomeIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function OwnerPortalLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Command Center',
      description: 'AI-powered insights, competitive intelligence, and growth tools',
      icon: <AIIcon sx={{ fontSize: 40 }} />,
      color: '#7c3aed',
      path: '/owner-portal/command-center',
      featured: true
    },
    {
      title: 'Customer Management',
      description: 'Manage all customer organizations, subscriptions, and billing',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      path: '/owner-portal/customer-management'
    },
    {
      title: 'Analytics Dashboard',
      description: 'View business metrics, revenue trends, and customer insights',
      icon: <AnalyticsIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      path: '/owner-portal/analytics'
    },
    {
      title: 'Data Utilities',
      description: 'Bulk operations, system management, and administrative tools',
      icon: <SettingsIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      path: '/owner-portal/tools'
    },
    {
      title: 'Asset Configuration',
      description: 'Configure asset types, terminology, branding, and barcode formats for organizations',
      icon: <SettingsIcon sx={{ fontSize: 40 }} />,
      color: '#00bcd4',
      path: '/owner-portal/asset-configuration',
      featured: true
    },
    {
      title: 'File Format Manager',
      description: 'Configure custom file formats for organization data imports with validation rules',
      icon: <StorageIcon sx={{ fontSize: 40 }} />,
      color: '#8b5cf6',
      path: '/owner-portal/file-format-manager',
      featured: true
    },
    {
      title: 'Support Center',
      description: 'Customer support tools and ticket management',
      icon: <SupportIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      path: '/owner-portal/support'
    },
    {
      title: 'System Health',
      description: 'Monitor system performance, database status, and service health',
      icon: <HealthIcon sx={{ fontSize: 40 }} />,
      color: '#f57c00',
      path: '/owner-portal/system-health'
    },
    {
      title: 'Disaster Recovery',
      description: 'Manage backups, system recovery, and data protection',
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
      path: '/owner-portal/disaster-recovery'
    },
    {
      title: 'Security Events',
      description: 'Track security events, login attempts, and system access logs',
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      color: '#c62828',
      path: '/owner-portal/security'
    },
    {
      title: 'User Management',
      description: 'Manage users across all organizations and assign roles',
      icon: <AdminIcon sx={{ fontSize: 40 }} />,
      color: '#7b1fa2',
      path: '/owner-portal/user-management'
    },
    {
      title: 'Audit Log',
      description: 'View comprehensive audit trail of all system activities',
      icon: <HistoryIcon sx={{ fontSize: 40 }} />,
      color: '#455a64',
      path: '/owner-portal/audit-log'
    },
    {
      title: 'Impersonation',
      description: 'Temporarily access customer accounts for support and debugging',
      icon: <PersonIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      path: '/owner-portal/impersonation'
    },
    {
      title: 'Plan Management',
      description: 'Manage subscription plans, pricing, and feature access',
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#009688',
      path: '/owner-portal/plans'
    },
    {
      title: 'Role Management',
      description: 'Define and manage user roles and permissions across organizations',
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      color: '#607d8b',
      path: '/owner-portal/roles'
    },
    {
      title: 'Page Builder',
      description: 'Create and manage custom pages for customer portals',
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      color: '#795548',
      path: '/owner-portal/page-builder'
    },
    {
      title: 'Landing Page Editor',
      description: 'Edit your landing page content, testimonials, and features',
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50',
      path: '/owner-portal/landing-editor'
    },
    {
      title: 'Contact Management',
      description: 'Manage organization contact information for customer inquiries',
      icon: <ContactSupportIcon sx={{ fontSize: 40 }} />,
      color: '#2196f3',
      path: '/owner-portal/contact-management'
    },
    {
      title: 'Review Management',
      description: 'Approve and manage customer reviews and testimonials',
      icon: <ContactSupportIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      path: '/owner-portal/reviews'
    },
    {
      title: 'Website Management',
      description: 'Edit all website content, navigation, features, pricing, and SEO',
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      path: '/owner-portal/website-management',
      featured: true
    },
    {
      title: 'Visual Page Builder',
      description: 'Drag-and-drop visual editor like WordPress but better',
      icon: <AutoAwesomeIcon sx={{ fontSize: 40 }} />,
      color: '#e91e63',
      path: '/owner-portal/visual-builder',
      featured: true
    }
  ];

  const systemStatus = [
    { name: 'Database', status: 'healthy', color: 'success' },
    { name: 'API Services', status: 'healthy', color: 'success' },
    { name: 'Payment Processing', status: 'healthy', color: 'success' },
    { name: 'Email Services', status: 'warning', color: 'warning' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          Owner Portal
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Welcome back, {user?.email}
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          This is your central hub for managing the entire platform. Access customer data, 
          analytics, system tools, and administrative functions.
        </Alert>
      </Box>

      {/* Quick Actions */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => navigate(action.path)}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    mx: 'auto', 
                    mb: 2,
                    bgcolor: action.color 
                  }}
                >
                  {action.icon}
                </Avatar>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(action.path);
                  }}
                >
                  Access
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* System Status */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        System Status
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {systemStatus.map((service, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {service.name}
                </Typography>
                <Chip 
                  label={service.status} 
                  color={service.color}
                  size="small"
                  icon={<CheckCircleIcon />}
                />
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Stats */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Platform Overview
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Recent Activity
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="body2">
                5 new customer registrations this week
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">
                12 support tickets pending
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SecurityIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2">
                3 trial accounts expiring soon
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button 
                variant="text" 
                startIcon={<BusinessIcon />}
                onClick={() => navigate('/owner-portal/customers')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Manage Customers
              </Button>
              <Button 
                variant="text" 
                startIcon={<AnalyticsIcon />}
                onClick={() => navigate('/owner-portal/analytics')}
                sx={{ justifyContent: 'flex-start' }}
              >
                View Analytics
              </Button>
              <Button 
                variant="text" 
                startIcon={<SettingsIcon />}
                onClick={() => navigate('/owner-portal/tools')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Data Utilities
              </Button>
              <Button 
                variant="text" 
                startIcon={<SupportIcon />}
                onClick={() => navigate('/owner-portal/support')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Support Center
              </Button>
              <Button 
                variant="text" 
                startIcon={<HealthIcon />}
                onClick={() => navigate('/owner-portal/system-health')}
                sx={{ justifyContent: 'flex-start' }}
              >
                System Health
              </Button>
              <Button 
                variant="text" 
                startIcon={<SecurityIcon />}
                onClick={() => navigate('/owner-portal/security')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Security Events
              </Button>
              <Button 
                variant="text" 
                startIcon={<BuildIcon />}
                onClick={() => navigate('/owner-portal/website-management')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Website Management
              </Button>
              <Button 
                variant="text" 
                startIcon={<AutoAwesomeIcon />}
                onClick={() => navigate('/owner-portal/visual-builder')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Visual Page Builder
              </Button>
              <Button 
                variant="text" 
                startIcon={<AdminIcon />}
                onClick={() => navigate('/owner-portal/user-management')}
                sx={{ justifyContent: 'flex-start' }}
              >
                User Management
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 