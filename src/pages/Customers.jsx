import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Checkbox, CircularProgress, Alert, Snackbar, FormControl, InputLabel, Select, MenuItem, Pagination
} from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../hooks/useAuth';

// Remove CustomersErrorBoundary and replace with a FallbackComponent
function CustomersErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Box p={3}>
      <Typography variant="h6" color="error">
        Error loading Customers page
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {error?.message || 'An unknown error occurred'}
      </Typography>
      <Button 
        variant="contained" 
        onClick={resetErrorBoundary}
        sx={{ mt: 2 }}
      >
        Try Again
      </Button>
    </Box>
  );
}

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
    'total_assets'
  ];
  const rows = customers.map(c => [
    c.CustomerListID,
    c.CustomerListID,
    c.customer_number,
    c.barcode,
    c.name,
    c.contact_details,
    c.phone,
    c.total_assets || 0
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

async function exportAllCustomersToCSV(organizationId) {
  try {
    const { data: allCustomers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    
    if (error) throw error;
    
    if (!allCustomers || allCustomers.length === 0) {
      alert('No customers found to export.');
      return;
    }
    
    exportToCSV(allCustomers);
  } catch (error) {
    console.error('Error exporting customers:', error);
    alert('Error exporting customers: ' + error.message);
  }
}

function Customers({ profile }) {
  console.log('Customers component rendering, profile:', profile);
  
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ CustomerListID: '', name: '', contact_details: '', phone: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [successMsg, setSuccessMsg] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [assetCounts, setAssetCounts] = useState({});

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';
  const navigate = useNavigate();
  const { organization } = useAuth();

  // Fetch customers with pagination
  useEffect(() => {
    if (!organization?.id) return;
    const fetchCustomers = async () => {
      console.log('Fetching customers...');
      setLoading(true);
      try {
        const from = (page - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;

        // Build query with filters
        let query = supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id);

        // Apply location filter
        if (locationFilter !== 'All') {
          query = query.eq('location', locationFilter);
        }

        // Get total count
        const { count, error: countError } = await query;

        if (countError) {
          console.error('Error getting count:', countError);
          throw countError;
        }

        setTotalCount(count || 0);

        // Get paginated customers
        let dataQuery = supabase
          .from('customers')
          .select('*')
          .order('name')
          .range(from, to)
          .eq('organization_id', organization.id);

        // Apply location filter to data query
        if (locationFilter !== 'All') {
          dataQuery = dataQuery.eq('location', locationFilter);
        }

        const { data, error } = await dataQuery;

        if (error) {
          console.error('Error fetching customers:', error);
          throw error;
        }
        
        console.log('Customers fetched successfully:', data?.length || 0);
        setCustomers(data || []);

        // Fetch asset counts for these customers
        if (data && data.length > 0) {
          const customerIds = data.map(c => c.CustomerListID);
          const { data: rentalData, error: rentalError } = await supabase
            .from('rentals')
            .select('customer_id')
            .in('customer_id', customerIds)
            .is('rental_end_date', null); // Only active rentals

          if (rentalError) {
            console.error('Error fetching rental data:', rentalError);
          } else {
            const counts = {};
            rentalData?.forEach(rental => {
              counts[rental.customer_id] = (counts[rental.customer_id] || 0) + 1;
            });
            setAssetCounts(counts);
          }
        }
      } catch (err) {
        console.error('Error in fetchCustomers:', err);
        setError(err.message);
      }
      setLoading(false);
    };

    fetchCustomers();
  }, [page, rowsPerPage, locationFilter, organization]);

  // Debounced search
  const debouncedSearch = useMemo(() => {
    let timeoutId;
    return (value) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSearchTerm(value);
        setPage(1); // Reset to first page when searching
      }, 300);
    };
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!organization?.id) return;
    setError(null);
    if (!form.CustomerListID || !form.CustomerListID.trim()) {
      setError('CustomerListID is required.');
      return;
    }
    try {
      const { error } = await supabase.from('customers').insert([{ ...form, organization_id: organization.id }]);
      if (error) throw error;
      
      setForm({ CustomerListID: '', name: '', contact_details: '', phone: '' });
      setSuccessMsg('Customer added successfully!');
      
      // Refresh the current page
      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name')
        .range(from, to)
        .eq('organization_id', organization.id);
      setCustomers(data || []);
      setTotalCount(prev => prev + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.CustomerListID);
    setForm(customer);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!organization?.id) return;
    setError(null);
    if (!form.CustomerListID || !form.CustomerListID.trim()) {
      setError('CustomerListID is required.');
      return;
    }
    try {
      const { error } = await supabase.from('customers').update(form).eq('CustomerListID', editingId).eq('organization_id', organization.id);
      if (error) throw error;
      
      setEditingId(null);
      setForm({ CustomerListID: '', name: '', contact_details: '', phone: '' });
      setSuccessMsg('Customer updated successfully!');
      
      // Refresh current page
      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name')
        .range(from, to)
        .eq('organization_id', organization.id);
      setCustomers(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!organization?.id) return;
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    
    setError(null);
    try {
      const { error } = await supabase.from('customers').delete().eq('CustomerListID', id).eq('organization_id', organization.id);
      if (error) throw error;
      
      setSuccessMsg('Customer deleted successfully!');
      setSelected(prev => prev.filter(sid => sid !== id));
      
      // Refresh current page
      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name')
        .range(from, to)
        .eq('organization_id', organization.id);
      setCustomers(data || []);
      setTotalCount(prev => prev - 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
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
    if (!organization?.id) return;
    if (!window.confirm(`Delete ${selected.length} selected customers? This cannot be undone.`)) return;
    
    setError(null);
    try {
      const { error } = await supabase.from('customers').delete().in('CustomerListID', selected).eq('organization_id', organization.id);
      if (error) throw error;
      
      setSuccessMsg(`${selected.length} customers deleted successfully!`);
      setSelected([]);
      
      // Refresh current page
      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name')
        .range(from, to)
        .eq('organization_id', organization.id);
      setCustomers(data || []);
      setTotalCount(prev => prev - selected.length);
    } catch (err) {
      setError(err.message);
    }
  };

  // Defensive filter: only show customers for this organization
  const filteredCustomers = customers
    .filter(c => c.organization_id === organization?.id)
    .filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.CustomerListID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_details?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const pageCount = Math.ceil(totalCount / rowsPerPage);

  if (!organization?.id) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1 }}>Customers</Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => exportAllCustomersToCSV(organization.id)}
            sx={{ ml: 2 }}
          >
            Export All Customers
          </Button>
        </Box>
        
        {/* Action Buttons */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box display="flex" gap={2}>
            <Button 
              variant="outlined" 
              sx={{ 
                fontWeight: 700, 
                borderRadius: 8, 
                px: 3, 
                color: '#0074e8', 
                borderColor: '#bdbdbd', 
                background: '#fff', 
                ':hover': { borderColor: '#0074e8', background: '#f5faff' } 
              }} 
              onClick={() => exportToCSV(customers)}
            >
              Export to CSV
            </Button>
            <Button
              variant="contained"
              sx={{ 
                fontWeight: 700, 
                borderRadius: 8, 
                px: 3, 
                bgcolor: selected.length > 0 ? '#e53935' : '#e0e0e0', 
                color: selected.length > 0 ? '#fff' : '#444', 
                boxShadow: 'none',
                ':hover': { bgcolor: selected.length > 0 ? '#d32f2f' : '#e0e0e0' }
              }}
              disabled={selected.length === 0}
              onClick={handleBulkDelete}
            >
              Delete Selected ({selected.length})
            </Button>
          </Box>
          <Button 
            variant="contained" 
            sx={{ 
              fontWeight: 700, 
              borderRadius: 8, 
              px: 3, 
              bgcolor: '#111', 
              color: '#fff', 
              boxShadow: 'none', 
              ':hover': { bgcolor: '#222' } 
            }} 
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </Button>
        </Box>

        {/* Search and Controls */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="#1976d2" sx={{ mb: 2 }}>Customer Management</Typography>
          
          <Box display="flex" gap={2} alignItems="center" mb={3}>
            <TextField
              placeholder="Search customers by name, ID, or contact..."
              onChange={e => debouncedSearch(e.target.value)}
              fullWidth
              size="medium"
              sx={{ maxWidth: 400 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="All">All Locations</MenuItem>
                <MenuItem value="SASKATOON">SASKATOON</MenuItem>
                <MenuItem value="REGINA">REGINA</MenuItem>
                <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
                <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Rows per page</InputLabel>
              <Select 
                value={rowsPerPage} 
                label="Rows per page" 
                onChange={e => { 
                  setRowsPerPage(Number(e.target.value)); 
                  setPage(1); 
                }}
              >
                {[10, 20, 50, 100].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          
          <Typography variant="body2" color="text.secondary" mb={2}>
            Showing {customers.length} of {totalCount} customers
            {searchTerm && ` (filtered by "${searchTerm}")`}
            {locationFilter !== 'All' && ` (location: ${locationFilter})`}
          </Typography>
        </Box>

        {/* Customer Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%', maxWidth: '100%', mb: 3 }}>
          <Table size="medium" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow sx={{ background: '#fafbfc' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={customers.length > 0 && customers.every(c => selected.includes(c.CustomerListID))}
                    indeterminate={customers.some(c => selected.includes(c.CustomerListID)) && !customers.every(c => selected.includes(c.CustomerListID))}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Assets</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCustomers.map((c) => (
                <TableRow key={c.CustomerListID} sx={{ borderBottom: '1.5px solid #f0f0f0' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(c.CustomerListID)}
                      onChange={() => handleSelect(c.CustomerListID)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1976d2', cursor: 'pointer' }} onClick={() => navigate(`/customer/${c.CustomerListID}`)}>
                    {c.name}
                  </TableCell>
                  <TableCell>{c.CustomerListID}</TableCell>
                  <TableCell>{c.contact_details}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      {assetCounts[c.CustomerListID] || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="text" 
                      sx={{ 
                        color: '#1976d2', 
                        fontWeight: 700, 
                        textTransform: 'none', 
                        minWidth: 0, 
                        px: 1 
                      }} 
                      onClick={() => navigate(`/customer/${c.CustomerListID}`)}
                    >
                      View
                    </Button>
                    {canEdit && (
                      <>
                        <Button 
                          variant="text" 
                          sx={{ 
                            color: '#1976d2', 
                            fontWeight: 700, 
                            textTransform: 'none', 
                            minWidth: 0, 
                            px: 1 
                          }} 
                          onClick={() => handleEdit(c)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="text" 
                          sx={{ 
                            color: '#e53935', 
                            fontWeight: 700, 
                            textTransform: 'none', 
                            minWidth: 0, 
                            px: 1 
                          }} 
                          onClick={() => handleDelete(c.CustomerListID)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box display="flex" justifyContent="center" alignItems="center" my={2}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
            size="large"
          />
        </Box>

        {/* Success/Error Messages */}
        <Snackbar open={!!successMsg} autoHideDuration={6000} onClose={() => setSuccessMsg('')}>
          <Alert onClose={() => setSuccessMsg('')} severity="success" sx={{ width: '100%' }}>
            {successMsg}
          </Alert>
        </Snackbar>
        
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

// Export Customers wrapped in ErrorBoundary
export default function CustomersWithBoundary(props) {
  return (
    <ErrorBoundary FallbackComponent={CustomersErrorFallback}>
      <Customers {...props} />
    </ErrorBoundary>
  );
} 