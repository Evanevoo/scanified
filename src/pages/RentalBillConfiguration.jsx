import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Chip, Grid, Stack, Paper } from '@mui/material';
import { Settings as SettingsIcon, ArrowBack as ArrowBackIcon, Tune as TuneIcon, ReceiptLong as ReceiptLongIcon } from '@mui/icons-material';

export default function RentalBillConfiguration() {
  const navigate = useNavigate();

  const configurationAreas = [
    {
      label: 'Billing behavior',
      title: 'Control the operating rules',
      description: 'Billing periods, invoice defaults, and charge presentation should be managed from the workflows where invoices are generated.',
    },
    {
      label: 'Customer setup',
      title: 'Keep customer rules close to the customer',
      description: 'Rental rates, tax behavior, payment terms, and purchase order requirements live on the customer and rental workflows.',
    },
    {
      label: 'Template output',
      title: 'Separate invoice template concerns',
      description: 'Invoice layout and printed fields are handled in Settings so operations teams can keep billing logic and output design distinct.',
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
              <Chip label="Billing" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
              <Chip label="Configuration" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Rental bill configuration
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
              This workspace explains where rental billing behavior is configured today, so billing teams can move directly to the right operational screen without guessing.
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {configurationAreas.map((area) => (
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
              <SettingsIcon sx={{ fontSize: 44, color: '#94a3b8', mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Where billing settings live right now
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 1.25 }}>
                  Rental amounts and tax are managed per customer from the <Link to="/rentals" style={{ fontWeight: 600 }}>Rentals</Link> workspace and from each customer&apos;s rental tab. Invoice layout and document fields are configured in <Link to="/settings" style={{ fontWeight: 600 }}>Settings</Link>.
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 1.5 }}>
                  This page now acts as a clearer control handoff instead of a dead-end placeholder.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
                Go to the right workspace
              </Typography>
              <Stack spacing={1.5}>
                <Button component={Link} to="/rentals" variant="contained" startIcon={<TuneIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rentals workspace
                </Button>
                <Button component={Link} to="/settings" variant="outlined" startIcon={<ReceiptLongIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open invoice template settings
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
