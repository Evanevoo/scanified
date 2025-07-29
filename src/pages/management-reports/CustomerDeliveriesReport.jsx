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
  LocalShipping as DeliveryIcon,
  People as PeopleIcon,
  FileDownload as FileDownloadIcon,
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { StatsSkeleton, TableSkeleton } from '../../components/SmoothLoading';

export default function CustomerDeliveriesReport() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveries, setDeliveries] = useState([]);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [summary, setSummary] = useState({
    totalDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    totalCustomers: 0,
    avgDeliveriesPerCustomer: 0
  });

  useEffect(() => {
    if (organization) {
      fetchDeliveriesData();
    }
  }, [organization]);

  const fetchDeliveriesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get from delivery_tracking table
      let { data: deliveriesData, error: deliveriesError } = await supabase
        .from('delivery_tracking')
        .select(`
          *,
          customers (
            name,
            phone,
            CustomerListID,
            address
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      // If no delivery_tracking table or no data, try sales_orders
      if (deliveriesError || !deliveriesData || deliveriesData.length === 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('sales_orders')
          .select(`
            *,
            customers (
              name,
              phone,
              CustomerListID,
              address
            )
          `)
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        
        // Transform sales orders to delivery format
        deliveriesData = ordersData?.map(order => ({
          id: order.id,
          delivery_date: order.delivery_date || order.created_at,
          status: order.status || 'pending',
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          delivery_address: order.delivery_address,
          total_amount: order.total_amount,
          items: order.items || [],
          notes: order.notes,
          created_at: order.created_at,
          customers: order.customers
        })) || [];
      }

      if (deliveriesError && !deliveriesData) throw deliveriesError;

      setDeliveries(deliveriesData || []);

      // Calculate summary
      const totalDeliveries = deliveriesData?.length || 0;
      const completedDeliveries = deliveriesData?.filter(d => d.status === 'completed' || d.status === 'delivered').length || 0;
      const pendingDeliveries = deliveriesData?.filter(d => d.status === 'pending' || d.status === 'scheduled').length || 0;
      const uniqueCustomers = new Set(deliveriesData?.map(d => d.customer_id).filter(Boolean)).size;

      setSummary({
        totalDeliveries,
        completedDeliveries,
        pendingDeliveries,
        totalCustomers: uniqueCustomers,
        avgDeliveriesPerCustomer: uniqueCustomers > 0 ? (totalDeliveries / uniqueCustomers).toFixed(1) : 0
      });

    } catch (err) {
      console.error('Error fetching deliveries data:', err);
      setError('Failed to load deliveries data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = 
      (delivery.customer_name && delivery.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (delivery.customers?.name && delivery.customers.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (delivery.delivery_address && delivery.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const csvData = [];
    
    // Add header
    csvData.push([
      'Delivery ID', 'Customer Name', 'Customer Phone', 'Delivery Date', 'Status', 
      'Delivery Address', 'Total Amount', 'Items', 'Notes', 'Created Date'
    ]);
    
    // Add data rows
    filteredDeliveries.forEach(delivery => {
      csvData.push([
        delivery.id,
        delivery.customers?.name || delivery.customer_name || 'N/A',
        delivery.customers?.phone || 'N/A',
        delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : 'N/A',
        delivery.status || 'N/A',
        delivery.delivery_address || delivery.customers?.address || 'N/A',
        delivery.total_amount || 'N/A',
        Array.isArray(delivery.items) ? delivery.items.length : 'N/A',
        delivery.notes || 'N/A',
        new Date(delivery.created_at).toLocaleDateString()
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
    a.download = `customer-deliveries-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setExportAnchorEl(null);
  };

  const exportToJSON = () => {
    const jsonData = {
      report: 'Customer Deliveries Report',
      generated: new Date().toISOString(),
      summary: summary,
      data: filteredDeliveries
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-deliveries-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    setExportAnchorEl(null);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 4 }}>
        <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 4 }, borderRadius: 2, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center">
              <ArrowBackIcon />
              <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1, ml: 2 }}>
                🚚 Customer Deliveries Report
              </Typography>
            </Box>
          </Box>
          <StatsSkeleton count={5} />
          <Box mt={4}><TableSkeleton rows={8} columns={7} /></Box>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchDeliveriesData} sx={{ mt: 2 }}>
          Retry
        </Button>
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
              🚚 Customer Deliveries Report
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
          Track delivery history and performance metrics for all customers with detailed delivery information.
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <DeliveryIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="primary">
                      {summary.totalDeliveries}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Deliveries
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
                  <DeliveryIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {summary.completedDeliveries}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
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
                  <DeliveryIcon color="warning" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {summary.pendingDeliveries}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
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
                  <PeopleIcon color="info" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {summary.totalCustomers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customers
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
                  <DeliveryIcon color="secondary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="secondary.main">
                      {summary.avgDeliveriesPerCustomer}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg per Customer
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
            placeholder="Search by customer name or delivery address..."
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
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Deliveries Table */}
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'var(--bg-card)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Delivery Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No deliveries found matching your criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {delivery.customers?.name || delivery.customer_name || 'Unknown Customer'}
                        </Typography>
                        {delivery.customers?.phone && (
                          <Typography variant="body2" color="text.secondary">
                            {delivery.customers.phone}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {delivery.delivery_date ? 
                          new Date(delivery.delivery_date).toLocaleDateString() : 
                          'Not scheduled'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={delivery.status || 'Unknown'} 
                        color={
                          delivery.status === 'completed' || delivery.status === 'delivered' ? 'success' :
                          delivery.status === 'pending' || delivery.status === 'scheduled' ? 'warning' :
                          delivery.status === 'cancelled' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {delivery.delivery_address || delivery.customers?.address || 'Not specified'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {delivery.total_amount ? `$${delivery.total_amount}` : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {Array.isArray(delivery.items) ? delivery.items.length : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(delivery.created_at).toLocaleDateString()}
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
            Showing {filteredDeliveries.length} of {deliveries.length} deliveries
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