import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Assessment as ReportIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  LocalShipping as DeliveryIcon,
  TrendingUp as AnalyticsIcon,
  Assignment as OrdersIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Print as PrintIcon,
  Map as MapIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

export default function CustomReports() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const reportCategories = [
    { id: 'all', label: 'All Reports', icon: <ReportIcon />, color: 'primary' },
    { id: 'assets', label: 'Assets', icon: <InventoryIcon />, color: 'success' },
    { id: 'customers', label: 'Customers', icon: <PeopleIcon />, color: 'info' },
    { id: 'deliveries', label: 'Deliveries', icon: <DeliveryIcon />, color: 'warning' },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon />, color: 'secondary' },
    { id: 'operations', label: 'Operations', icon: <OrdersIcon />, color: 'error' }
  ];

  const availableReports = [
    // Asset Reports
    {
      id: 'all-assets',
      title: 'All Assets Report',
      description: 'Comprehensive view of all assets in the system',
      category: 'assets',
      path: '/reports/all-assets',
      icon: <InventoryIcon />,
      color: 'success'
    },
    {
      id: 'asset-type-changes',
      title: 'Asset Type Changes',
      description: 'Track changes in asset types over time',
      category: 'assets',
      path: '/reports/asset-type-changes',
      icon: <InventoryIcon />,
      color: 'success'
    },
    {
      id: 'new-assets',
      title: 'New Assets Added',
      description: 'Recently added assets to the system',
      category: 'assets',
      path: '/reports/new-assets',
      icon: <InventoryIcon />,
      color: 'success'
    },
    {
      id: 'lost-assets',
      title: 'Lost Assets Report',
      description: 'Assets that are missing or unaccounted for',
      category: 'assets',
      path: '/reports/lost-assets',
      icon: <WarningIcon />,
      color: 'error'
    },
    {
      id: 'overdue-assets',
      title: 'Overdue Asset Search',
      description: 'Assets that are overdue for return',
      category: 'assets',
      path: '/reports/overdue-assets',
      icon: <WarningIcon />,
      color: 'error'
    },
    {
      id: 'not-scanned-source',
      title: 'Not-Scanned Source',
      description: 'Assets that have not been scanned at source',
      category: 'assets',
      path: '/reports/not-scanned-source',
      icon: <WarningIcon />,
      color: 'warning'
    },
    {
      id: 'movement-between-locations',
      title: 'Movement Between Locations',
      description: 'Track asset movements between different locations',
      category: 'assets',
      path: '/reports/movement-between-locations',
      icon: <LocationIcon />,
      color: 'info'
    },
    
    // Customer Reports
    {
      id: 'assets-by-customer',
      title: 'Assets By Customer',
      description: 'View assets grouped by customer',
      category: 'customers',
      path: '/reports/assets-by-customer',
      icon: <PeopleIcon />,
      color: 'info'
    },
    {
      id: 'customer-deliveries',
      title: 'Customer Deliveries',
      description: 'Delivery history for each customer',
      category: 'customers',
      path: '/reports/customer-deliveries',
      icon: <PeopleIcon />,
      color: 'info'
    },
    {
      id: 'negative-balance',
      title: 'Negative Balance Report',
      description: 'Customers with negative account balances',
      category: 'customers',
      path: '/reports/negative-balance',
      icon: <WarningIcon />,
      color: 'error'
    },
    
    // Delivery Reports
    {
      id: 'deliveries-by-location',
      title: 'Deliveries By Location',
      description: 'Delivery statistics grouped by location',
      category: 'deliveries',
      path: '/reports/deliveries-by-location',
      icon: <LocationIcon />,
      color: 'warning'
    },
    {
      id: 'delivery-totals',
      title: 'Delivery Totals By User',
      description: 'Delivery performance metrics by user',
      category: 'deliveries',
      path: '/reports/delivery-totals',
      icon: <DeliveryIcon />,
      color: 'warning'
    },
    {
      id: 'audits-to-delivery',
      title: 'Audits to Delivery Records',
      description: 'Audit trail for delivery records',
      category: 'deliveries',
      path: '/reports/audits-to-delivery',
      icon: <DeliveryIcon />,
      color: 'warning'
    },
    
    // Analytics Reports
    {
      id: 'balance-changes',
      title: 'Balance Changes Summary',
      description: 'Summary of balance changes over time',
      category: 'analytics',
      path: '/reports/balance-changes',
      icon: <AnalyticsIcon />,
      color: 'secondary'
    },
    {
      id: 'quick-map',
      title: 'Quick Map Report',
      description: 'Geographic visualization of assets and deliveries',
      category: 'analytics',
      path: '/reports/quick-map',
      icon: <MapIcon />,
      color: 'secondary'
    },
    
    // Operations Reports
    {
      id: 'supabase-orders',
      title: 'Orders Report',
      description: 'Comprehensive orders and sales data',
      category: 'operations',
      path: '/reports/supabase-orders',
      icon: <OrdersIcon />,
      color: 'error'
    },
    {
      id: 'print-days',
      title: 'Print Days Records',
      description: 'Daily printing and processing records',
      category: 'operations',
      path: '/reports/print-days',
      icon: <PrintIcon />,
      color: 'error'
    }
  ];

  const filteredReports = availableReports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 4 }}>
      <Paper elevation={0} sx={{ 
        width: '100%', 
        p: { xs: 2, md: 4 }, 
        borderRadius: 2, 
        boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', 
        border: '1px solid var(--divider)', 
        bgcolor: 'var(--bg-main)' 
      }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1 }}>
            📊 Custom Reports
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" mb={4}>
          Access comprehensive reports for assets, customers, deliveries, and analytics. 
          Use the search and category filters to find the reports you need.
        </Typography>

        {/* Search and Filters */}
        <Box mb={4}>
          <TextField
            fullWidth
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Category Filters */}
          <Box display="flex" gap={1} flexWrap="wrap">
            {reportCategories.map((category) => (
              <Chip
                key={category.id}
                icon={category.icon}
                label={category.label}
                onClick={() => setSelectedCategory(category.id)}
                color={selectedCategory === category.id ? category.color : 'default'}
                variant={selectedCategory === category.id ? 'filled' : 'outlined'}
                sx={{ mb: 1 }}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Reports Grid */}
        {filteredReports.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No reports found matching your search criteria.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {filteredReports.map((report) => (
              <Grid item xs={12} sm={6} md={4} key={report.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 20px 0 rgba(16,24,40,0.1)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box 
                        sx={{ 
                          p: 1, 
                          borderRadius: 1, 
                          bgcolor: `${report.color}.light`,
                          color: `${report.color}.main`,
                          mr: 2
                        }}
                      >
                        {report.icon}
                      </Box>
                      <Typography variant="h6" component="h3" fontWeight={600}>
                        {report.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {report.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      color={report.color}
                      onClick={() => navigate(report.path)}
                      startIcon={<ReportIcon />}
                    >
                      View Report
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Summary Stats */}
        <Box mt={6} p={3} bgcolor="var(--bg-card)" borderRadius={2}>
          <Typography variant="h6" gutterBottom>
            Reports Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">Total Reports</Typography>
              <Typography variant="h4" color="primary">{availableReports.length}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">Asset Reports</Typography>
              <Typography variant="h4" color="success.main">
                {availableReports.filter(r => r.category === 'assets').length}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">Customer Reports</Typography>
              <Typography variant="h4" color="info.main">
                {availableReports.filter(r => r.category === 'customers').length}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">Delivery Reports</Typography>
              <Typography variant="h4" color="warning.main">
                {availableReports.filter(r => r.category === 'deliveries').length}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
} 