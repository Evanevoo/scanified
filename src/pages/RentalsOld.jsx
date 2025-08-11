import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, IconButton, TextField, CircularProgress, FormControl, InputLabel, Select, MenuItem, Alert, Chip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../hooks/useAuth';

function exportToCSV(customers) {
  const rows = [];
  customers.forEach(({ customer, rentals }) => {
    rentals.forEach(rental => {
      rows.push({
        Customer: customer.name,
        CustomerID: customer.CustomerListID,
        TotalBottles: rentals.length,
        RentalType: rental.rental_type,
        RentalRate: rental.rental_amount,
        TaxCode: rental.tax_code,
        Location: rental.location,
        StartDate: rental.rental_start_date,
        EndDate: rental.rental_end_date,
      });
    });
  });
  if (rows.length === 0) return;
  const header = Object.keys(rows[0]).join(',');
  const csv = [header, ...rows.map(r => Object.values(r).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rentals_export_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const defaultEdit = (rentals) => ({
  bottles: rentals.length,
  rentalRate: rentals[0]?.rental_amount || '',
  rentalType: rentals[0]?.rental_type || 'Monthly',
  taxCode: rentals[0]?.tax_code || 'GST',
  location: rentals[0]?.location || 'SASKATOON'
});

function getNextInvoiceNumber() {
  const state = JSON.parse(localStorage.getItem('invoice_state') || '{}');
  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');
  let lastNumber = 10000;
  let lastMonth = currentMonth;
  if (state.lastMonth === currentMonth && state.lastNumber) {
    lastNumber = 10000; // Always start from 10000 for the current month
  } else if (state.lastMonth !== currentMonth && state.lastNumber) {
    lastNumber = state.lastNumber + 1;
    lastMonth = currentMonth;
  }
  return { next: lastNumber, currentMonth, lastMonth };
}

function setInvoiceState(number, month) {
  // Only update if month has changed
  const state = JSON.parse(localStorage.getItem('invoice_state') || '{}');
  if (state.lastMonth !== month) {
    localStorage.setItem('invoice_state', JSON.stringify({ lastNumber: number, lastMonth: month }));
  }
}

function getInvoiceDates() {
  const now = new Date();
  // Invoice date is 1st of next month
  const invoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  // Due date is 1 month after invoice date
  const dueDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 1);
  const fmt = d => d.toISOString().slice(0, 10);
  return { invoiceDate: fmt(invoiceDate), dueDate: fmt(dueDate) };
}

function exportInvoices(customers) {
  if (!customers.length) return;
  const { next, currentMonth } = getNextInvoiceNumber();
  let invoiceNumber = next;
  const { invoiceDate, dueDate } = getInvoiceDates();
  const rate = 10;
  const taxRate = 0.11;
  const rows = customers.map(({ customer, rentals }, idx) => {
    const numBottles = rentals.length;
    const base = numBottles * rate;
    const tax = +(base * taxRate).toFixed(1);
    const total = +(base + tax).toFixed(2);
    return {
      'Invoice#': `W${(invoiceNumber + idx).toString().padStart(5, '0')}`,
      'Customer Number': customer.CustomerListID,
      'Total': total,
      'Date': invoiceDate,
      'TX': tax,
      'TX code': 'G',
      'Due date': dueDate,
      'Rate': rate,
      'Name': customer.name,
      '# of Bottles': numBottles
    };
  });
  // Update invoice state
  setInvoiceState(invoiceNumber + rows.length - 1, currentMonth);
  // CSV export
  const header = Object.keys(rows[0]).join(',');
  const csv = [header, ...rows.map(r => Object.values(r).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quickbooks_invoices_${invoiceDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Rentals() {
  const { profile: userProfile } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [editMap, setEditMap] = useState({});
  const [savingMap, setSavingMap] = useState({});
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [sortField, setSortField] = useState('customer');
  const [sortDirection, setSortDirection] = useState('asc');

  // Check if user is admin
  const isAdmin = userProfile?.role === 'admin' || userProfile?.is_admin === true;

  const fetchRentals = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!userProfile?.organization_id) {
        setError('No organization assigned to user');
        setLoading(false);
        return;
      }

      // Fetch all explicit rental records for this organization
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('*, bottles(*)')
        .eq('organization_id', userProfile.organization_id)
        .not('bottle_id', 'is', null)
        .order('rental_start_date', { ascending: false });
      if (rentalsError) throw rentalsError;
      
      // Fetch bottles assigned to customers (but not customer-owned) for this organization
      const { data: assignedBottles, error: bottlesError } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .not('assigned_customer', 'is', null)
        .neq('owner_type', 'customer') // Exclude customer-owned bottles
        .order('created_at', { ascending: false });
      if (bottlesError) throw bottlesError;
      
      console.log('Rentals: Sample rental data:', rentalsData?.slice(0, 3));
      console.log('Rentals: Total rentals fetched:', rentalsData?.length || 0);
      console.log('Rentals: Assigned bottles fetched:', assignedBottles?.length || 0);
      
      // Combine explicit rentals with assigned bottles
      const allRentalData = [];
      
      // Add explicit rentals
      (rentalsData || []).forEach(rental => {
        allRentalData.push({
          ...rental,
          source: 'rental_record',
          customer_id: rental.customer_id,
          bottle_id: rental.bottle_id,
          rental_start_date: rental.rental_start_date,
          rental_end_date: rental.rental_end_date,
          rental_amount: rental.rental_amount,
          rental_type: rental.rental_type,
          tax_code: rental.tax_code,
          location: rental.location
        });
      });
      
      // Add assigned bottles as implicit rentals (if not already in explicit rentals)
      const existingBottleIds = new Set((rentalsData || []).map(r => r.bottle_id).filter(Boolean));
      
      (assignedBottles || []).forEach(bottle => {
        if (!existingBottleIds.has(bottle.id)) {
          allRentalData.push({
            id: `bottle_${bottle.id}`, // Unique ID for bottle-based rentals
            source: 'bottle_assignment',
            customer_id: bottle.assigned_customer,
            bottle_id: bottle.id,
            bottles: bottle, // Include bottle data
            rental_start_date: bottle.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            rental_end_date: null,
            rental_amount: 10, // Default rental amount
            rental_type: 'monthly',
            tax_code: 'pst+gst',
            tax_rate: 0.11,
            location: bottle.location || 'SASKATOON'
          });
        }
      });
      
      // Get unique customer_ids
      const customerIds = Array.from(new Set(allRentalData.map(r => r.customer_id).filter(Boolean)));
      let customersMap = {};
      
      if (customerIds.length > 0) {
        // Fetch all customers in one query for this organization
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .in('CustomerListID', customerIds);
        if (!customersError && customersData) {
          customersMap = customersData.reduce((map, c) => {
            map[c.CustomerListID] = c;
            return map;
          }, {});
        }
      }
      
      // Attach customer info to each rental
      const rentalsWithCustomer = allRentalData.map(r => ({
        ...r,
        customer: customersMap[r.customer_id] || null
      }));
      
      const filteredRentals = rentalsWithCustomer.filter(r => r.customer_id && r.customer_id !== 'Not Set' && r.customer);
      setRentals(filteredRentals);
      
      console.log('Rentals: Total combined rentals:', filteredRentals.length);
      console.log('Rentals: Sample combined data:', filteredRentals.slice(0, 3));
      
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  // Group rentals by customer, skip if missing customer
  const customers = [];
  const customerMap = {};
  
  for (const rental of rentals) {
    if (!rental.customer) continue; // Skip rentals with no customer
    const custId = rental.customer.CustomerListID;
    if (!customerMap[custId]) {
      customerMap[custId] = {
        customer: rental.customer,
        rentals: [],
      };
      customers.push(customerMap[custId]);
    }
    customerMap[custId].rentals.push(rental);
  }

  // Sort customers based on selected field
  const sortCustomers = (customers, field, direction) => {
    return customers.sort((a, b) => {
      let aValue, bValue;
      
      switch (field) {
        case 'customer':
          aValue = a.customer.name || '';
          bValue = b.customer.name || '';
          break;
        case 'location':
          aValue = a.rentals[0]?.location || '';
          bValue = b.rentals[0]?.location || '';
          break;
        case 'rental_type':
          aValue = a.rentals[0]?.rental_type || '';
          bValue = b.rentals[0]?.rental_type || '';
          break;
        case 'total_bottles':
          aValue = a.rentals.length;
          bValue = b.rentals.length;
          break;
        case 'rental_amount':
          aValue = a.rentals[0]?.rental_amount || 0;
          bValue = b.rentals[0]?.rental_amount || 0;
          break;
        case 'start_date':
          aValue = a.rentals[0]?.rental_start_date || '';
          bValue = b.rentals[0]?.rental_start_date || '';
          break;
        default:
          aValue = a.customer.name || '';
          bValue = b.customer.name || '';
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const sortedCustomers = sortCustomers(customers, sortField, sortDirection);
  const paginatedCustomers = sortedCustomers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleEditChange = (custId, field, value) => {
    setEditMap(prev => ({
      ...prev,
      [custId]: {
        ...prev[custId],
        [field]: value
      }
    }));
  };

  const handleSave = async (custId, rentals) => {
    setSavingMap(prev => ({ ...prev, [custId]: true }));
    const edit = editMap[custId] || defaultEdit(rentals);
    try {
      // Get tax rate for the location
      let taxRate = 0;
      let taxCode = edit.taxCode;
      
      if (edit.location && edit.location !== 'None') {
        try {
          const { data: locationData } = await supabase
            .from('locations')
            .select('total_tax_rate')
            .eq('id', edit.location.toLowerCase())
            .single();
          
          if (locationData) {
            taxRate = locationData.total_tax_rate;
            taxCode = 'GST+PST'; // Use combined tax code for location-based rates
          }
        } catch (e) {
          console.warn('Could not fetch tax rate for location:', edit.location);
        }
      }

      await Promise.all(rentals.map(rental =>
        supabase.from('rentals').update({
          rental_amount: edit.rentalRate,
          rental_type: edit.rentalType,
          tax_code: taxCode,
          tax_rate: taxRate,
          location: edit.location
        }).eq('id', rental.id)
      ));
      // Refresh data properly
      await fetchRentals();
    } catch (error) {
      // Error handling for rental updates
    }
    setSavingMap(prev => ({ ...prev, [custId]: false }));
  };

  // Function to create rental records for existing bottle assignments
  const createRentalsForExistingBottles = async () => {
    setLoading(true);
    try {
      // Get all bottles that are assigned to customers but don't have rental records
      const { data: assignedBottles, error: bottlesError } = await supabase
        .from('bottles')
        .select('*')
        .not('assigned_customer', 'is', null);
      
      if (bottlesError) throw bottlesError;
      
      // Get existing rental records to avoid duplicates
      const { data: existingRentals, error: rentalsError } = await supabase
        .from('rentals')
        .select('bottle_id');
      
      if (rentalsError) throw rentalsError;
      
      const existingBottleIds = new Set(existingRentals.map(r => r.bottle_id));
      
      // Create rental records for bottles that don't have them
      const bottlesToCreateRentalsFor = assignedBottles.filter(bottle => !existingBottleIds.has(bottle.id));
      
      if (bottlesToCreateRentalsFor.length === 0) {
        alert('All assigned bottles already have rental records!');
        return;
      }
      
      // For each bottle, fetch location tax info and set tax_code and tax_rate
      const rentalRecords = [];
      for (const bottle of bottlesToCreateRentalsFor) {
        let taxCode = 'pst+gst';
        let taxRate = 0;
        let rentalLocation = bottle.location || 'SASKATOON';
        try {
          const { data: locationData } = await supabase
            .from('locations')
            .select('id, total_tax_rate')
            .eq('id', rentalLocation.toLowerCase())
            .single();
          if (locationData) {
            taxRate = locationData.total_tax_rate;
          }
        } catch (e) {
          // Could not fetch location tax info, using defaults
        }
        rentalRecords.push({
          customer_id: bottle.assigned_customer,
          bottle_id: bottle.id,
          rental_start_date: bottle.rental_start_date || new Date().toISOString().split('T')[0],
          rental_type: 'monthly',
          rental_amount: 10,
          location: rentalLocation,
          tax_code: taxCode,
          tax_rate: taxRate
        });
      }
      
      const { data: createdRentals, error: createError } = await supabase
        .from('rentals')
        .insert(rentalRecords)
        .select();
      
      if (createError) throw createError;
      
      alert(`Successfully created ${createdRentals.length} rental records!`);
      
      // Refresh the rentals data
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .order('rental_start_date', { ascending: false });
      setRentals(data);
      
    } catch (error) {
      console.error('Error creating rental records:', error);
      alert('Error creating rental records: ' + error.message);
    }
    setLoading(false);
  };

  // Admin access check
  if (!isAdmin) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
        <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            Access Denied: This page is only available to administrators.
          </Alert>
          <Typography variant="h4" component="h1" gutterBottom>
            Rentals Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You do not have permission to access the rentals management page. Please contact your administrator if you believe this is an error.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Return to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Rentals</Typography>
        
        {/* Sort Controls */}
        <Box display="flex" gap={2} alignItems="center" mb={3} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Sort by:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              size="small"
            >
              <MenuItem value="customer">Customer Name</MenuItem>
              <MenuItem value="location">Location</MenuItem>
              <MenuItem value="rental_type">Rental Type</MenuItem>
              <MenuItem value="total_bottles">Total Bottles</MenuItem>
              <MenuItem value="rental_amount">Rental Amount</MenuItem>
              <MenuItem value="start_date">Start Date</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value)}
              size="small"
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            ({customers.length} customers)
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
          <Button
            variant="contained"
            onClick={() => exportInvoices(customers)}
            sx={{
              borderRadius: 999,
              bgcolor: '#111',
              color: '#fff',
              fontWeight: 700,
              px: 4,
              py: 1.5,
              fontSize: 16,
              boxShadow: 'none',
              ':hover': { bgcolor: '#222' }
            }}
            startIcon={<DownloadIcon />}
          >
            Export CSV
          </Button>
          
          <Button
            variant="outlined"
            onClick={createRentalsForExistingBottles}
            disabled={loading}
            sx={{
              borderRadius: 999,
              fontWeight: 700,
              px: 4,
              py: 1.5,
              fontSize: 16,
              borderColor: '#1976d2',
              color: '#1976d2',
              ':hover': { borderColor: '#1565c0', color: '#1565c0' }
            }}
          >
            {loading ? <CircularProgress size={20} /> : 'Create Missing Rentals'}
          </Button>
        </Box>

        {/* Show message if no rentals */}
        {customers.length === 0 && (
          <Box p={4} textAlign="center">
            No rentals found. Check your data or Supabase query.
          </Box>
        )}

        {/* Customer Rentals Section */}
        {customers.length > 0 && (
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary" mb={2}>
              👥 Customer Rentals ({customers.length} customers)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              These bottles are currently rented to customers.
            </Typography>
            <Paper
              elevation={3}
              sx={{
                borderRadius: 4,
                p: 0,
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ width: '100%', overflowX: 'auto', mt: 3 }}>
                <TableContainer
                  sx={{
                    borderRadius: 2,
                    width: '100%',
                    minWidth: isMobile ? 700 : '100%',
                    maxWidth: '100%',
                    boxShadow: 'none',
                  }}
                >
                  <Table sx={{ width: '100%', minWidth: 700 }}>
                    <TableHead>
                      <TableRow sx={{ background: '#fafbfc' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}>Total Bottles</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}>Rental Rate</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}>Rental Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}>Tax Code</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}>Actions</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedCustomers.map(({ customer, rentals }) => {
                        const expanded = expandedCustomer === customer.CustomerListID;
                        const edit = editMap[customer.CustomerListID] || defaultEdit(rentals);
                        const saving = savingMap[customer.CustomerListID] || false;
                        return (
                          <React.Fragment key={customer.CustomerListID}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}>
                                {customer.name}
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  ({customer.CustomerListID})
                                </Typography>
                                {/* Show source indicator */}
                                {rentals.some(r => r.source === 'bottle_assignment') && (
                                  <Chip
                                    label="From Import"
                                    size="small"
                                    color="info"
                                    sx={{ ml: 1, fontSize: 10, height: 20 }}
                                  />
                                )}
                                <Button
                                  variant="outlined"
                                  sx={{
                                    borderRadius: 999,
                                    ml: 2,
                                    fontWeight: 700,
                                    color: '#1976d2',
                                    borderColor: '#1976d2',
                                    textTransform: 'none',
                                    px: 2,
                                    py: 0.5,
                                    fontSize: 15
                                  }}
                                  onClick={() => navigate(`/customer/${customer.CustomerListID}`)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Typography variant="h6" fontWeight={700} color="primary">
                                  {rentals.length}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  value={edit.rentalRate}
                                  onChange={e => handleEditChange(customer.CustomerListID, 'rentalRate', e.target.value)}
                                  size="small"
                                  sx={{ width: 80, bgcolor: '#fff' }}
                                />
                              </TableCell>
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 110, bgcolor: '#fff' }}>
                                  <Select
                                    value={edit.rentalType}
                                    onChange={e => handleEditChange(customer.CustomerListID, 'rentalType', e.target.value)}
                                    size="small"
                                  >
                                    <MenuItem value="Monthly">Monthly</MenuItem>
                                    <MenuItem value="Yearly">Yearly</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 90, bgcolor: '#fff' }}>
                                  <Select
                                    value={edit.taxCode}
                                    onChange={e => handleEditChange(customer.CustomerListID, 'taxCode', e.target.value)}
                                    size="small"
                                  >
                                    <MenuItem value="GST">GST</MenuItem>
                                    <MenuItem value="PST">PST</MenuItem>
                                    <MenuItem value="None">None</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 120, bgcolor: '#fff' }}>
                                  <Select
                                    value={edit.location}
                                    onChange={e => handleEditChange(customer.CustomerListID, 'location', e.target.value)}
                                    size="small"
                                  >
                                    <MenuItem value="SASKATOON">SASKATOON</MenuItem>
                                    <MenuItem value="REGINA">REGINA</MenuItem>
                                    <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
                                    <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
                                    <MenuItem value="None">None</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => handleSave(customer.CustomerListID, rentals)}
                                  disabled={saving}
                                  sx={{
                                    bgcolor: '#4caf50',
                                    color: '#fff',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    ':hover': { bgcolor: '#45a049' }
                                  }}
                                >
                                  {saving ? <CircularProgress size={20} /> : 'Save'}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  onClick={() => setExpandedCustomer(expanded ? null : customer.CustomerListID)}
                                  size="small"
                                >
                                  {expanded ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                                </IconButton>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={8} sx={{ p: 0, border: 0, bgcolor: '#fcfcfc' }}>
                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, pl: 4 }}>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>
                                      Rentals for {customer.name}
                                    </Typography>
                                    <Table size="small" sx={{ width: '100%' }}>
                                      <TableHead>
                                        <TableRow>
                                          <TableCell sx={{ fontWeight: 700 }}>Bottle Type</TableCell>
                                          <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                                          <TableCell sx={{ fontWeight: 700 }}>Rental Type</TableCell>
                                          <TableCell sx={{ fontWeight: 700 }}>Rental Rate</TableCell>
                                          <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                                          <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                                          <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {rentals.map(rental => (
                                          <TableRow key={rental.id}>
                                            <TableCell>
                                              {rental.bottles
                                                ? rental.bottles.gas_type || rental.bottles.description || '—'
                                                : '—'}
                                            </TableCell>
                                            <TableCell>
                                              {rental.bottles?.barcode_number || '—'}
                                            </TableCell>
                                            <TableCell>
                                              <FormControl size="small" sx={{ minWidth: 110, bgcolor: '#fff' }}>
                                                <Select
                                                  value={rental.rental_type || 'Monthly'}
                                                  size="small"
                                                  onChange={async e => {
                                                    await supabase.from('rentals').update({ rental_type: e.target.value }).eq('id', rental.id);
                                                  }}
                                                >
                                                  <MenuItem value="Monthly">Monthly</MenuItem>
                                                  <MenuItem value="Yearly">Yearly</MenuItem>
                                                </Select>
                                              </FormControl>
                                            </TableCell>
                                            <TableCell>
                                              <TextField
                                                value={rental.rental_amount || ''}
                                                size="small"
                                                sx={{ width: 80, bgcolor: '#fff' }}
                                                onChange={async e => {
                                                  await supabase.from('rentals').update({ rental_amount: e.target.value }).eq('id', rental.id);
                                                }}
                                              />
                                            </TableCell>
                                            <TableCell>{rental.rental_start_date}</TableCell>
                                            <TableCell>
                                              <FormControl size="small" sx={{ minWidth: 120, bgcolor: '#fff' }}>
                                                <Select
                                                  value={rental.location || 'None'}
                                                  size="small"
                                                  onChange={async e => {
                                                    const newLocation = e.target.value;
                                                    let taxRate = 0;
                                                    let taxCode = rental.tax_code;
                                                    
                                                    if (newLocation && newLocation !== 'None') {
                                                      try {
                                                        const { data: locationData } = await supabase
                                                          .from('locations')
                                                          .select('total_tax_rate')
                                                          .eq('id', newLocation.toLowerCase())
                                                          .single();
                                                        
                                                        if (locationData) {
                                                          taxRate = locationData.total_tax_rate;
                                                          taxCode = 'GST+PST';
                                                        }
                                                      } catch (e) {
                                                        console.warn('Could not fetch tax rate for location:', newLocation);
                                                      }
                                                    }
                                                    
                                                    await supabase.from('rentals').update({ 
                                                      location: newLocation,
                                                      tax_rate: taxRate,
                                                      tax_code: taxCode
                                                    }).eq('id', rental.id);
                                                    
                                                    // Refresh the data after update
                                                    await fetchRentals();
                                                  }}
                                                >
                                                  <MenuItem value="SASKATOON">SASKATOON</MenuItem>
                                                  <MenuItem value="REGINA">REGINA</MenuItem>
                                                  <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
                                                  <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
                                                  <MenuItem value="None">None</MenuItem>
                                                </Select>
                                              </FormControl>
                                            </TableCell>
                                            <TableCell>
                                              <Button
                                                variant="outlined"
                                                sx={{
                                                  borderRadius: 999,
                                                  fontWeight: 700,
                                                  color: '#1976d2',
                                                  borderColor: '#1976d2',
                                                  textTransform: 'none',
                                                  px: 2,
                                                  py: 0.5,
                                                  fontSize: 15
                                                }}
                                                onClick={() => navigate(`/customer/${customer.CustomerListID}`)}
                                              >
                                                View Details
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box display="flex" justifyContent="center" alignItems="center" my={2}>
                  <Button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Typography mx={2}>
                    Page {page + 1} of {Math.ceil(customers.length / rowsPerPage)}
                  </Typography>
                  <Button
                    onClick={() => setPage(p => Math.min(Math.ceil(customers.length / rowsPerPage) - 1, p + 1))}
                    disabled={page >= Math.ceil(customers.length / rowsPerPage) - 1}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default Rentals; 