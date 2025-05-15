import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Collapse, IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

function EditableRentalRow({ rental, canEdit, onSave }) {
  const [amount, setAmount] = useState(rental.rental_amount ?? 10);
  const [type, setType] = useState(rental.rental_type || 'monthly');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('rentals')
      .update({ rental_amount: amount, rental_type: type })
      .eq('id', rental.id);
    setSaving(false);
    if (error) setError(error.message);
    else onSave();
  };

  return (
    <TableRow>
      <TableCell>{rental.cylinder.serial_number}</TableCell>
      <TableCell>{rental.cylinder.gas_type}</TableCell>
      <TableCell>
        <TextField
          select
          value={type}
          onChange={e => setType(e.target.value)}
          size="small"
          disabled={!canEdit}
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </TextField>
      </TableCell>
      <TableCell>
        <TextField
          type="number"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          size="small"
          disabled={!canEdit}
        />
      </TableCell>
      <TableCell>{rental.rental_start_date}</TableCell>
      <TableCell>{rental.rental_end_date || '-'}</TableCell>
      {canEdit && (
        <TableCell>
          <Button onClick={handleSave} size="small" disabled={saving} variant="contained">{saving ? <CircularProgress size={18} /> : 'Save'}</Button>
        </TableCell>
      )}
    </TableRow>
  );
}

function Rentals({ profile }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [showEndRentalModal, setShowEndRentalModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [endDate, setEndDate] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRentals = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rentalsError } = await supabase
          .from('rentals')
          .select(`*, customer:customer_id (CustomerListID, name, customer_number), cylinder:cylinder_id (id, serial_number, gas_type)`)
          .eq('status', statusFilter)
          .order('rental_start_date', { ascending: false });
        if (rentalsError) throw rentalsError;
        setRentals(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchRentals();
  }, [statusFilter]);

  // Group rentals by customer
  const customers = [];
  const customerMap = {};
  for (const rental of rentals) {
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

  const openEndRentalModal = (rental) => {
    setSelectedRental(rental);
    setEndDate(new Date().toISOString().split('T')[0]);
    setShowEndRentalModal(true);
  };

  const handleEndRental = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { error: rentalError } = await supabase
        .from('rentals')
        .update({ status: 'ended', rental_end_date: endDate })
        .eq('id', selectedRental.id);
      if (rentalError) throw rentalError;
      const { error: cylinderError } = await supabase
        .from('cylinders')
        .update({ assigned_customer: null, rental_start_date: null })
        .eq('id', selectedRental.cylinder.id);
      if (cylinderError) throw cylinderError;
      setShowEndRentalModal(false);
      const { data, error: refreshError } = await supabase
        .from('rentals')
        .select(`*, customer:customer_id (CustomerListID, name, customer_number), cylinder:cylinder_id (id, serial_number, gas_type)`)
        .eq('status', statusFilter)
        .order('rental_start_date', { ascending: false });
      if (refreshError) throw refreshError;
      setRentals(data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;

  return (
    <Box maxWidth="lg" mx="auto" mt={4}>
      <Paper elevation={6} sx={{ borderRadius: 4, p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" fontWeight={800} color="primary">Rentals</Typography>
          <Button variant="outlined" color="secondary" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </Box>
        <Box display="flex" gap={2} mb={2}>
          <Button
            variant={statusFilter === 'active' ? 'contained' : 'outlined'}
            color="primary"
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'ended' ? 'contained' : 'outlined'}
            color="primary"
            onClick={() => setStatusFilter('ended')}
          >
            Ended
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell># of Cylinders</TableCell>
                <TableCell>Expand</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map(({ customer, rentals }) => (
                <React.Fragment key={customer.CustomerListID}>
                  <TableRow hover onClick={() => setExpandedCustomer(expandedCustomer === customer.CustomerListID ? null : customer.CustomerListID)}>
                    <TableCell>{customer.name} <Typography variant="caption" color="text.secondary">({customer.customer_number})</Typography></TableCell>
                    <TableCell align="center">{rentals.length}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small">
                        {expandedCustomer === customer.CustomerListID ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedCustomer === customer.CustomerListID} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 1 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Cylinder</TableCell>
                                <TableCell>Gas Type</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Start Date</TableCell>
                                <TableCell>End Date</TableCell>
                                {canEdit && statusFilter === 'active' && <TableCell>Actions</TableCell>}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {rentals.map(rental => (
                                <EditableRentalRow
                                  key={rental.id}
                                  rental={rental}
                                  canEdit={canEdit && statusFilter === 'active'}
                                  onSave={() => {
                                    const fetchRentals = async () => {
                                      const { data } = await supabase
                                        .from('rentals')
                                        .select(`*, customer:customer_id (CustomerListID, name, customer_number), cylinder:cylinder_id (id, serial_number, gas_type)`)
                                        .eq('status', statusFilter)
                                        .order('rental_start_date', { ascending: false });
                                      setRentals(data);
                                    };
                                    fetchRentals();
                                  }}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {/* End Rental Modal */}
        <Dialog open={showEndRentalModal} onClose={() => setShowEndRentalModal(false)}>
          <DialogTitle>End Rental</DialogTitle>
          <DialogContent>
            <Typography mb={2}>
              End rental for cylinder <b>{selectedRental?.cylinder?.serial_number}</b><br />
              <span style={{ fontSize: 12, color: '#666' }}>Rented to: {selectedRental?.customer?.name}</span>
            </Typography>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEndRentalModal(false)}>Cancel</Button>
            <Button onClick={handleEndRental} variant="contained" color="primary">End Rental</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}

export default Rentals; 