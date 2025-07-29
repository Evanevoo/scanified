import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Alert, LinearProgress, Chip, Button,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText,
  ListItemIcon, Divider, IconButton, Tooltip
} from '@mui/material';
import { 
  Business, People, AttachMoney, Assessment, Visibility, TrendingUp, 
  TrendingDown, Schedule, CheckCircle, Warning, Error, ExpandMore,
  Refresh, Download, DateRange, Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function Analytics() {
  const { profile } = useAuth();
  useOwnerAccess(profile);

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState({
    overview: {
      totalOrganizations: 47,
      totalUsers: 234,
      monthlyRevenue: 12450,
      activeSubscriptions: 42,
      trialAccounts: 8,
      churnRate: 2.3,
      avgRevenuePerUser: 53.2,
      customerLifetimeValue: 1247
    },
    growth: {
      organizationsGrowth: 12.5,
      usersGrowth: 8.7,
      revenueGrowth: 15.2,
      subscriptionsGrowth: 9.1
    },
    planDistribution: [
      { plan: 'Starter', count: 18, revenue: 1620, percentage: 38.3 },
      { plan: 'Professional', count: 15, revenue: 4725, percentage: 31.9 },
      { plan: 'Enterprise', count: 9, revenue: 5400, percentage: 19.1 },
      { plan: 'Custom', count: 5, revenue: 2975, percentage: 10.6 }
    ],
    recentActivity: [
      { organization: 'ABC Gas Solutions', action: 'Upgraded to Professional', time: '2 hours ago', type: 'upgrade' },
      { organization: 'Metro Cylinders', action: 'New user added', time: '4 hours ago', type: 'user' },
      { organization: 'Industrial Gas Co', action: 'Payment processed', time: '6 hours ago', type: 'payment' },
      { organization: 'Quick Gas Express', action: 'Trial started', time: '1 day ago', type: 'trial' },
      { organization: 'Coastal Gas Services', action: 'Support ticket created', time: '1 day ago', type: 'support' }
    ],
    topPerformers: [
      { organization: 'Industrial Gas Co', users: 25, revenue: 1495, cylinders: 2500, growth: 23.5 },
      { organization: 'Metro Cylinders', users: 18, revenue: 1134, cylinders: 1800, growth: 18.2 },
      { organization: 'ABC Gas Solutions', users: 15, revenue: 945, cylinders: 1200, growth: 15.7 },
      { organization: 'Coastal Gas Services', users: 12, revenue: 756, cylinders: 950, growth: 12.1 },
      { organization: 'Quick Gas Express', users: 8, revenue: 504, cylinders: 600, growth: 8.9 }
    ],
    systemHealth: {
      uptime: 99.7,
      responseTime: 145,
      errorRate: 0.02,
      activeConnections: 1247
    }
  });

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const refreshData = () => {
    setLoading(true);
    // Simulate data refresh
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'upgrade': return <TrendingUp color="success" />;
      case 'user': return <People color="primary" />;
      case 'payment': return <AttachMoney color="success" />;
      case 'trial': return <Schedule color="warning" />;
      case 'support': return <Warning color="error" />;
      default: return <Assessment />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'upgrade': return 'success';
      case 'user': return 'primary';
      case 'payment': return 'success';
      case 'trial': return 'warning';
      case 'support': return 'error';
      default: return 'default';
    }
  };

  const MetricCard = ({ title, value, change, icon, color = 'primary', suffix = '' }) => (
    <Card sx={{ height: '100%', border: '1px solid #e2e8f0' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
          {change && (
            <Chip
              icon={change > 0 ? <TrendingUp /> : <TrendingDown />}
              label={`${change > 0 ? '+' : ''}${change}%`}
              color={change > 0 ? 'success' : 'error'}
              size="small"
            />
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Loading Analytics...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
            Analytics Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Business metrics and insights across all organizations
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => alert('Export functionality coming soon!')}
          >
            Export Report
          </Button>
          <IconButton onClick={refreshData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Key Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Organizations"
            value={analytics.overview.totalOrganizations}
            change={analytics.growth.organizationsGrowth}
            icon={<Business />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Users"
            value={analytics.overview.totalUsers}
            change={analytics.growth.usersGrowth}
            icon={<People />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Monthly Revenue"
            value={analytics.overview.monthlyRevenue}
            change={analytics.growth.revenueGrowth}
            icon={<AttachMoney />}
            color="success"
            suffix="$"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Subscriptions"
            value={analytics.overview.activeSubscriptions}
            change={analytics.growth.subscriptionsGrowth}
            icon={<CheckCircle />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Secondary Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Trial Accounts"
            value={analytics.overview.trialAccounts}
            icon={<Schedule />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Churn Rate"
            value={analytics.overview.churnRate}
            icon={<TrendingDown />}
            color="error"
            suffix="%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Revenue Per User"
            value={analytics.overview.avgRevenuePerUser}
            icon={<AttachMoney />}
            color="success"
            suffix="$"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Customer Lifetime Value"
            value={analytics.overview.customerLifetimeValue}
            icon={<TrendingUp />}
            color="primary"
            suffix="$"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Plan Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Plan Distribution
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Plan</TableCell>
                      <TableCell align="right">Organizations</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.planDistribution.map((plan) => (
                      <TableRow key={plan.plan}>
                        <TableCell>{plan.plan}</TableCell>
                        <TableCell align="right">{plan.count}</TableCell>
                        <TableCell align="right">${plan.revenue.toLocaleString()}</TableCell>
                        <TableCell align="right">{plan.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                System Health
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" fontWeight={700}>
                      {analytics.systemHealth.uptime}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Uptime
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main" fontWeight={700}>
                      {analytics.systemHealth.responseTime}ms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Response Time
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" fontWeight={700}>
                      {analytics.systemHealth.errorRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Error Rate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" fontWeight={700}>
                      {analytics.systemHealth.activeConnections}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Connections
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Recent Activity
              </Typography>
              <List>
                {analytics.recentActivity.map((activity, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.organization}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{activity.action}</span>
                          <Chip 
                            label={activity.time} 
                            size="small" 
                            color={getActivityColor(activity.type)}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Top Performing Organizations
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization</TableCell>
                      <TableCell align="right">Users</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Growth</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.topPerformers.map((org) => (
                      <TableRow key={org.organization}>
                        <TableCell>{org.organization}</TableCell>
                        <TableCell align="right">{org.users}</TableCell>
                        <TableCell align="right">${org.revenue}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`+${org.growth}%`}
                            color="success"
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Analytics Sections */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Detailed Revenue Analytics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Monthly Recurring Revenue</Typography>
                  <Typography variant="h4" color="success.main" fontWeight={700}>
                    ${analytics.overview.monthlyRevenue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    +{analytics.growth.revenueGrowth}% from last month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Annual Run Rate</Typography>
                  <Typography variant="h4" color="primary.main" fontWeight={700}>
                    ${(analytics.overview.monthlyRevenue * 12).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Projected annual revenue
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Revenue per Organization</Typography>
                  <Typography variant="h4" color="info.main" fontWeight={700}>
                    ${Math.round(analytics.overview.monthlyRevenue / analytics.overview.totalOrganizations)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average monthly revenue
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">User Engagement Metrics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            User engagement metrics help identify the most active organizations and potential upsell opportunities.
          </Alert>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Daily Active Users</Typography>
                  <Typography variant="h4" color="primary.main" fontWeight={700}>
                    {Math.round(analytics.overview.totalUsers * 0.65)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    65% of total users active daily
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Average Session Duration</Typography>
                  <Typography variant="h4" color="success.main" fontWeight={700}>
                    24min
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    +12% from last month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
} 