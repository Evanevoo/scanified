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
import { formatLocationDisplay } from '../utils/locationDisplay';

const PAGE_SIZE = 50;

export default function RecentCylinders() {
  const navigate = useNavigate();
  const { organization, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const browserTz = typeof Intl !== 'undefined' && Intl.DateTimeFormat?.().resolvedOptions?.().timeZone;
  const userTimezone = profile?.preferences?.timezone || (browserTz && browserTz !== 'UTC' ? browserTz : undefined);
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
          location,
          created_at
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
      (c.location && c.location.toLowerCase().includes(term))
    );
  });

  const formatAddedDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const opts = { dateStyle: 'medium', timeStyle: 'short' };
      if (userTimezone) opts.timeZone = userTimezone;
      return new Date(isoString).toLocaleString(undefined, opts);
    } catch {
      return new Date(isoString).toLocaleString();
    }
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <ArrowBackIcon color="action" />
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Recently Added Cylinders
            </Typography>
          </Box>
        </Paper>
        <TableSkeleton rows={10} columns={6} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchRecentCylinders} sx={{ mt: 2, borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>Retry</Button>
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
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
            Recently Added Cylinders
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <TextField
          fullWidth
          size="small"
          placeholder={'Search by barcode, serial, product code, description, or location...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
          sx={{ width: '100%' }}
        />
      </Paper>

      <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell><strong>Barcode</strong></TableCell>
                <TableCell><strong>Serial</strong></TableCell>
                <TableCell><strong>Product / Description</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Location</strong></TableCell>
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
                    <TableCell>{row.location ? formatLocationDisplay(row.location) : '—'}</TableCell>
                    <TableCell>{formatAddedDate(row.created_at)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => navigate(`/bottle/${row.id}`)} endIcon={<OpenInNewIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
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
    </Box>
  );
}
