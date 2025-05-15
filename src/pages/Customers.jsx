import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Checkbox, CircularProgress, Alert, Snackbar
} from '@mui/material';

function exportToCSV(customers) {
  if (!customers.length) return;
  const headers = [
    'AccountNumber',
    'CustomerListID',
    'customer_number',
    'barcode',
    'name',
    'contact_details',
    'phone',
  ];
  const rows = customers.map(c => [
    c.CustomerListID,
    c.CustomerListID,
    c.customer_number,
    c.barcode,
    c.name,
    c.contact_details,
    c.phone,
  ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customers_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Customers({ profile }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ CustomerListID: '', name: '', contact_details: '', phone: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('customers').select('*').order('customer_number').limit(10000);
      if (error) setError(error.message);
      else setCustomers(data);
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.CustomerListID || !form.CustomerListID.trim()) {
      setError('CustomerListID is required.');
      return;
    }
    const { error } = await supabase.from('customers').insert([form]);
    if (error) setError(error.message);
    else {
      setForm({ CustomerListID: '', name: '', contact_details: '', phone: '' });
      const { data } = await supabase.from('customers').select('*').order('customer_number');
      setCustomers(data);
      setSuccessMsg('Customer added!');
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.CustomerListID);
    setForm(customer);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.CustomerListID || !form.CustomerListID.trim()) {
      setError('CustomerListID is required.');
      return;
    }
    const { error } = await supabase.from('customers').update(form).eq('CustomerListID', editingId);
    if (error) setError(error.message);
    else {
      setEditingId(null);
      setForm({ CustomerListID: '', name: '', contact_details: '', phone: '' });
      const { data } = await supabase.from('customers').select('*').order('customer_number');
      setCustomers(data);
      setSuccessMsg('Customer updated!');
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    const { error } = await supabase.from('customers').delete().eq('CustomerListID', id);
    if (error) setError(error.message);
    else {
      setCustomers(customers.filter(c => c.CustomerListID !== id));
      setSuccessMsg('Customer deleted!');
    }
  };

  const handleSelect = (id) => {
    setSelected(selected =>
      selected.includes(id) ? selected.filter(sid => sid !== id) : [...selected, id]
    );
  };

  const handleSelectAll = () => {
    if (selected.length === customers.length) {
      setSelected([]);
    } else {
      setSelected(customers.map(c => c.CustomerListID));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} selected customers? This cannot be undone.`)) return;
    setError(null);
    const { error } = await supabase.from('customers').delete().in('CustomerListID', selected);
    if (error) setError(error.message);
    else {
      setCustomers(customers.filter(c => !selected.includes(c.CustomerListID)));
      setSelected([]);
      setSuccessMsg('Selected customers deleted!');
    }
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;

  return (
    <Box maxWidth="lg" mx="auto" mt={4}>
      <Paper elevation={6} sx={{ borderRadius: 4, p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" fontWeight={800} color="primary">Customers</Typography>
          <Button variant="outlined" color="secondary" onClick={() => exportToCSV(customers)}>Export Customers</Button>
          <Button variant="outlined" color="secondary" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </Box>
        {/* Search Bar */}
        <Box mb={3} maxWidth={400}>
          <TextField
            label="Search customers by name, ID, or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
          />
        </Box>
        {canEdit && (
          <Box component="form" onSubmit={editingId ? handleUpdate : handleAdd} mb={3} display="flex" gap={2} flexWrap="wrap">
            <TextField name="CustomerListID" value={form.CustomerListID} onChange={handleChange} label="CustomerListID" size="small" required />
            <TextField name="name" value={form.name} onChange={handleChange} label="Name" size="small" />
            <TextField name="contact_details" value={form.contact_details} onChange={handleChange} label="Address" size="small" />
            <TextField name="phone" value={form.phone} onChange={handleChange} label="Phone" size="small" />
            <Button type="submit" variant="contained" color="primary">{editingId ? 'Update' : 'Add'}</Button>
            {editingId && <Button type="button" onClick={() => { setEditingId(null); setForm({ CustomerListID: '', name: '', contact_details: '', phone: '' }); }} variant="outlined" color="secondary">Cancel</Button>}
          </Box>
        )}
        {selected.length > 0 && (
          <Button onClick={handleBulkDelete} variant="contained" color="error" sx={{ mb: 2 }}>
            Delete Selected ({selected.length})
          </Button>
        )}
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.length === customers.length && customers.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>CustomerListID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Barcode</TableCell>
                {canEdit && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.filter(c =>
                c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.CustomerListID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((c, idx) => (
                <TableRow key={c.CustomerListID} hover selected={highlightedId === c.CustomerListID}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(c.CustomerListID)}
                      onChange={() => handleSelect(c.CustomerListID)}
                    />
                  </TableCell>
                  <TableCell>{c.CustomerListID}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.contact_details}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.barcode}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button size="small" variant="contained" color="primary" onClick={e => { e.stopPropagation(); handleEdit(c); }}>Edit</Button>
                      <Button size="small" variant="outlined" color="error" onClick={e => { e.stopPropagation(); handleDelete(c.CustomerListID); }} sx={{ ml: 1 }}>Delete</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Snackbar open={!!successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSuccessMsg('')} severity="success" sx={{ width: '100%' }}>{successMsg}</Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

export default Customers; 