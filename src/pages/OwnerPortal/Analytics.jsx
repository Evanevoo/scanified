import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import { Business, People, AttachMoney, Assessment, Visibility } from '@mui/icons-material';

export default function Analytics() {
  // No fake data, just empty states
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
        Analytics Dashboard
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        Business metrics and insights across all organizations
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Analytics data will appear here when available.
      </Alert>
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[{
          title: 'Total Organizations', icon: <Business />
        }, {
          title: 'Total Users', icon: <People />
        }, {
          title: 'Monthly Revenue', icon: <AttachMoney />
        }, {
          title: 'Active Subscriptions', icon: <Assessment />
        }].map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ p: 1, borderRadius: 1, bgcolor: '#e0e0e0', color: 'white', mr: 2 }}>
                    {metric.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {metric.title}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#aaa' }}>
                  --
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No data available
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {/* Recent Activity */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Recent Activity
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ color: '#aaa' }}>
                No recent activity to display.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {/* System Health */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        System Health Overview
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Platform Performance
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No system health data available.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Support Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No support ticket data available.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 