import React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BusinessIcon from '@mui/icons-material/Business';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import SupportIcon from '@mui/icons-material/Support';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const quickActions = [
    {
      title: 'Owner Portal',
      description: 'Access all platform management tools',
      icon: <BusinessIcon sx={{ fontSize: 40 }} />, color: '#1976d2', path: '/owner-portal'
    },
    {
      title: 'Analytics',
      description: 'View platform analytics and metrics',
      icon: <AnalyticsIcon sx={{ fontSize: 40 }} />, color: '#2e7d32', path: '/owner-portal/analytics'
    },
    {
      title: 'Data Utilities',
      description: 'Bulk operations and system tools',
      icon: <SettingsIcon sx={{ fontSize: 40 }} />, color: '#ed6c02', path: '/owner-portal/tools'
    },
    {
      title: 'Support Center',
      description: 'Customer support and ticket management',
      icon: <SupportIcon sx={{ fontSize: 40 }} />, color: '#9c27b0', path: '/owner-portal/support'
    },
    {
      title: 'Smart Inventory',
      description: 'Advanced inventory management with analytics',
      icon: <AnalyticsIcon sx={{ fontSize: 40 }} />, color: '#ff6b35', path: '/smart-inventory'
    },
    {
      title: 'Customer Portal',
      description: 'Customer self-service portal demo',
      icon: <BusinessIcon sx={{ fontSize: 40 }} />, color: '#4caf50', path: '/customer-portal'
    }
  ];
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
        Welcome, Platform Owner
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        Use the quick actions below to access platform management tools and analytics.
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
              <Button 
                variant="outlined" 
                size="small"
                sx={{ m: 2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(action.path);
                }}
              >
                Access
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 