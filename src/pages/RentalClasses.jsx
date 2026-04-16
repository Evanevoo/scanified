import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ViewKanban as ViewKanbanIcon,
  Link as LinkIcon,
  PriceChange as PriceChangeIcon,
} from '@mui/icons-material';
import OrganizationRentalClassesManager from '../components/OrganizationRentalClassesManager';

export default function RentalClasses() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}>
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Standard rate table
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 720 }}>
              Organization <strong>rental classes</strong> — default daily / weekly / monthly amounts and rental method, plus how bottles match each row (product code or category).{' '}
              <strong>Per-customer</strong> overrides live on each customer under <strong>Rental → rental class rates</strong>.{' '}
              The <Link to="/rentals">Rentals</Link> workspace shows effective rates per line.
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
              <Button component={Link} to="/rental/assign-asset-types" size="small" variant="outlined" startIcon={<LinkIcon />} sx={{ borderRadius: 999, textTransform: 'none' }}>
                Map products to classes
              </Button>
              <Button component={Link} to="/rentals" size="small" variant="outlined" startIcon={<ViewKanbanIcon />} sx={{ borderRadius: 999, textTransform: 'none' }}>
                Rentals workspace
              </Button>
              <Button component={Link} to="/bulk-rental-pricing" size="small" variant="outlined" startIcon={<PriceChangeIcon />} sx={{ borderRadius: 999, textTransform: 'none' }}>
                Bulk rental pricing
              </Button>
            </Stack>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', flexShrink: 0 }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <OrganizationRentalClassesManager />
    </Box>
  );
}
