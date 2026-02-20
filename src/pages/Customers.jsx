import logger from '../utils/logger';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Checkbox, CircularProgress, Alert, Snackbar, FormControl, InputLabel, Select, MenuItem, Pagination, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, Autocomplete
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../hooks/useAuth';
import { SearchInputWithIcon } from '../components/ui/search-input-with-icon';

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
    logger.error('Error exporting customers:', error);
    alert('Error exporting customers: ' + error.message);
  }
}

function Customers({ profile }) {
  logger.log('Customers component rendering, profile:', profile);
  
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ CustomerListID: '', name: '', email: '', contact_details: '', phone: '', customer_type: 'CUSTOMER', department: '', parent_customer_id: null });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [searchInput, setSearchInput] = useState(''); // Input value
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Debounced search term
  const [sortField, setSortField] = useState('name'); // Field to sort by
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [locationFilter, setLocationFilter] = useState('All');
  const [successMsg, setSuccessMsg] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [assetCounts, setAssetCounts] = useState({});
  const [parentNames, setParentNames] = useState({}); // parent_customer_id -> parent name
  const [parentOptions, setParentOptions] = useState([]); // { id, name, CustomerListID } for Add dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { organization, profile: authProfile } = useAuth();
  const effectiveProfile = profile || authProfile;
  const canEdit = effectiveProfile?.role === 'admin' || effectiveProfile?.role === 'manager';
  const initialLoadDone = useRef(false);

  // Reset initial-load flag when organization changes so we show spinner for the new org's first fetch
  useEffect(() => {
    initialLoadDone.current = false;
  }, [organization?.id]);

  // Create a stable fetch function
  const fetchCustomers = async (searchTerm = '') => {
    if (!organization?.id) return;
    
    logger.log('Fetching customers...');
    const isInitialLoad = !initialLoadDone.current;
    if (isInitialLoad) setLoading(true);
    try {
      // Build base query
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('organization_id', organization.id);

      // Apply location filter
      if (locationFilter !== 'All') {
        query = query.eq('location', locationFilter);
      }

      // Apply search filter if search term exists
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        query = query.or(`name.ilike.%${searchLower}%,CustomerListID.ilike.%${searchLower}%,contact_details.ilike.%${searchLower}%,phone.ilike.%${searchLower}%,city.ilike.%${searchLower}%,postal_code.ilike.%${searchLower}%`);
      }

      // Apply sorting
      const orderDirection = sortDirection === 'asc' ? 'asc' : 'desc';
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // If searching, get all results; otherwise use pagination
      let data, error, count;
      if (searchTerm.trim()) {
        // When searching, get all matching results
        const result = await query;
        data = result.data;
        error = result.error;
        count = result.count;
      } else {
        // When not searching, use pagination
        const from = (page - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;
        const result = await query.range(from, to);
        data = result.data;
        error = result.error;
        count = result.count;
      }

      if (error) {
        logger.error('Error fetching customers:', error);
        throw error;
      }

      logger.log('Customers fetched successfully:', data?.length || 0, 'Total count:', count);
      setCustomers(data || []);
      initialLoadDone.current = true;

      // Resolve parent names for customers that have parent_customer_id
      const parentIds = [...new Set((data || []).map(c => c.parent_customer_id).filter(Boolean))];
      if (parentIds.length > 0) {
        const { data: parents } = await supabase.from('customers').select('id, name').in('id', parentIds);
        const map = {};
        (parents || []).forEach(p => { map[p.id] = p.name; });
        setParentNames(map);
      } else {
        setParentNames({});
      }

      setTotalCount(count || 0);

      // Fetch asset counts for these customers
      // Count bottles assigned to each customer (this is the source of truth for assets)
      if (data && data.length > 0) {
        const customerIds = data.map(c => c.CustomerListID);
        
        // Count bottles assigned to each customer
        const { data: bottlesData, error: bottlesError } = await supabase
          .from('bottles')
          .select('assigned_customer')
          .in('assigned_customer', customerIds)
          .eq('organization_id', organization.id);

        if (bottlesError) {
          logger.error('Error fetching bottle data:', bottlesError);
        } else {
          const counts = {};
          bottlesData?.forEach(bottle => {
            if (bottle.assigned_customer) {
              counts[bottle.assigned_customer] = (counts[bottle.assigned_customer] || 0) + 1;
            }
          });
          setAssetCounts(counts);
          logger.log('Asset counts calculated:', counts);
        }
      } else {
        setAssetCounts({});
      }
    } catch (err) {
      logger.error('Error in fetchCustomers:', err);
      setError(err.message);
    }
    setLoading(false);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Initial load and pagination changes - use debouncedSearch instead of empty string
  useEffect(() => {
    fetchCustomers(debouncedSearch);
  }, [organization, locationFilter, page, rowsPerPage, sortField, sortDirection, debouncedSearch]);

  // Load parent customer options when Add dialog opens (for "Under parent" selector)
  useEffect(() => {
    if (!addDialogOpen || !organization?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('customers').select('id, name, CustomerListID').eq('organization_id', organization.id).order('name');
      if (!cancelled && data) setParentOptions(data);
    })();
    return () => { cancelled = true; };
  }, [addDialogOpen, organization?.id]);

  // Search now happens automatically via debouncedSearch useEffect
  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    setPage(1); // Reset to first page when searching
  };

  const handleSearchKeyPress = (e) => {
    // Enter key can still be used to trigger immediate search if needed
    if (e.key === 'Enter') {
      setDebouncedSearch(searchInput); // Immediately update debounced search
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleSort = (field) => {
    logger.log('Sorting by:', field, 'Current sort:', sortField, sortDirection);
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting
  };

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
      // Only include columns that exist in the customers table
      const payload = {
        CustomerListID: form.CustomerListID,
        name: form.name,
        contact_details: form.contact_details,
        phone: form.phone,
        customer_type: form.customer_type,
        location: form.location || 'SASKATOON',
        organization_id: organization.id
      };
      if (form.department?.trim()) payload.department = form.department.trim();
      if (form.email?.trim()) payload.email = form.email.trim();
      if (form.parent_customer_id) payload.parent_customer_id = form.parent_customer_id;
      const { error } = await supabase.from('customers').insert([payload]);
      if (error) throw error;
      
      setForm({ CustomerListID: '', name: '', email: '', contact_details: '', phone: '', customer_type: 'CUSTOMER', department: '', parent_customer_id: null });
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
      // Only include columns that exist in the customers table
      const payload = {
        CustomerListID: form.CustomerListID,
        name: form.name,
        contact_details: form.contact_details,
        phone: form.phone,
        customer_type: form.customer_type
      };
      if (form.email !== undefined) payload.email = form.email ?? null;
      if (form.department !== undefined) payload.department = form.department?.trim() || null;
      if (form.parent_customer_id !== undefined) payload.parent_customer_id = form.parent_customer_id || null;
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('CustomerListID', editingId)
        .eq('organization_id', organization.id);
      if (error) throw error;
      
      setEditingId(null);
      setForm({ CustomerListID: '', name: '', email: '', contact_details: '', phone: '', customer_type: 'CUSTOMER', department: '', parent_customer_id: null });
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
    if (!window.confirm('Are you sure you want to delete this customer? This will also unassign any bottles from this customer.')) return;
    
    setError(null);
    try {
      logger.log(`Deleting customer with ID: ${id}`);
      
      // First, unassign any bottles from this customer
      const { error: unassignError } = await supabase
        .from('bottles')
        .update({ assigned_customer: null })
        .eq('assigned_customer', id)
        .eq('organization_id', organization.id);
      
      if (unassignError) {
        logger.warn('Warning: Could not unassign bottles from customer:', unassignError);
      } else {
        logger.log('Successfully unassigned bottles from customer');
      }
      
      // Delete the customer
      const { error, count } = await supabase
        .from('customers')
        .delete({ count: 'exact' })
        .eq('CustomerListID', id)
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      
      if (count === 0) {
        throw new Error('Customer not found or already deleted');
      }
      
      logger.log(`Customer ${id} deleted successfully from database`);
      setSuccessMsg('Customer deleted successfully from database!');
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
      logger.error('Error deleting customer:', err);
      setError(`Failed to delete customer: ${err.message}`);
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
    if (!window.confirm(`Delete ${selected.length} selected customers? This will also unassign any bottles from these customers. This cannot be undone.`)) return;
    
    setError(null);
    try {
      logger.log(`Bulk deleting ${selected.length} customers:`, selected);
      
      // First, unassign any bottles from these customers
      const { error: unassignError } = await supabase
        .from('bottles')
        .update({ assigned_customer: null })
        .in('assigned_customer', selected)
        .eq('organization_id', organization.id);
      
      if (unassignError) {
        logger.warn('Warning: Could not unassign bottles from customers:', unassignError);
      } else {
        logger.log('Successfully unassigned bottles from customers');
      }
      
      // Delete the customers
      const { error, count } = await supabase
        .from('customers')
        .delete({ count: 'exact' })
        .in('CustomerListID', selected)
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      
      if (count === 0) {
        throw new Error('No customers found or already deleted');
      }
      
      logger.log(`${count} customers deleted successfully from database`);
      setSuccessMsg(`${count} customers deleted successfully from database!`);
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
      setTotalCount(prev => prev - count);
    } catch (err) {
      logger.error('Error bulk deleting customers:', err);
      setError(`Failed to delete customers: ${err.message}`);
    }
  };

  // No need for client-side filtering since we search at database level
  const filteredCustomers = customers;

  const pageCount = debouncedSearch.trim() ? 1 : Math.ceil(totalCount / rowsPerPage);

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
          <Box display="flex" gap={2}>
            {canEdit && (
              <Button
                variant="contained"
                color="primary"
                sx={{ fontWeight: 700, borderRadius: 8, px: 3 }}
                onClick={() => setAddDialogOpen(true)}
              >
                + Add Customer
              </Button>
            )}
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
        </Box>

        {/* Search and Controls */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="#1976d2" sx={{ mb: 2 }}>Customer Management</Typography>
          
          <Box display="flex" gap={2} alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" sx={{ flex: 1, width: '100%' }}>
              <SearchInputWithIcon
                placeholder="Search customers by name, ID, or contact..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setDebouncedSearch(e.target.value);
                  }
                }}
                onClear={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                }}
                className="w-full"
              />
            </Box>
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
            {searchInput.trim() 
              ? `Found ${customers.length} customers matching "${searchInput}"`
              : `Showing ${customers.length} of ${totalCount} customers`
            }
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
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    onClick={() => handleSort('name')}
                  >
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ ml: 1, fontSize: 16 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    onClick={() => handleSort('customer_type')}
                  >
                    Type
                    {sortField === 'customer_type' && (
                      sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ ml: 1, fontSize: 16 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    onClick={() => handleSort('CustomerListID')}
                  >
                    Customer #
                    {sortField === 'CustomerListID' && (
                      sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ ml: 1, fontSize: 16 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    onClick={() => handleSort('parent_customer_id')}
                  >
                    Under (Parent)
                    {sortField === 'parent_customer_id' && (
                      sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ ml: 1, fontSize: 16 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    onClick={() => handleSort('contact_details')}
                  >
                    Contact
                    {sortField === 'contact_details' && (
                      sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ ml: 1, fontSize: 16 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    onClick={() => handleSort('phone')}
                  >
                    Phone
                    {sortField === 'phone' && (
                      sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ ml: 1, fontSize: 16 }} />
                    )}
                  </Box>
                </TableCell>
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
                  <TableCell>
                    <Chip 
                      label={c.customer_type || 'CUSTOMER'} 
                      size="small"
                      color={c.customer_type === 'VENDOR' ? 'secondary' : 'primary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{c.CustomerListID}</TableCell>
                  <TableCell>{c.parent_customer_id ? (parentNames[c.parent_customer_id] || '—') : '—'}</TableCell>
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

        {/* Pagination - hide when searching */}
        {!searchInput.trim() && pageCount > 1 && (
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
        )}

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

        {/* Add Customer Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box component="form" id="add-customer-form" onSubmit={(e) => { handleAdd(e); setAddDialogOpen(false); }}>
              <TextField
                label="Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Customer number (required)"
                name="CustomerListID"
                value={form.CustomerListID}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Email"
                name="email"
                value={form.email}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Address / Contact details"
                name="contact_details"
                value={form.contact_details}
                onChange={handleChange}
                fullWidth
                margin="normal"
                multiline
                minRows={2}
              />
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  name="customer_type"
                  value={form.customer_type}
                  onChange={handleChange}
                >
                  <MenuItem value="CUSTOMER">CUSTOMER</MenuItem>
                  <MenuItem value="VENDOR">VENDOR</MenuItem>
                </Select>
              </FormControl>
              <Autocomplete
                options={parentOptions}
                getOptionLabel={(opt) => (opt && (opt.name || opt.CustomerListID || '')) || ''}
                value={parentOptions.find(o => o.id === form.parent_customer_id) || null}
                onChange={(_, v) => setForm({ ...form, parent_customer_id: v?.id ?? null })}
                renderInput={(params) => (
                  <TextField {...params} label="Under (parent customer)" placeholder="e.g. Stevenson Industrial" margin="normal" fullWidth />
                )}
                isOptionEqualToValue={(a, b) => (a?.id ?? null) === (b?.id ?? null)}
              />
              <TextField
                label="Department / location label (optional)"
                name="department"
                value={form.department ?? ''}
                onChange={handleChange}
                fullWidth
                margin="normal"
                placeholder="e.g. Regina, Saskatoon"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="add-customer-form" variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
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