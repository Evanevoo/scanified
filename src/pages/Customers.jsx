import logger from '../utils/logger';
import { unassignBottlesForRemovedCustomer } from '../utils/bottleCustomerDirectory';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Checkbox, CircularProgress, Alert, Snackbar, FormControl, InputLabel, Select, MenuItem, Pagination, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Card, CardContent, Grid, Stack, FormControlLabel
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../hooks/useAuth';
import { PageSearchInput } from '../components/ui/search-input-with-icon';
import { PrimaryButton, SecondaryButton } from '../components/ui/StyledComponents';
import {
  finalizeCustomerBranchParentFields,
  getCustomerBranchParentValidationError,
  CUSTOMER_TYPE_BRANCH,
  ACCOUNT_TYPE_BRANCH,
  ACCOUNT_TYPE_MAIN,
  getCustomerTypeChipLabel,
  getCustomerTypeChipColor,
  isBranchTypeSelectedInForm,
  buildCustomerParentNameMap,
  formatCustomerHierarchyDisplayName,
} from '../utils/customerParentConstraint';
import { isActiveCustomerRecord as isCustomerRowActive } from '../utils/leaseCustomerMatchKeys';

const toolbarBtnSx = { minHeight: 40, px: 3 };

/** Match `PageSearchInput` pill (h-11 / 44px) so search + selects + checkboxes align on one row */
const customersToolbarControlHeight = 44;
const customersToolbarSelectSx = {
  flex: '0 0 auto',
  '& .MuiOutlinedInput-root': {
    height: customersToolbarControlHeight,
    minHeight: customersToolbarControlHeight,
    borderRadius: 2,
    alignItems: 'center',
  },
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    minHeight: '0 !important',
    py: 0,
    lineHeight: 1.25,
    boxSizing: 'border-box',
  },
};
const tableActionBtnSx = {
  minWidth: 'auto',
  px: 1.75,
  py: 0.5,
  fontSize: '0.8125rem',
  mr: 1,
  mb: 0.5,
};

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

