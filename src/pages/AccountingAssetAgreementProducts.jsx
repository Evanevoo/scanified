import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Chip, Grid, Stack, Paper } from '@mui/material';
import { Inventory as InventoryIcon, ArrowBack as ArrowBackIcon, ReceiptLong as ReceiptLongIcon, SettingsEthernet as SettingsEthernetIcon } from '@mui/icons-material';

export default function AccountingAssetAgreementProducts() {
  const navigate = useNavigate();

  const mappingAreas = [
    {
      label: 'Exports',
      title: 'Map operational output',
      description: 'Rental exports need accounting-facing product and service codes that match the receiving system.',
    },
    {
      label: 'Asset classes',
      title: 'Keep asset meaning clear',
      description: 'Agreement products should line up with bottle types, rental classes, and billing outputs so accounting sees consistent categories.',
    },
    {
      label: 'Future admin tool',
      title: 'Dedicated mapping can come later',
      description: 'This page can become a full mapping table later, but today it should direct people to the workflows that actually produce the export.',
    },
  ];

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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.25, flexWrap: 'wrap' }}>
              <Chip label="Accounting" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
              <Chip label="Agreement products" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Accounting asset agreement products
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
              This screen now explains how agreement products relate to exports and where billing teams should work until dedicated product-code mapping is built.
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {mappingAreas.map((area) => (
          <Grid item xs={12} md={4} key={area.label}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {area.label}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: '#0f172a' }}>
                  {area.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>
                  {area.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ display: 'flex', gap: 2, py: 4 }}>
              <InventoryIcon sx={{ fontSize: 44, color: '#94a3b8', mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Current accounting-product workflow
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 1.25 }}>
                  Export rental data to CSV from the <Link to="/rentals" style={{ fontWeight: 600 }}>Rentals</Link> page for QuickBooks and other accounting systems. When dedicated mapping arrives, this page can become the admin surface for maintaining those product relationships.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
                Open related tools
              </Typography>
              <Stack spacing={1.5}>
                <Button component={Link} to="/rentals" variant="contained" startIcon={<ReceiptLongIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rentals exports
                </Button>
                <Button component={Link} to="/rental-classes" variant="outlined" startIcon={<SettingsEthernetIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rental classes
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
