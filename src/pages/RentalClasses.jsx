import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Chip, Grid, Stack, Paper } from '@mui/material';
import { Assignment as AssignmentIcon, ArrowBack as ArrowBackIcon, Category as CategoryIcon, ViewKanban as ViewKanbanIcon } from '@mui/icons-material';

export default function RentalClasses() {
  const navigate = useNavigate();

  const classAreas = [
    {
      label: 'Grouping',
      title: 'Define the commercial grouping',
      description: 'Rental classes should group asset types and pricing concepts so operations and billing speak the same language.',
    },
    {
      label: 'Rates',
      title: 'Keep rates close to live rentals',
      description: 'Per-customer and per-asset rates are still managed in the rentals workflow where active billing is reviewed.',
    },
    {
      label: 'Expansion',
      title: 'Leave room for class-based pricing',
      description: 'This page can grow into a richer pricing manager later, but today it should clearly route users to the real controls.',
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
              <Chip label="Classes" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Rental classes
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
              This page now explains how rental classes fit into the billing model and points teams to the live screens that control current rates and class structure.
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {classAreas.map((item) => (
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
              <AssignmentIcon sx={{ fontSize: 44, color: '#94a3b8', mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Current rental-class workflow
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 1.25 }}>
                  Create and manage <Link to="/rental/class-groups" style={{ fontWeight: 600 }}>rental class groups</Link>, then use the <Link to="/rentals" style={{ fontWeight: 600 }}>Rentals</Link> workspace to set actual rates per customer and per asset while class-based pricing matures.
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
                <Button component={Link} to="/rental/class-groups" variant="contained" startIcon={<CategoryIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rental class groups
                </Button>
                <Button component={Link} to="/rentals" variant="outlined" startIcon={<ViewKanbanIcon />} sx={{ borderRadius: 999, justifyContent: 'flex-start', textTransform: 'none' }}>
                  Open rentals workspace
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
