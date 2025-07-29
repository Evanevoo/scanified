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
  Collapse,
  Divider,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  FileDownload as FileDownloadIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { StatsSkeleton, TableSkeleton } from '../../components/SmoothLoading';

export default function AssetsByCustomerReport() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerBottles, setCustomerBottles] = useState([]);
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [summary, setSummary] = useState({
    totalBottles: 0,
    assignedBottles: 0,
    inHouseEmpty: 0,
    inHouseFilled: 0,
    customersWithBottles: 0,
    customersWithoutBottles: 0
  });

  useEffect(() => {
    if (organization) {
      fetchBottlesData();
    }
  }, [organization]);

  const fetchBottlesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch customers first
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (customersError) {
        console.error('Customers error:', customersError);
        throw customersError;
      }

      // Fetch bottles separately to avoid join issues
      // Only get bottles that have barcodes (actual physical bottles)
      const { data: bottles, error: bottlesError } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id)
        .not('barcode_number', 'is', null)
        .neq('barcode_number', '')
        .order('created_at', { ascending: false });

      if (bottlesError) {
        console.error('Bottles error:', bottlesError);
        throw bottlesError;
      }

      console.log('Fetched customers:', customers?.length || 0);
      console.log('Fetched bottles:', bottles?.length || 0);
      
      // Log comprehensive bottle data to understand structure
      if (bottles && bottles.length > 0) {
        console.log('Sample bottles:', bottles.slice(0, 5));
        console.log('All bottle statuses:', [...new Set(bottles.map(b => b.status))]);
        console.log('Bottles with barcode:', bottles.filter(b => b.barcode_number && b.barcode_number.trim()).length);
        console.log('Bottles with serial:', bottles.filter(b => b.serial_number && b.serial_number.trim()).length);
        console.log('Bottles with assigned_customer:', bottles.filter(b => b.assigned_customer).length);
        console.log('Bottles with customer_id:', bottles.filter(b => b.customer_id).length);
        console.log('Sample assigned bottles:', bottles.filter(b => b.assigned_customer || b.customer_id).slice(0, 3));
        
        // Check what makes a bottle vs asset type
        const withProductCode = bottles.filter(b => b.product_code);
        const withDescription = bottles.filter(b => b.description);
        console.log('Bottles with product_code:', withProductCode.length);
        console.log('Bottles with description:', withDescription.length);
        console.log('Sample product codes:', [...new Set(bottles.map(b => b.product_code).filter(Boolean))].slice(0, 10));
      }

      // Create a map of customers for easy lookup
      const customersMap = new Map();
      customers?.forEach(customer => {
        customersMap.set(customer.CustomerListID, customer);
      });

      // Group bottles by customer
      const customerBottlesMap = new Map();
      
      // Initialize all customers
      customers?.forEach(customer => {
        customerBottlesMap.set(customer.CustomerListID, {
          customer: customer,
          bottles: []
        });
      });

      // Group bottles by customer
      bottles?.forEach(bottle => {
        const customerId = bottle.assigned_customer || bottle.customer_id;
        if (customerId && customerBottlesMap.has(customerId)) {
          customerBottlesMap.get(customerId).bottles.push(bottle);
        } else if (customerId) {
          // Handle cases where bottle has customer but customer not in our list
          const customerInfo = customersMap.get(customerId) || {
            CustomerListID: customerId, 
            name: `Unknown Customer (${customerId})`,
            phone: 'N/A',
            address: 'N/A'
          };
          customerBottlesMap.set(customerId, {
            customer: customerInfo,
            bottles: [bottle]
          });
        }
      });

      // Add in-house bottles (unassigned)
      const inHouseBottles = bottles?.filter(bottle => 
        !bottle.assigned_customer && !bottle.customer_id
      ) || [];
      
      if (inHouseBottles.length > 0) {
        customerBottlesMap.set('IN_HOUSE', {
          customer: {
            CustomerListID: 'IN_HOUSE',
            name: 'In-House Bottles',
            phone: 'N/A',
            address: 'Warehouse/Facility'
          },
          bottles: inHouseBottles
        });
      }

      const customerBottlesList = Array.from(customerBottlesMap.values());
      setCustomerBottles(customerBottlesList);

      // Calculate summary
      const totalBottles = bottles?.length || 0;
      const assignedBottles = bottles?.filter(b => b.assigned_customer || b.customer_id).length || 0;
      const inHouseEmpty = bottles?.filter(b => !b.assigned_customer && !b.customer_id && b.status === 'empty').length || 0;
      const inHouseFilled = bottles?.filter(b => !b.assigned_customer && !b.customer_id && b.status === 'filled').length || 0;
      const customersWithBottles = customerBottlesList.filter(cb => cb.bottles.length > 0 && cb.customer.CustomerListID !== 'IN_HOUSE').length;

      setSummary({
        totalBottles,
        assignedBottles,
        inHouseEmpty,
        inHouseFilled,
        customersWithBottles: customersWithBottles,
        customersWithoutBottles: (customers?.length || 0) - customersWithBottles
      });

    } catch (err) {
      console.error('Error fetching bottles data:', err);
      setError(`Failed to load bottles data: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerExpansion = (customerId) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  const filteredCustomerBottles = customerBottles.filter(cb => 
    cb.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cb.customer.CustomerListID.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const csvData = [];
    
    // Add header
    csvData.push(['Customer ID', 'Customer Name', 'Phone', 'Bottle ID', 'Barcode', 'Serial Number', 'Product Code', 'Description', 'Status', 'Location', 'Last Updated']);
    
    // Add data rows
    filteredCustomerBottles.forEach(cb => {
      if (cb.bottles.length === 0) {
        csvData.push([
          cb.customer.CustomerListID,
          cb.customer.name,
          cb.customer.phone || 'N/A',
          'No Bottles',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);
      } else {
        cb.bottles.forEach(bottle => {
          csvData.push([
            cb.customer.CustomerListID,
            cb.customer.name,
            cb.customer.phone || 'N/A',
            bottle.id,
            bottle.barcode_number || 'N/A',
            bottle.serial_number || 'N/A',
            bottle.product_code || 'N/A',
            bottle.description || 'N/A',
            bottle.status === 'empty' ? 'Empty' : 'Filled',
            bottle.location || 'N/A',
            bottle.last_updated || bottle.created_at || 'N/A'
          ]);
        });
      }
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
    a.download = `bottles-by-customer-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setExportAnchorEl(null);
  };

  const exportToJSON = () => {
    const jsonData = {
      report: 'Bottles By Customer',
      generated: new Date().toISOString(),
      summary: summary,
      data: filteredCustomerBottles.map(cb => ({
        customer: cb.customer,
        bottles: cb.bottles,
        bottleCount: cb.bottles.length
      }))
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bottles-by-customer-${new Date().toISOString().split('T')[0]}.json`;
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
                🏭 Bottles By Customer
              </Typography>
            </Box>
          </Box>
          <StatsSkeleton count={5} />
          <Box mt={4}><TableSkeleton rows={8} columns={5} /></Box>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchBottlesData} sx={{ mt: 2 }}>
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
              🏭 Bottles By Customer
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
          View all bottles/cylinders grouped by customer assignment. Shows bottles assigned to customers, 
          in-house empty bottles (returned and awaiting refill), and in-house filled bottles (ready for delivery).
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
                      {summary.totalBottles}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Bottles
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
                  <PeopleIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {summary.assignedBottles}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assigned to Customers
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
                      {summary.inHouseEmpty}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In-House Empty
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
                      {summary.inHouseFilled}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In-House Filled
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
                      {summary.customersWithBottles}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customers with Bottles
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search customers..."
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

        {/* Customer Bottles List */}
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'var(--bg-card)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Bottle Count</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCustomerBottles.map((cb) => (
                <React.Fragment key={cb.customer.CustomerListID}>
                  <TableRow hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {cb.customer.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {cb.customer.CustomerListID}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {cb.customer.phone || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={cb.bottles.length} 
                        color={cb.bottles.length > 0 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          cb.customer.CustomerListID === 'IN_HOUSE' ? 'In-House' :
                          cb.bottles.length > 0 ? 'Has Bottles' : 'No Bottles'
                        }
                        color={
                          cb.customer.CustomerListID === 'IN_HOUSE' ? 'info' :
                          cb.bottles.length > 0 ? 'success' : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {cb.bottles.length > 0 && (
                        <IconButton 
                          onClick={() => toggleCustomerExpansion(cb.customer.CustomerListID)}
                          size="small"
                        >
                          {expandedCustomers.has(cb.customer.CustomerListID) ? 
                            <ExpandLessIcon /> : <ExpandMoreIcon />
                          }
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Bottle Details */}
                  {cb.bottles.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0 }}>
                        <Collapse in={expandedCustomers.has(cb.customer.CustomerListID)}>
                          <Box sx={{ py: 2 }}>
                            <Typography variant="h6" gutterBottom>
                              Bottles for {cb.customer.name}
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Barcode</TableCell>
                                  <TableCell>Serial Number</TableCell>
                                  <TableCell>Product Code</TableCell>
                                  <TableCell>Description</TableCell>
                                  <TableCell>Status</TableCell>
                                  <TableCell>Location</TableCell>
                                  <TableCell>Last Updated</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {cb.bottles.map((bottle) => (
                                  <TableRow key={bottle.id}>
                                    <TableCell>{bottle.barcode_number || 'N/A'}</TableCell>
                                    <TableCell>{bottle.serial_number || 'N/A'}</TableCell>
                                    <TableCell>{bottle.product_code || 'N/A'}</TableCell>
                                    <TableCell>{bottle.description || 'N/A'}</TableCell>
                                    <TableCell>
                                      <Chip 
                                        label={bottle.status === 'empty' ? 'Empty' : 'Filled'} 
                                        size="small"
                                        color={bottle.status === 'empty' ? 'warning' : 'success'}
                                      />
                                    </TableCell>
                                    <TableCell>{bottle.location || 'N/A'}</TableCell>
                                    <TableCell>
                                      {bottle.last_updated ? 
                                        new Date(bottle.last_updated).toLocaleDateString() : 
                                        new Date(bottle.created_at).toLocaleDateString()
                                      }
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

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