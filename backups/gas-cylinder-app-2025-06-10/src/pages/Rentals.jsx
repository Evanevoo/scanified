import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, IconButton, TextField, CircularProgress
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
        Serial: rental.cylinder.serial_number,
        Type: rental.cylinder.gas_type,
        RentalType: rental.rental_type,
        RentalRate: rental.rental_amount,
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
  a.download = 'rentals.csv';
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
        const { data, error: rentalsError } = await supabase
          .from('rentals')
          .select(`*, customer:customer_id (CustomerListID, name, customer_number), cylinder:cylinder_id (id, serial_number, gas_type)`)
          .order('rental_start_date', { ascending: false });
        if (rentalsError) throw rentalsError;
        setRentals(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchRentals();
  }, []);

  // Group rentals by customer, skip if missing customer or cylinder
  const customers = [];
  const customerMap = {};
  for (const rental of rentals) {
    if (!rental.customer || !rental.cylinder) continue; // <-- skip bad data
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

  // Debug logging
  console.log('rentals', rentals);
  console.log('customers', customers);

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
    await Promise.all(rentals.map(rental =>
      supabase.from('rentals').update({
        rental_amount: edit.rentalRate,
        rental_type: edit.rentalType,
        tax_code: edit.taxCode,
        location: edit.location
      }).eq('id', rental.id)
    ));
    setSavingMap(prev => ({ ...prev, [custId]: false }));
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;
  if (!loading && customers.length === 0) {
    return <Box p={4} textAlign="center">No rentals found. Check your data or Supabase query.</Box>;
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', mx: 0, mt: isMobile ? 1 : 4 }}>
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
        <Box
          display="flex"
          flexDirection={isMobile ? 'column' : 'row'}
          justifyContent="space-between"
          alignItems={isMobile ? 'stretch' : 'center'}
          sx={{ p: isMobile ? 2 : 3, pb: 0, gap: isMobile ? 2 : 0 }}
        >
          <Typography
            variant={isMobile ? 'h5' : 'h3'}
            fontWeight={900}
            color="#1976d2"
            sx={{ letterSpacing: 1 }}
          >
            Rentals
          </Typography>
          <Button
            variant="contained"
            sx={{
              borderRadius: 999,
              bgcolor: '#a259d9',
              color: '#fff',
              fontWeight: 700,
              px: isMobile ? 2 : 4,
              py: 1.5,
              fontSize: isMobile ? 15 : 18,
              boxShadow: 'none',
              mt: isMobile ? 1 : 0,
              width: isMobile ? '100%' : 'auto',
              ':hover': { bgcolor: '#7c3bbd' },
            }}
            startIcon={<DownloadIcon />}
            onClick={() => exportToCSV(customers)}
            fullWidth={isMobile}
          >
            Export Invoices
          </Button>
        </Box>
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
                  <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}># of Bottles</TableCell>
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
                        <TableCell>{rentals.length}</TableCell>
                        <TableCell>
                          <TextField
                            value={edit.rentalRate}
                            onChange={e => handleEditChange(customer.CustomerListID, 'rentalRate', e.target.value)}
                            size="small"
                            sx={{ width: 80, bgcolor: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            value={edit.rentalType}
                            onChange={e => handleEditChange(customer.CustomerListID, 'rentalType', e.target.value)}
                            size="small"
                            SelectProps={{ native: true }}
                            sx={{ minWidth: 110, bgcolor: '#fff' }}
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Yearly">Yearly</option>
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            value={edit.taxCode}
                            onChange={e => handleEditChange(customer.CustomerListID, 'taxCode', e.target.value)}
                            size="small"
                            SelectProps={{ native: true }}
                            sx={{ minWidth: 90, bgcolor: '#fff' }}
                          >
                            <option value="GST">GST</option>
                            <option value="PST">PST</option>
                            <option value="None">None</option>
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            value={edit.location}
                            onChange={e => handleEditChange(customer.CustomerListID, 'location', e.target.value)}
                            size="small"
                            SelectProps={{ native: true }}
                            sx={{ minWidth: 120, bgcolor: '#fff' }}
                          >
                            <option value="SASKATOON">SASKATOON</option>
                            <option value="REGINA">REGINA</option>
                            <option value="None">None</option>
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            sx={{
                              borderRadius: 999,
                              bgcolor: '#111',
                              color: '#fff',
                              fontWeight: 700,
                              px: 4,
                              py: 1,
                              fontSize: 16,
                              boxShadow: 'none',
                              ':hover': { bgcolor: '#222' }
                            }}
                            onClick={() => handleSave(customer.CustomerListID, rentals)}
                            disabled={saving}
                          >
                            {saving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => setExpandedCustomer(expanded ? null : customer.CustomerListID)}
                          >
                            {expanded ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      {/* Expanded Cylinder Details */}
                      <TableRow>
                        <TableCell colSpan={8} sx={{ p: 0, border: 0, bgcolor: '#fcfcfc' }}>
                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, pl: 4 }}>
                              <Typography fontWeight={700} sx={{ mb: 1 }}>
                                Cylinders for {customer.name}
                              </Typography>
                              <Table size="small" sx={{ width: '100%' }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Serial #</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
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
                                      <TableCell>{rental.cylinder.serial_number}</TableCell>
                                      <TableCell>{rental.cylinder.gas_type}</TableCell>
                                      <TableCell>
                                        <TextField
                                          select
                                          value={rental.rental_type}
                                          size="small"
                                          SelectProps={{ native: true }}
                                          sx={{ minWidth: 110, bgcolor: '#fff' }}
                                          onChange={async e => {
                                            await supabase.from('rentals').update({ rental_type: e.target.value }).eq('id', rental.id);
                                          }}
                                        >
                                          <option value="Monthly">Monthly</option>
                                          <option value="Yearly">Yearly</option>
                                        </TextField>
                                      </TableCell>
                                      <TableCell>
                                        <TextField
                                          value={rental.rental_amount}
                                          size="small"
                                          sx={{ width: 80, bgcolor: '#fff' }}
                                          onChange={async e => {
                                            await supabase.from('rentals').update({ rental_amount: e.target.value }).eq('id', rental.id);
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell>{rental.rental_start_date || '-'}</TableCell>
                                      <TableCell>
                                        <TextField
                                          select
                                          value={rental.location || 'None'}
                                          size="small"
                                          SelectProps={{ native: true }}
                                          sx={{ minWidth: 120, bgcolor: '#fff' }}
                                          onChange={async e => {
                                            await supabase.from('rentals').update({ location: e.target.value }).eq('id', rental.id);
                                          }}
                                        >
                                          <option value="SASKATOON">SASKATOON</option>
                                          <option value="REGINA">REGINA</option>
                                          <option value="None">None</option>
                                        </TextField>
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
                                          onClick={() => navigate(`/customer/${customer.CustomerListID}/cylinder/${rental.cylinder.serial_number}`)}
                                        >
                                          View
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
  );
}

export default Rentals; 