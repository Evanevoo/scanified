import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Alert, LinearProgress, TextField, MenuItem
} from '@mui/material';
import {
  Payment, Business, AttachMoney, Warning, CheckCircle,
  Schedule, Cancel, Edit, Visibility
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

export default function BillingManagement() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Simulate loading billing data
    setTimeout(() => {
      setSubscriptions([
        {
          id: 1,
          organization: 'ABC Gas Co',
          plan: 'Professional',
          status: 'active',
          amount: 299,
          nextBilling: '2024-02-15',
          users: 12,
          email: 'billing@abcgas.com'
        },
        {
          id: 2,
          organization: 'XYZ Distributors',
          plan: 'Enterprise',
          status: 'active',
          amount: 599,
          nextBilling: '2024-02-20',
          users: 25,
          email: 'admin@xyzdist.com'
        },
        {
          id: 3,
          organization: 'Gas Express',
          plan: 'Starter',
          status: 'past_due',
          amount: 99,
          nextBilling: '2024-02-10',
          users: 5,
          email: 'contact@gasexpress.com'
        },
        {
          id: 4,
          organization: 'Quick Gas',
          plan: 'Professional',
          status: 'trial',
          amount: 0,
          nextBilling: '2024-02-25',
          users: 8,
          email: 'info@quickgas.com'
        },
        {
          id: 5,
          organization: 'Metro Gas',
          plan: 'Enterprise',
          status: 'active',
          amount: 599,
          nextBilling: '2024-02-18',
          users: 18,
          email: 'billing@metrogas.com'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'past_due': return 'error';
      case 'trial': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'past_due': return <Warning />;
      case 'trial': return <Schedule />;
      case 'cancelled': return <Cancel />;
      default: return <Schedule />;
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filter === 'all') return true;
    return sub.status === filter;
  });

  const totalRevenue = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + sub.amount, 0);

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
  const trialSubscriptions = subscriptions.filter(sub => sub.status === 'trial').length;
  const pastDueSubscriptions = subscriptions.filter(sub => sub.status === 'past_due').length;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Loading Billing Management...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
        Billing Management
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        Manage subscriptions and billing across all organizations
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Monitor subscription status, manage billing cycles, and handle payment issues 
        for all customer organizations from this central dashboard.
      </Alert>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ color: 'success.main', mr: 2, fontSize: 30 }} />
                <Typography variant="h6">Monthly Revenue</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                ${totalRevenue.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                From active subscriptions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ color: 'success.main', mr: 2, fontSize: 30 }} />
                <Typography variant="h6">Active Subscriptions</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {activeSubscriptions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Paying customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ color: 'warning.main', mr: 2, fontSize: 30 }} />
                <Typography variant="h6">Trial Accounts</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {trialSubscriptions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In trial period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: 'error.main', mr: 2, fontSize: 30 }} />
                <Typography variant="h6">Past Due</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {pastDueSubscriptions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          select
          label="Filter by Status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">All Subscriptions</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="trial">Trial</MenuItem>
          <MenuItem value="past_due">Past Due</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={<Payment />}>
          Export Billing Report
        </Button>
      </Box>

      {/* Subscriptions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Next Billing</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Users</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSubscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {subscription.organization}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {subscription.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={subscription.plan} 
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={subscription.status.replace('_', ' ')} 
                    color={getStatusColor(subscription.status)}
                    icon={getStatusIcon(subscription.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    ${subscription.amount}/month
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(subscription.nextBilling).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {subscription.users} users
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" startIcon={<Visibility />}>
                      View
                    </Button>
                    <Button size="small" startIcon={<Edit />}>
                      Edit
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Billing Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button variant="outlined" startIcon={<Payment />}>
              Send Payment Reminders
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" startIcon={<Schedule />}>
              Update Billing Cycles
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" startIcon={<Business />}>
              Generate Invoices
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
} 