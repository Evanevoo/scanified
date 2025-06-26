import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, IconButton, TextField, CircularProgress, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

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

  useEffect(() => {
    const fetchRentals = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all rentals
        const { data: rentalsData, error: rentalsError } = await supabase
          .from('rentals')
          .select('*')
          .order('rental_start_date', { ascending: false });
        if (rentalsError) throw rentalsError;
        // Get unique customer_ids
        const customerIds = Array.from(new Set((rentalsData || []).map(r => r.customer_id).filter(Boolean)));
        let customersMap = {};
        if (customerIds.length > 0) {
          // Fetch all customers in one query
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .in('CustomerListID', customerIds);
          if (!customersError && customersData) {
            customersMap = customersData.reduce((map, c) => {
              map[c.CustomerListID] = c;
              return map;
            }, {});
          }
        }
        // Attach customer info to each rental
        const rentalsWithCustomer = (rentalsData || []).map(r => ({
          ...r,
          customer: customersMap[r.customer_id] || null
        }));
        setRentals(rentalsWithCustomer);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
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
  
  const paginatedCustomers = customers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

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
      await Promise.all(rentals.map(rental =>
        supabase.from('rentals').update({
          rental_amount: edit.rentalRate,
          rental_type: edit.rentalType,
          tax_code: edit.taxCode,
          location: edit.location
        }).eq('id', rental.id)
      ));
      // Refresh data
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .order('rental_start_date', { ascending: false });
      setRentals(data);
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

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Rentals</Typography>
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
                                            <TableCell>{rental.bottle?.description || rental.bottle?.gas_type || 'Unknown'}</TableCell>
                                            <TableCell>
                                              {rental.bottle?.barcode_number ? (
                                                <Link
                                                  to={`/bottle/${rental.bottle.id}`}
                                                  style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                                                >
                                                  {rental.bottle.barcode_number}
                                                </Link>
                                              ) : 'N/A'}
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
                                                    await supabase.from('rentals').update({ location: e.target.value }).eq('id', rental.id);
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