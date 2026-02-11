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
  Alert,
  Chip,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { TableSkeleton } from '../components/SmoothLoading';

const PAGE_SIZE = 50;

export default function RecentCylinders() {
  const navigate = useNavigate();
  const { organization, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cylinders, setCylinders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && organization?.id) {
      fetchRecentCylinders();
    } else if (!authLoading && !organization) {
      setError('No organization found.');
      setLoading(false);
    }
  }, [organization, authLoading]);

  const fetchRecentCylinders = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('bottles')
        .select(`
          id,
          barcode_number,
          serial_number,
          product_code,
          description,
          status,
          customer_name,
          created_at,
          customers:assigned_customer(name, CustomerListID)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;
      setCylinders(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load recently added cylinders.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCylinders = cylinders.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.barcode_number && c.barcode_number.toLowerCase().includes(term)) ||
      (c.serial_number && c.serial_number.toLowerCase().includes(term)) ||
      (c.product_code && c.product_code.toLowerCase().includes(term)) ||
      (c.description && c.description?.toLowerCase().includes(term)) ||
      (c.customer_name && c.customer_name.toLowerCase().includes(term)) ||
      (c.customers?.name && c.customers.name.toLowerCase().includes(term))
    );
  });

  if (authLoading || loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 4 }}>
        <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 4 }, borderRadius: 2, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)' }}>
          <Box display="flex" alignItems="center" mb={3}>
            <ArrowBackIcon color="action" />
            <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1, ml: 2 }}>
              Recently Added Cylinders
            </Typography>
          </Box>
          <TableSkeleton rows={10} columns={6} />
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchRecentCylinders} sx={{ mt: 2 }}>Retry</Button>
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No organization found. Please contact your administrator.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 4 }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 4 }, borderRadius: 2, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Box display="flex" alignItems="center">
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }} aria-label="Go back">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1 }}>
              Recently Added Cylinders
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary" mb={3}>
          Cylinders added to your organization, newest first (up to 200). Use search to filter.
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder={'Search by barcode, serial, product code, description, or customer...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
          sx={{ mb: 3, width: '100%' }}
        />

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><strong>Barcode</strong></TableCell>
                <TableCell><strong>Serial</strong></TableCell>
                <TableCell><strong>Product / Description</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Customer</strong></TableCell>
                <TableCell><strong>Added</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCylinders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    {cylinders.length === 0 ? 'No recently added cylinders.' : 'No cylinders match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCylinders.slice(0, PAGE_SIZE).map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.barcode_number || '—'}</TableCell>
                    <TableCell>{row.serial_number || '—'}</TableCell>
                    <TableCell>{[row.product_code, row.description].filter(Boolean).join(' — ') || '—'}</TableCell>
                    <TableCell>
                      <Chip label={row.status || '—'} size="small" color={row.status === 'active' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{row.customer_name || row.customers?.name || 'Unassigned'}</TableCell>
                    <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => navigate(`/bottle/${row.id}`)} endIcon={<OpenInNewIcon />}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredCylinders.length > PAGE_SIZE && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Showing first {PAGE_SIZE} of {filteredCylinders.length} matching cylinders.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
