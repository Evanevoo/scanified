import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Chip, Grid, Stack, Paper } from '@mui/material';
import { LocalOffer as TagIcon, ArrowBack as ArrowBackIcon, LocationOn as LocationOnIcon, ReceiptLong as ReceiptLongIcon } from '@mui/icons-material';

export default function RentalTaxCategories() {
  const navigate = useNavigate();

  const taxNotes = [
    {
      label: 'Treatment',
      title: 'Different tax treatments belong to billing logic',
      description: 'Tax categories are useful when rental products need materially different treatment such as taxable versus exempt.',
    },
    {
      label: 'Today',
      title: 'Location still drives tax',
      description: 'The live app currently applies rental tax by location and rental setup rather than a dedicated category matrix.',
    },
    {
      label: 'Future',
      title: 'Category system can expand later',
      description: 'This page can become a full tax-category manager when category-level tax rules are introduced.',
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
              <Chip label="Rental admin" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
              <Chip label="Tax categories" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Rental tax categories
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
              This page now explains the current tax model and routes teams to the places where rental tax is actually controlled today.
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {taxNotes.map((note) => (
          <Grid item xs={12} md={4} key={note.label}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {note.label}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: '#0f172a' }}>
                  {note.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>
                  {note.description}
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
              <TagIcon sx={{ fontSize: 44, color: '#94a3b8', mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Current tax-category workflow
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 1.25 }}>
                  Today, rental tax is set by location and rental setup in the <Link to="/rentals" style={{ fontWeight: 600 }}>Rentals</Link> workspace. Dedicated tax categories are planned for a future release, but this screen now gives users a clear handoff instead of a dead end.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
                Open current tax controls
              </Typography>
              <Stack spacing={1.5}>
                <Button component={Link} to="/rental-tax-regions" variant="contained" startIcon={<LocationOnIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rental tax regions
                </Button>
                <Button component={Link} to="/rentals" variant="outlined" startIcon={<ReceiptLongIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rentals billing controls
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