/** Distinct CustomerListIDs that have at least one bottle assigned (paginates bottle rows). */
async function fetchCustomerIdsWithAssignedBottles(organizationId) {
  const seen = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('bottles')
      .select('assigned_customer')
      .eq('organization_id', organizationId)
      .not('assigned_customer', 'is', null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const id = row.assigned_customer;
      if (id != null && String(id).trim() !== '') seen.add(String(id).trim());
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return Array.from(seen);
}

function compareCustomerRows(a, b, sortField, sortDirection) {
  const dir = sortDirection === 'asc' ? 1 : -1;
  const va = a[sortField];
  const vb = b[sortField];
  if (va == null && vb == null) return 0;
  if (va == null) return 1 * dir;
  if (vb == null) return -1 * dir;
  if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
  return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir;
}

const filterParentCustomerOptions = createFilterOptions({
  stringify: (option) =>
    `${option?.name ?? ''} ${option?.CustomerListID ?? ''}`.trim(),
});

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [searchInput, setSearchInput] = useState(''); // Input value
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Debounced search term
  const [sortField, setSortField] = useState('name'); // Field to sort by
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [locationFilter, setLocationFilter] = useState('All');
  const [withAssignedAssetsOnly, setWithAssignedAssetsOnly] = useState(false);
  const [noPaymentTermsOnly, setNoPaymentTermsOnly] = useState(false);
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
  /** Match Sidebar "Customer List" access: admin, manager, user (and owner aliases). */
  const canEdit = (() => {
    const r = String(effectiveProfile?.role || '').toLowerCase();
    return r === 'admin' || r === 'manager' || r === 'user' || r === 'orgowner';
  })();
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
      const applySearchOr = (q) => {
        if (!searchTerm.trim()) return q;
        const searchLower = searchTerm.toLowerCase();
        return q.or(
          `name.ilike.%${searchLower}%,CustomerListID.ilike.%${searchLower}%,contact_details.ilike.%${searchLower}%,phone.ilike.%${searchLower}%,city.ilike.%${searchLower}%,postal_code.ilike.%${searchLower}%`
        );
      };

      const applyNoPaymentTermsFilter = (q) => {
        if (!noPaymentTermsOnly) return q;
        return q.or('payment_terms.is.null,payment_terms.eq.');
      };

      let data;
      let count;
      let error = null;

      if (withAssignedAssetsOnly) {
        const withAssetsIds = await fetchCustomerIdsWithAssignedBottles(organization.id);
        if (withAssetsIds.length === 0) {
          setCustomers([]);
          setTotalCount(0);
          setAssetCounts({});
          setParentNames({});
          initialLoadDone.current = true;
          setLoading(false);
          return;
        }
        // Chunk .in() lists so URLs stay within PostgREST limits for large orgs
        const CHUNK = 200;
        const chunks = [];
        for (let i = 0; i < withAssetsIds.length; i += CHUNK) {
          chunks.push(withAssetsIds.slice(i, i + CHUNK));
        }
        const chunkResults = await Promise.all(
          chunks.map((chunk) => {
            let q = supabase
              .from('customers')
              .select('*')
              .eq('organization_id', organization.id)
              .in('CustomerListID', chunk);
            if (locationFilter !== 'All') q = q.eq('location', locationFilter);
            q = applySearchOr(q);
            q = applyNoPaymentTermsFilter(q);
            return q;
          })
        );
        const seen = new Set();
        let merged = [];
        for (const res of chunkResults) {
          if (res.error) {
            error = res.error;
            break;
          }
          for (const c of res.data || []) {
            if (!seen.has(c.CustomerListID)) {
              seen.add(c.CustomerListID);
              merged.push(c);
            }
          }
        }
        if (error) {
          logger.error('Error fetching customers (with assets filter):', error);
          throw error;
        }
        if (noPaymentTermsOnly) {
          merged = merged.filter((c) => !String(c.payment_terms || '').trim());
        }
        merged.sort((a, b) => compareCustomerRows(a, b, sortField, sortDirection));
        count = merged.length;
        if (searchTerm.trim()) {
          data = merged;
        } else {
          const from = (page - 1) * rowsPerPage;
          data = merged.slice(from, from + rowsPerPage);
        }
      } else {
        let query = supabase
          .from('customers')
          .select('*', { count: 'exact' })
          .eq('organization_id', organization.id);

        if (locationFilter !== 'All') {
          query = query.eq('location', locationFilter);
        }

        query = applySearchOr(query);
        query = applyNoPaymentTermsFilter(query);
        query = query.order(sortField, { ascending: sortDirection === 'asc' });

        if (searchTerm.trim()) {
          const result = await query;
          data = result.data;
          error = result.error;
          count = result.count;
        } else {
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

      // Fetch asset counts for these customers.
      // assigned_customer may be stored as CustomerListID (correct) or (legacy) the display name,
      // so count both and key the results by CustomerListID so the UI rows always line up.
      if (data && data.length > 0) {
        const customerIds = data.map((c) => c.CustomerListID).filter(Boolean);
        const customerNames = data.map((c) => c.name).filter(Boolean);
        const nameToListId = new Map(
          data.filter((c) => c.CustomerListID && c.name).map((c) => [c.name, c.CustomerListID])
        );

        const [byIdRes, byNameRes] = await Promise.all([
          customerIds.length
            ? supabase
                .from('bottles')
                .select('assigned_customer')
                .in('assigned_customer', customerIds)
                .eq('organization_id', organization.id)
            : Promise.resolve({ data: [], error: null }),
          customerNames.length
            ? supabase
                .from('bottles')
                .select('assigned_customer')
                .in('assigned_customer', customerNames)
                .eq('organization_id', organization.id)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (byIdRes.error) logger.error('Error fetching bottle counts by ID:', byIdRes.error);
        if (byNameRes.error) logger.error('Error fetching bottle counts by name:', byNameRes.error);

        const counts = {};
        (byIdRes.data || []).forEach((b) => {
          const key = b.assigned_customer;
          if (key) counts[key] = (counts[key] || 0) + 1;
        });
        (byNameRes.data || []).forEach((b) => {
          const mapped = nameToListId.get(b.assigned_customer);
          if (mapped) counts[mapped] = (counts[mapped] || 0) + 1;
        });
        setAssetCounts(counts);
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
  }, [organization, locationFilter, withAssignedAssetsOnly, noPaymentTermsOnly, page, rowsPerPage, sortField, sortDirection, debouncedSearch]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (!name) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!organization?.id) return;
    setError(null);
    if (!form.CustomerListID || !form.CustomerListID.trim()) {
      setError('CustomerListID is required.');
      return;
    }
    if (isBranchTypeSelectedInForm(form.customer_type) && !form.parent_customer_id) {
      setError(
        'Branch / location requires a parent account. Choose one under “Under (parent customer)”, or change type to Customer.'
      );
      return;
    }
    try {
      // Only include columns that exist in the customers table
      const basePayload = {
        CustomerListID: form.CustomerListID.trim(),
        name: form.name,
        contact_details: form.contact_details,
        phone: form.phone,
        customer_type: form.customer_type,
        parent_customer_id: form.parent_customer_id,
        location: form.location || 'SASKATOON',
        organization_id: organization.id,
      };
      if (form.department?.trim()) basePayload.department = form.department.trim();
      if (form.email?.trim()) basePayload.email = form.email.trim();
      const payload = finalizeCustomerBranchParentFields(basePayload);
      const branchParentError = getCustomerBranchParentValidationError(payload);
      if (branchParentError) {
        setError(branchParentError);
        return;
      }
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

  const refreshCustomerPage = async () => {
    const from = (page - 1) * rowsPerPage;
    const to = from + rowsPerPage - 1;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name')
      .range(from, to)
      .eq('organization_id', organization.id);
    setCustomers(data || []);
  };

  const handleToggleCustomerActive = async (customer, nextActive) => {
    if (!organization?.id || !canEdit) return;
    setError(null);
    const label = customer?.name || customer?.CustomerListID || 'this customer';
    if (!nextActive) {
      if (
        !window.confirm(
          `Deactivate "${label}"? They will be hidden from billing lists and treated as inactive until you activate them again.`
        )
      ) {
        return;
      }
    }
    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: nextActive })
        .eq('CustomerListID', customer.CustomerListID)
        .eq('organization_id', organization.id);
      if (error) throw error;
      setSuccessMsg(nextActive ? 'Customer activated.' : 'Customer deactivated.');
      try {
        window.dispatchEvent(new Event('gas-cylinder-subscription-refresh'));
      } catch {
        /* ignore */
      }
      await refreshCustomerPage();
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

      const { data: customerRow } = await supabase
        .from('customers')
        .select('id, CustomerListID, name')
        .eq('CustomerListID', id)
        .eq('organization_id', organization.id)
        .maybeSingle();

      try {
        await unassignBottlesForRemovedCustomer(
          supabase,
          organization.id,
          customerRow || { CustomerListID: id }
        );
        logger.log('Unassigned bottles linked to this customer (List ID, UUID, or name)');
      } catch (unassignErr) {
        logger.warn('Warning: Could not unassign bottles from customer:', unassignErr);
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
      try {
        window.dispatchEvent(new Event('gas-cylinder-subscription-refresh'));
      } catch {
        /* ignore */
      }
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
      
      const { data: customerRows } = await supabase
        .from('customers')
        .select('id, CustomerListID, name')
        .in('CustomerListID', selected)
        .eq('organization_id', organization.id);

      for (const row of customerRows || []) {
        try {
          await unassignBottlesForRemovedCustomer(supabase, organization.id, row);
        } catch (unassignErr) {
          logger.warn('Warning: Could not unassign bottles for customer:', row?.CustomerListID, unassignErr);
        }
      }
      logger.log('Unassigned bottles for selected customers (List ID, UUID, and name matches)');
      
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
      try {
        window.dispatchEvent(new Event('gas-cylinder-subscription-refresh'));
      } catch {
        /* ignore */
      }
    } catch (err) {
      logger.error('Error bulk deleting customers:', err);
      setError(`Failed to delete customers: ${err.message}`);
    }
  };

  // No need for client-side filtering since we search at database level
  const filteredCustomers = customers;

  const parentNameById = useMemo(
    () => buildCustomerParentNameMap(customers),
    [customers]
  );

  const pageCount = debouncedSearch.trim() ? 1 : Math.ceil(totalCount / rowsPerPage);
  const selectedCount = selected.length;
  const visibleAssetTotal = filteredCustomers.reduce((sum, customer) => sum + (assetCounts[customer.CustomerListID] || 0), 0);
  const vendorCount = filteredCustomers.filter((customer) => customer.customer_type === 'VENDOR').length;

  if (!organization?.id) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'transparent', py: 2, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 3 }, borderRadius: 3, boxShadow: 'none', border: '1px solid rgba(15, 23, 42, 0.08)', bgcolor: '#fcfcfb', overflow: 'visible' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap' }}>
                <Chip label="Customers" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
                <Chip label={organization.name} size="small" variant="outlined" sx={{ borderRadius: 999 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
                Customer workspace
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
                Search, review, and manage customer relationships, hierarchy, and assigned asset counts from one place.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => exportAllCustomersToCSV(organization.id)}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
            >
              Export all customers
            </Button>
          </Stack>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Visible customers', value: filteredCustomers.length, helper: searchInput.trim() ? 'Search results in current view' : 'Customers loaded on this page' },
            { label: 'Selected rows', value: selectedCount, helper: 'Available for bulk actions' },
            { label: 'Visible assigned assets', value: visibleAssetTotal, helper: 'Asset totals shown in this result set' },
            { label: 'Vendors in view', value: vendorCount, helper: 'Records currently marked as vendor' },
          ].map((metric) => (
            <Grid item xs={12} sm={6} lg={3} key={metric.label}>
              <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5, letterSpacing: '-0.03em' }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 0.75 }}>
                    {metric.helper}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {/* Action Buttons */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', backgroundColor: '#fff' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
        >
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            <SecondaryButton variant="outlined" color="primary" sx={toolbarBtnSx} onClick={() => exportToCSV(customers)}>
              Export to CSV
            </SecondaryButton>
            <Button
              variant="outlined"
              color="error"
              sx={{ ...toolbarBtnSx, borderRadius: 999, textTransform: 'none', fontWeight: 700, borderWidth: 2 }}
              disabled={selected.length === 0}
              onClick={handleBulkDelete}
            >
              Delete Selected ({selected.length})
            </Button>
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
            {canEdit && (
              <PrimaryButton sx={toolbarBtnSx} onClick={() => setAddDialogOpen(true)}>
                + Add Customer
              </PrimaryButton>
            )}
            <SecondaryButton variant="outlined" color="secondary" sx={toolbarBtnSx} onClick={() => navigate('/')}>
              Back to Dashboard
            </SecondaryButton>
          </Stack>
        </Stack>
        </Paper>

        {/* Search and Controls */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', backgroundColor: '#fff' }}>
        <Box sx={{ mb: 0 }}>
          <Typography variant="h4" fontWeight={800} color="#1976d2" sx={{ mb: 2 }}>Customer Management</Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 2,
              rowGap: 1.5,
              mb: 3,
            }}
          >
            <Box
              sx={{
                flex: '1 1 240px',
                minWidth: { xs: '100%', sm: 200 },
                maxWidth: { lg: 'min(560px, 100%)' },
                display: 'flex',
                alignItems: 'center',
                minHeight: customersToolbarControlHeight,
              }}
            >
              <PageSearchInput
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
                  setPage(1);
                }}
              />
            </Box>
            <TextField
              select
              size="small"
              margin="none"
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              inputProps={{ 'aria-label': 'Location filter' }}
              sx={{
                ...customersToolbarSelectSx,
                minWidth: 168,
              }}
              SelectProps={{
                MenuProps: {
                  disableScrollLock: true,
                  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                  transformOrigin: { vertical: 'top', horizontal: 'left' },
                  PaperProps: {
                    sx: { borderRadius: 2, mt: 0.5, minWidth: 168 },
                  },
                },
              }}
            >
              <MenuItem value="All">All Locations</MenuItem>
              <MenuItem value="SASKATOON">SASKATOON</MenuItem>
              <MenuItem value="REGINA">REGINA</MenuItem>
              <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
              <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={withAssignedAssetsOnly}
                  onChange={(e) => {
                    setWithAssignedAssetsOnly(e.target.checked);
                    setPage(1);
                  }}
                  color="primary"
                  size="small"
                  sx={{ py: 0 }}
                />
              }
              label={<Typography variant="body2" sx={{ lineHeight: 1.25 }}>With assigned assets only</Typography>}
              sx={{
                ml: 0,
                mr: 0,
                my: 0,
                minHeight: customersToolbarControlHeight,
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={noPaymentTermsOnly}
                  onChange={(e) => {
                    setNoPaymentTermsOnly(e.target.checked);
                    setPage(1);
                  }}
                  color="primary"
                  size="small"
                  sx={{ py: 0 }}
                />
              }
              label={<Typography variant="body2" sx={{ lineHeight: 1.25 }}>No payment terms only</Typography>}
              sx={{
                ml: 0,
                mr: 0,
                my: 0,
                minHeight: customersToolbarControlHeight,
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            />
            <TextField
              select
              size="small"
              margin="none"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              inputProps={{ 'aria-label': 'Rows per page' }}
              sx={{
                ...customersToolbarSelectSx,
                minWidth: 112,
              }}
              SelectProps={{
                MenuProps: {
                  disableScrollLock: true,
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                  PaperProps: {
                    sx: { borderRadius: 2, mt: 0.5, minWidth: 112 },
                  },
                },
              }}
            >
              {[10, 20, 50, 100].map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          
          <Typography variant="body2" color="text.secondary" mb={2}>
            {searchInput.trim() 
              ? `Found ${customers.length} customers matching "${searchInput}"`
              : `Showing ${customers.length} of ${totalCount} customers`
            }
            {locationFilter !== 'All' && ` (location: ${locationFilter})`}
            {withAssignedAssetsOnly && ' · showing customers with at least one bottle assigned'}
            {noPaymentTermsOnly && ' · payment terms blank or not set'}
          </Typography>
        </Box>
        </Paper>

        {/* Customer Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 3, width: '100%', maxWidth: '100%', mb: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'none' }}>
          <Table size="medium" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow sx={{ background: '#f8fafc' }}>
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
                <TableRow
                  key={c.CustomerListID}
                  sx={{
                    borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                    opacity: isCustomerRowActive(c) ? 1 : 0.78,
                    '&:hover': { backgroundColor: '#fcfcfd' },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(c.CustomerListID)}
                      onChange={() => handleSelect(c.CustomerListID)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1976d2', cursor: 'pointer' }} onClick={() => navigate(`/customer/${c.CustomerListID}`)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{formatCustomerHierarchyDisplayName(c, parentNameById)}</span>
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
                        >
                          {c.CustomerListID}
                        </Typography>
                      </Box>
                      {!isCustomerRowActive(c) && (
                        <Chip label="Inactive" size="small" color="default" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getCustomerTypeChipLabel(c)} 
                      size="small"
                      color={getCustomerTypeChipColor(c)}
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
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                      <SecondaryButton
                        variant="outlined"
                        color="primary"
                        size="small"
                        sx={tableActionBtnSx}
                        onClick={() => navigate(`/customer/${c.CustomerListID}`)}
                      >
                        View
                      </SecondaryButton>
                      {canEdit && (
                        <>
                          {isCustomerRowActive(c) ? (
                            <SecondaryButton
                              variant="outlined"
                              color="warning"
                              size="small"
                              sx={tableActionBtnSx}
                              onClick={() => handleToggleCustomerActive(c, false)}
                            >
                              Deactivate
                            </SecondaryButton>
                          ) : (
                            <PrimaryButton size="small" sx={tableActionBtnSx} onClick={() => handleToggleCustomerActive(c, true)}>
                              Activate
                            </PrimaryButton>
                          )}
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            sx={{ ...tableActionBtnSx, borderRadius: 999, fontWeight: 700, borderWidth: 2 }}
                            onClick={() => handleDelete(c.CustomerListID)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </Box>
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
                  value={form.customer_type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    if (nextType === CUSTOMER_TYPE_BRANCH && !form.parent_customer_id) {
                      setError(
                        'Select a parent customer first, or pick the parent under “Under (parent customer)” and type will switch to Branch automatically.'
                      );
                      return;
                    }
                    setError(null);
                    setForm((prev) => ({ ...prev, customer_type: nextType }));
                  }}
                >
                  <MenuItem value="CUSTOMER">CUSTOMER</MenuItem>
                  <MenuItem value="BRANCH">BRANCH (under parent)</MenuItem>
                  <MenuItem value="VENDOR">VENDOR</MenuItem>
                </Select>
              </FormControl>
              <Autocomplete
                options={parentOptions}
                filterOptions={filterParentCustomerOptions}
                getOptionLabel={(opt) => (opt && (opt.name || opt.CustomerListID || '')) || ''}
                value={
                  parentOptions.find(
                    (o) => String(o?.id ?? '') === String(form.parent_customer_id ?? '')
                  ) || null
                }
                onChange={(_, v) => {
                  const pid =
                    v?.id != null && String(v.id).trim() !== '' ? String(v.id).trim() : null;
                  setForm((prev) => ({
                    ...prev,
                    parent_customer_id: pid,
                    account_type: pid ? ACCOUNT_TYPE_BRANCH : ACCOUNT_TYPE_MAIN,
                    customer_type: pid
                      ? 'BRANCH'
                      : prev.customer_type === 'BRANCH'
                        ? 'CUSTOMER'
                        : prev.customer_type,
                  }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Under (parent customer)" placeholder="Search name or customer ID…" margin="normal" fullWidth />
                )}
                isOptionEqualToValue={(a, b) =>
                  String(a?.id ?? '') === String(b?.id ?? '')
                }
                autoHighlight
                openOnFocus
                selectOnFocus
                noOptionsText="No matching customers"
                componentsProps={{
                  popper: {
                    disablePortal: true,
                    sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
                  },
                }}
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
            <SecondaryButton variant="outlined" color="inherit" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" form="add-customer-form">
              Save
            </PrimaryButton>
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