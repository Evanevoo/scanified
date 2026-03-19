import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Chip, Grid, Stack, Paper } from '@mui/material';
import { CalendarMonth as CalendarIcon, ArrowBack as ArrowBackIcon, Schedule as ScheduleIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';

export default function ShowRentalBillingPeriods() {
  const navigate = useNavigate();

  const periodSteps = [
    {
      label: '1',
      title: 'Review active rentals',
      description: 'Validate assigned assets, customer totals, and billable exceptions before exporting a billing period.',
    },
    {
      label: '2',
      title: 'Generate the billing export',
      description: 'Use the rentals workflow to create the accounting output for the exact period being billed.',
    },
    {
      label: '3',
      title: 'Track period outcome',
      description: 'Use invoice search and accounting tools to confirm the period was produced and delivered correctly.',
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
              <Chip label="Periods" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Rental billing periods
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
              Billing periods are still driven from the rentals and accounting workflows, so this page now acts as a better handoff and explains the period-creation path.
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {periodSteps.map((step) => (
          <Grid item xs={12} md={4} key={step.label}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Chip label={`Step ${step.label}`} size="small" color="primary" variant="outlined" sx={{ borderRadius: 999, fontWeight: 700 }} />
                <Typography variant="h6" sx={{ mt: 1.25, fontWeight: 700, color: '#0f172a' }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>
                  {step.description}
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
              <CalendarIcon sx={{ fontSize: 44, color: '#94a3b8', mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  How periods work today
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 1.25 }}>
                  Billing periods are determined when invoices or exports are generated from the <Link to="/rentals" style={{ fontWeight: 600 }}>Rentals</Link> page. Use the export flow there to produce the QuickBooks CSV or rental billing output for the selected period.
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 1.5 }}>
                  This screen is now aligned with the redesigned billing shell instead of looking unfinished.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
                Continue the period workflow
              </Typography>
              <Stack spacing={1.5}>
                <Button component={Link} to="/rentals" variant="contained" startIcon={<FileDownloadIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rentals export workflow
                </Button>
                <Button component={Link} to="/rental/invoice-search" variant="outlined" startIcon={<ScheduleIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open invoice search
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
