import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Inventory as InventoryIcon,
  FileDownload as FileDownloadIcon,
  ArrowBack as ArrowBackIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { StatsSkeleton, TableSkeleton } from '../../components/SmoothLoading';

export default function AllAssetsReport() {
  const navigate = useNavigate();
  const { organization, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assets, setAssets] = useState([]);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [summary, setSummary] = useState({
    totalAssets: 0,
    activeAssets: 0,
    inactiveAssets: 0,
    assignedAssets: 0,
    unassignedAssets: 0
  });

  useEffect(() => {
    console.log('AllAssetsReport useEffect triggered:', {
      authLoading,
      organization: organization ? { id: organization.id, name: organization.name } : null,
      hasOrganizationId: organization?.id ? true : false
    });
    
    if (!authLoading && organization && organization.id) {
      fetchAssetsData();
    } else if (!authLoading && !organization) {
      console.warn('No organization found after auth loading completed');
      setError('No organization found. Please contact your administrator.');
      setLoading(false);
    }
  }, [organization, authLoading]);

  const fetchAssetsData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching assets data for organization:', organization);

      // Fetch all assets/bottles with customer info
      const { data: assetsData, error: assetsError } = await supabase
        .from('bottles')
        .select(`
          *,
          customers!assigned_customer (
            name,
            phone,
            CustomerListID
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (assetsError) {
        console.error('Supabase error:', assetsError);
        throw assetsError;
      }

      console.log('Assets data fetched successfully:', assetsData?.length || 0, 'assets');

      setAssets(assetsData || []);

      // Calculate summary
      const totalAssets = assetsData.length;
      const activeAssets = assetsData.filter(a => a.status === 'active').length;
      const assignedAssets = assetsData.filter(a => a.assigned_customer || a.customer_id).length;

      setSummary({
        totalAssets,
        activeAssets,
        inactiveAssets: totalAssets - activeAssets,
        assignedAssets,
        unassignedAssets: totalAssets - assignedAssets
      });

    } catch (err) {
      console.error('Error fetching assets data:', err);
      setError(`Failed to load assets data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      (asset.barcode_number && asset.barcode_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.product_code && asset.product_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const csvData = [];
    
    // Add header
    csvData.push([
      'Asset ID', 'Barcode', 'Serial Number', 'Product Code', 'Description', 
      'Status', 'Location', 'Assigned Customer', 'Customer Phone', 'Created Date', 'Last Updated'
    ]);
    
    // Add data rows
    filteredAssets.forEach(asset => {
      csvData.push([
        asset.id,
        asset.barcode_number || 'N/A',
        asset.serial_number || 'N/A',
        asset.product_code || 'N/A',
        asset.description || 'N/A',
        asset.status || 'N/A',
        asset.location || 'N/A',
        asset.customers?.name || 'Unassigned',
        asset.customers?.phone || 'N/A',
        new Date(asset.created_at).toLocaleDateString(),
        asset.last_updated ? new Date(asset.last_updated).toLocaleDateString() : 'N/A'
      ]);
    });

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Download
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-assets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setExportAnchorEl(null);
  };

  const exportToJSON = () => {
    const jsonData = {
      report: 'All Assets Report',
      generated: new Date().toISOString(),
      summary: summary,
      data: filteredAssets
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-assets-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    setExportAnchorEl(null);
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 4 }}>
        <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 4 }, borderRadius: 2, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center">
              <ArrowBackIcon />
              <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1, ml: 2 }}>
                📦 All Assets Report
              </Typography>
            </Box>
          </Box>
          <StatsSkeleton count={5} />
          <Box mt={4}><TableSkeleton rows={8} columns={6} /></Box>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchAssetsData} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!authLoading && !organization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No organization found. Please contact your administrator.
        </Alert>
      </Box>
    );
  }

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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1 }}>
              📦 All Assets Report
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
          >
            Export
          </Button>
        </Box>

        <Typography variant="body1" color="text.secondary" mb={4}>
          Comprehensive view of all assets in your system with detailed information and filtering options.
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <InventoryIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="primary">
                      {summary.totalAssets}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Assets
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <InventoryIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {summary.activeAssets}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <InventoryIcon color="error" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="error.main">
                      {summary.inactiveAssets}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inactive
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <InventoryIcon color="info" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {summary.assignedAssets}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assigned
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <InventoryIcon color="warning" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {summary.unassignedAssets}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filters */}
        <Box display="flex" gap={2} mb={3}>
          <TextField
            fullWidth
            placeholder="Search assets by barcode, serial number, product code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="retired">Retired</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Assets Table */}
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'var(--bg-card)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Asset Info</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Product Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No assets found matching your criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {asset.barcode_number || asset.serial_number || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {asset.id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {asset.product_code || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {asset.description || 'No description'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={asset.status || 'Unknown'} 
                        color={
                          asset.status === 'active' ? 'success' :
                          asset.status === 'inactive' ? 'error' :
                          asset.status === 'maintenance' ? 'warning' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {asset.location || 'Not specified'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {asset.customers?.name || 'Unassigned'}
                        </Typography>
                        {asset.customers?.phone && (
                          <Typography variant="caption" color="text.secondary">
                            {asset.customers.phone}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {asset.last_updated ? 
                          new Date(asset.last_updated).toLocaleDateString() : 
                          new Date(asset.created_at).toLocaleDateString()
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Results Info */}
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredAssets.length} of {assets.length} assets
          </Typography>
        </Box>

        {/* Export Menu */}
        <Menu
          anchorEl={exportAnchorEl}
          open={Boolean(exportAnchorEl)}
          onClose={() => setExportAnchorEl(null)}
        >
          <MenuItem onClick={exportToCSV}>
            <FileDownloadIcon sx={{ mr: 1 }} />
            Export to CSV
          </MenuItem>
          <MenuItem onClick={exportToJSON}>
            <FileDownloadIcon sx={{ mr: 1 }} />
            Export to JSON
          </MenuItem>
        </Menu>
      </Paper>
    </Box>
  );
} 