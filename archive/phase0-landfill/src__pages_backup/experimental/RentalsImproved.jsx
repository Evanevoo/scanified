import logger from '../../utils/logger';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Card, CardContent, Grid, Chip, IconButton, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Tooltip, Badge
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  MonetizationOn as MoneyIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

// Enhanced status mapping with colors and descriptions
const ASSET_STATUS = {
  'IN-HOUSE': { 
    color: 'default', 
    icon: <HomeIcon />, 
    description: 'Available in warehouse',
    billable: false 
  },
  'WITH-VENDOR': { 
    color: 'secondary', 
    icon: <BusinessIcon />, 
    description: 'Assigned to vendor (no charge)',
    billable: false 
  },
  'RENTED': { 
    color: 'primary', 
    icon: <PersonIcon />, 
    description: 'Rented to customer',
    billable: true 
  }
};

function RentalsImproved() {
  const { profile, organization } = useAuth();
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [editDialog, setEditDialog] = useState({ open: false, asset: null });
  const [filters, setFilters] = useState({
    status: 'all',
    customer_type: 'all',
    search: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    inHouse: 0,
    withVendors: 0,
    rented: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    if (organization?.id) {
      fetchAssets();
      fetchCustomers();
    }
  }, [organization]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      // Use the new database view to get assets with enhanced status
      const { data: assetsData, error } = await supabase
        .from('bottles_with_status')
        .select('*')
        .eq('organization_id', organization.id);

      if (error) throw error;

      setAssets(assetsData || []);
      
      // Calculate statistics
      const inHouse = assetsData?.filter(a => a.asset_status === 'IN-HOUSE').length || 0;
      const withVendors = assetsData?.filter(a => a.asset_status === 'WITH-VENDOR').length || 0;
      const rented = assetsData?.filter(a => a.asset_status === 'RENTED').length || 0;
      
      // Calculate revenue from rented items only
      const { data: rentalsData } = await supabase
        .from('rentals')
        .select('rental_amount')
        .is('rental_end_date', null);
      
      const totalRevenue = rentalsData?.reduce((sum, rental) => sum + (rental.rental_amount || 0), 0) || 0;

      setStats({
        inHouse,
        withVendors,
        rented,
        totalRevenue
      });

    } catch (error) {
      logger.error('Error fetching assets:', error);
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      logger.error('Error fetching customers:', error);
    }
  };

  // Filter assets based on current filters
  const filteredAssets = assets.filter(asset => {
    if (filters.status !== 'all' && asset.asset_status !== filters.status) return false;
    if (filters.customer_type !== 'all' && asset.customer_type !== filters.customer_type) return false;
    if (filters.search && !asset.barcode_number?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !asset.customer_name?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Group assets by status for tab display
  const assetsByStatus = {
    all: filteredAssets,
    'IN-HOUSE': filteredAssets.filter(a => a.asset_status === 'IN-HOUSE'),
    'WITH-VENDOR': filteredAssets.filter(a => a.asset_status === 'WITH-VENDOR'),
    'RENTED': filteredAssets.filter(a => a.asset_status === 'RENTED')
  };

  const tabs = [
    { label: 'All Assets', value: 'all', count: assetsByStatus.all.length },
    { label: 'In House', value: 'IN-HOUSE', count: assetsByStatus['IN-HOUSE'].length },
    { label: 'With Vendors', value: 'WITH-VENDOR', count: assetsByStatus['WITH-VENDOR'].length },
    { label: 'Rented', value: 'RENTED', count: assetsByStatus['RENTED'].length }
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditAsset = (asset) => {
    setEditDialog({ open: true, asset });
  };

  const handleUpdateAsset = async (assetId, updates) => {
    try {
      const { error } = await supabase
        .from('bottles')
        .update(updates)
        .eq('id', assetId);

      if (error) throw error;

      // Refresh data
      await fetchAssets();
      setEditDialog({ open: false, asset: null });
    } catch (error) {
      logger.error('Error updating asset:', error);
    }
  };

  const exportToCSV = (data) => {
    const headers = ['Barcode', 'Status', 'Customer', 'Customer Type', 'Location', 'Billable'];
    const rows = data.map(asset => [
      asset.barcode_number || '',
      asset.asset_status || '',
      asset.customer_name || 'N/A',
      asset.customer_type || 'N/A',
      asset.location || '',
      ASSET_STATUS[asset.asset_status]?.billable ? 'Yes' : 'No'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets_${tabs[activeTab].label.toLowerCase().replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentAssets = activeTab === 0 ? assetsByStatus.all : assetsByStatus[tabs[activeTab].value];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Asset Management & Rentals
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => exportToCSV(currentAssets)}
          disabled={currentAssets.length === 0}
        >
          Export Data
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {stats.inHouse}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In-House Assets
                  </Typography>
                </Box>
                <HomeIcon sx={{ fontSize: 40, color: '#9e9e9e' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="secondary">
                    {stats.withVendors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    With Vendors
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (No Charge)
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.rented}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rented Assets
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    (Billable)
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    ${stats.totalRevenue.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Revenue
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    From Rentals
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filters</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Search by barcode or customer"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Asset Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="Asset Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="IN-HOUSE">In-House</MenuItem>
                  <MenuItem value="RENTED">Rented</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={filters.customer_type}
                  onChange={(e) => setFilters({ ...filters, customer_type: e.target.value })}
                  label="Account Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="CUSTOMER">Customers Only</MenuItem>
                  <MenuItem value="VENDOR">Vendors Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Badge badgeContent={tab.count} color="primary">
                  {tab.label}
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Assets Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Barcode</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Customer</strong></TableCell>
              <TableCell><strong>Account Type</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Billable</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" color="text.secondary" py={4}>
                    No assets found matching your filters
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentAssets.map((asset) => (
                <TableRow key={asset.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {asset.barcode_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={ASSET_STATUS[asset.asset_status]?.icon}
                      label={asset.asset_status}
                      color={ASSET_STATUS[asset.asset_status]?.color}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {asset.customer_name ? (
                      <Typography variant="body2">
                        {asset.customer_name}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {asset.customer_type && (
                      <Chip
                        label={asset.customer_type}
                        color={asset.customer_type === 'VENDOR' ? 'secondary' : 'primary'}
                        size="small"
                        variant="filled"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {asset.location || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ASSET_STATUS[asset.asset_status]?.billable ? 'Yes' : 'No'}
                      color={ASSET_STATUS[asset.asset_status]?.billable ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit Asset">
                      <IconButton
                        size="small"
                        onClick={() => handleEditAsset(asset)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/asset/${asset.id}`)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Asset Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, asset: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Asset Assignment</DialogTitle>
        <DialogContent>
          {editDialog.asset && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Asset: {editDialog.asset.barcode_number}
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Assign to Customer/Vendor</InputLabel>
                <Select
                  value={editDialog.asset.assigned_customer || ''}
                  onChange={(e) => 
                    setEditDialog(prev => ({
                      ...prev,
                      asset: { ...prev.asset, assigned_customer: e.target.value }
                    }))
                  }
                  label="Assign to Customer/Vendor"
                >
                  <MenuItem value="">
                    <em>Unassigned (In-House)</em>
                  </MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.CustomerListID} value={customer.CustomerListID}>
                      {customer.name} ({customer.customer_type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Assignment Rules:</strong><br/>
                  • Unassigned = IN-HOUSE (available for use)<br/>
                  • Assigned to VENDOR = No rental charges<br/>
                  • Assigned to CUSTOMER = Billable rental
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, asset: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleUpdateAsset(editDialog.asset.id, {
              assigned_customer: editDialog.asset.assigned_customer || null
            })}
          >
            Update Assignment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RentalsImproved;