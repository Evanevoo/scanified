import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Chip, Grid, Stack, Paper } from '@mui/material';
import { Receipt as ReceiptIcon, ArrowBack as ArrowBackIcon, SettingsSuggest as SettingsSuggestIcon, ViewAgenda as ViewAgendaIcon } from '@mui/icons-material';

export default function RentalBillFormats() {
  const navigate = useNavigate();

  const formatPrinciples = [
    {
      label: 'Layout',
      title: 'Keep printed output predictable',
      description: 'Rental bills should present line items, tax totals, and customer context in a format accounting teams can trust.',
    },
    {
      label: 'Workflow',
      title: 'Generate from rentals',
      description: 'Bills are created from the rentals workflow where the current customer totals, rates, and invoice actions already exist.',
    },
    {
      label: 'Templates',
      title: 'Design from settings',
      description: 'Field layout and document presentation belong in settings so admins can maintain output rules centrally.',
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
              <Chip label="Formats" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Rental bill formats
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
              This page now makes the billing-output model clear: generate rental invoices from operations, then manage the printed template rules in settings.
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {formatPrinciples.map((item) => (
          <Grid item xs={12} md={4} key={item.label}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {item.label}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: '#0f172a' }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>
                  {item.description}
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
              <ReceiptIcon sx={{ fontSize: 44, color: '#94a3b8', mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Current bill-format workflow
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 1.25 }}>
                  Configure invoice layout and fields in <Link to="/settings" style={{ fontWeight: 600 }}>Settings</Link>. Generate rental invoices from the <Link to="/rentals" style={{ fontWeight: 600 }}>Rentals</Link> workspace where customer totals and rates are already reviewed.
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 1.5 }}>
                  Additional bill-format templates may be added later, but this screen now communicates the current path clearly instead of presenting a dead end.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
                Jump to active tools
              </Typography>
              <Stack spacing={1.5}>
                <Button component={Link} to="/rentals" variant="contained" startIcon={<ViewAgendaIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rentals billing workflow
                </Button>
                <Button component={Link} to="/settings" variant="outlined" startIcon={<SettingsSuggestIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
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
