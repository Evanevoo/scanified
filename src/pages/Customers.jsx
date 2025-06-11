import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Checkbox, CircularProgress, Alert, Snackbar
} from '@mui/material';
import Pagination from '@mui/material/Pagination';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

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
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

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

  // Pagination logic
  const filteredCustomers = customers
    .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const pageCount = Math.ceil(filteredCustomers.length / rowsPerPage);
  const paginatedCustomers = filteredCustomers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Customers</Typography>
        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2} sx={{ p: 3, pb: 0 }}>
          <Button variant="outlined" sx={{ fontWeight: 700, borderRadius: 8, px: 3, color: '#0074e8', borderColor: '#bdbdbd', background: '#fff', ':hover': { borderColor: '#0074e8', background: '#f5faff' } }} onClick={() => exportToCSV(customers)}>
            Export to CSV
          </Button>
          <Button
            variant="contained"
            sx={{ fontWeight: 700, borderRadius: 8, px: 3, bgcolor: selected.length > 0 ? '#e53935' : '#e0e0e0', color: selected.length > 0 ? '#fff' : '#444', boxShadow: 'none' }}
            disabled={selected.length === 0}
            onClick={handleBulkDelete}
          >
            Delete Selected
          </Button>
          <Button variant="contained" sx={{ fontWeight: 700, borderRadius: 8, px: 3, bgcolor: '#111', color: '#fff', boxShadow: 'none', ':hover': { bgcolor: '#222' } }} onClick={() => navigate('/')}>Back to Dashboard</Button>
        </Box>
        <Box sx={{ p: 3, pt: 2 }}>
          <Typography variant="h4" fontWeight={800} color="#1976d2" sx={{ mb: 2 }}>Customers</Typography>
          <TextField
            placeholder="Search customers"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            fullWidth
            size="medium"
            sx={{ mb: 3, maxWidth: 400 }}
          />
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Rows per page</InputLabel>
              <Select value={rowsPerPage} label="Rows per page" onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 50, 100].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              Showing {paginatedCustomers.length} of {filteredCustomers.length} customers
            </Typography>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%', maxWidth: '100%' }}>
            <Table size="medium" sx={{ width: '100%' }}>
              <TableHead>
                <TableRow sx={{ background: '#fafbfc' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selected.includes(c.CustomerListID))}
                      indeterminate={paginatedCustomers.some(c => selected.includes(c.CustomerListID)) && !paginatedCustomers.every(c => selected.includes(c.CustomerListID))}
                      onChange={() => {
                        const allIds = paginatedCustomers.map(c => c.CustomerListID);
                        if (allIds.every(id => selected.includes(id))) {
                          setSelected(selected.filter(id => !allIds.includes(id)));
                        } else {
                          setSelected([...new Set([...selected, ...allIds])]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Assets</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCustomers.map((c, idx) => (
                  <TableRow key={c.CustomerListID} sx={{ borderBottom: '1.5px solid #f0f0f0' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(c.CustomerListID)}
                        onChange={() => handleSelect(c.CustomerListID)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1976d2', cursor: 'pointer' }} onClick={() => navigate(`/customers/${c.CustomerListID}`)}>
                      {c.name}
                    </TableCell>
                    <TableCell>{c.CustomerListID}</TableCell>
                    <TableCell>{c.contact_details}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.assets || 0}</TableCell>
                    <TableCell>
                      <Button variant="text" sx={{ color: '#1976d2', fontWeight: 700, textTransform: 'none', minWidth: 0, px: 1 }} onClick={() => navigate(`/customers/${c.CustomerListID}`)}>Edit</Button>
                      <Button variant="text" sx={{ color: '#e53935', fontWeight: 700, textTransform: 'none', minWidth: 0, px: 1 }} onClick={() => handleDelete(c.CustomerListID)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box display="flex" justifyContent="center" alignItems="center" my={2}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default Customers; 