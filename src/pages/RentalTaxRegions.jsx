import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';

export default function RentalTaxRegions() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('locations')
        .select('id, name, province, total_tax_rate')
        .eq('organization_id', organization.id)
        .order('name');
      if (!cancelled) {
        if (err) {
          setError(err.message);
          setRegions([]);
        } else {
          setRegions(data || []);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  const averageRate = regions.length
    ? (regions.reduce((sum, region) => sum + (Number(region.total_tax_rate) || 0), 0) / regions.length).toFixed(2)
    : '0.00';

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.25, flexWrap: 'wrap' }}>
              <Chip label="Rental admin" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
              <Chip label="Tax regions" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Rental tax regions
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
              Each region is a <strong>location</strong> in your org. The <strong>total tax rate</strong> on that location is what rental billing uses.
              Use <Link to="/locations">Locations</Link> to add or edit sites and set each region&apos;s tax rate.
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Regions
              </Typography>
              <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700, color: '#0f172a' }}>
                {regions.length}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, color: '#64748b' }}>
                Locations used as rental tax regions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Average rate
              </Typography>
              <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700, color: '#0f172a' }}>
                {averageRate}%
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, color: '#64748b' }}>
                Mean total tax rate across configured regions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card elevation={0} sx={{ border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Tax rates by region
            </Typography>
            <Button
              component={Link}
              to="/locations"
              variant="contained"
              size="small"
              startIcon={<EditIcon />}
              sx={{ borderRadius: 999, textTransform: 'none' }}
            >
              Edit rates in Locations
            </Button>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : regions.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3 }}>
              No locations yet. Go to{' '}
              <Link to="/locations" style={{ fontWeight: 600 }}>Locations</Link> to add branches/sites and set each one&apos;s total tax rate for rental billing.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Region</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Province</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Tax rate (%)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {regions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.name || '—'}</TableCell>
                      <TableCell>{r.province || '—'}</TableCell>
                      <TableCell align="right">{r.total_tax_rate != null ? `${Number(r.total_tax_rate)}%` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
