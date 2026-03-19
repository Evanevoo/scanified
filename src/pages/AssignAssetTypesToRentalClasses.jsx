import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Chip, Grid, Stack, Paper } from '@mui/material';
import { Link as LinkIcon, ArrowBack as ArrowBackIcon, Category as CategoryIcon, ViewKanban as ViewKanbanIcon } from '@mui/icons-material';

export default function AssignAssetTypesToRentalClasses() {
  const navigate = useNavigate();

  const assignmentNotes = [
    {
      label: 'Asset logic',
      title: 'Map asset types to commercial groupings',
      description: 'Linking asset types to rental classes helps standardize pricing and reporting across cylinders, products, and service lines.',
    },
    {
      label: 'Current workflow',
      title: 'Keep live rates with rentals',
      description: 'The active system still manages real rates from the rentals workflow rather than from a class-assignment grid.',
    },
    {
      label: 'Future model',
      title: 'Expand into a real assignment table',
      description: 'This page can become a fuller asset-to-class mapping manager once class-driven pricing is introduced.',
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
              <Chip label="Asset-class assignment" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Assign asset types to rental classes
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
              This page now explains how asset-to-class mapping should work conceptually and sends users to the live class and billing controls used today.
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {assignmentNotes.map((note) => (
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
              <LinkIcon sx={{ fontSize: 44, color: '#94a3b8', mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Current assignment workflow
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 1.25 }}>
                  Define groups in <Link to="/rental/class-groups" style={{ fontWeight: 600 }}>rental class groups</Link>. Set live per-asset and per-customer rates in the <Link to="/rentals" style={{ fontWeight: 600 }}>Rentals</Link> page while asset-type-to-class assignment is still evolving.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
                Open related controls
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
