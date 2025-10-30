import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, Alert,
  LinearProgress, Divider, IconButton, Tooltip, Avatar, List, ListItem, ListItemText,
  ListItemIcon, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Psychology as AIIcon,
  CompareArrows as CompareIcon,
  RocketLaunch as GrowthIcon,
  AutoAwesome as AutomationIcon,
  Store as MarketplaceIcon,
  AttachMoney as RevenueIcon,
  Insights as PredictIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Speed as SpeedIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Notifications as NotificationIcon,
  Star as StarIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';
import { supabase } from '../../supabase/client';

export default function OwnerCommandCenter() {
  const { profile } = useAuth();
  useOwnerAccess(profile);
  
  const [loading, setLoading] = useState(true);
  const [businessMetrics, setBusinessMetrics] = useState({
    totalRevenue: 0,
    monthlyGrowth: 0,
    customerCount: 0,
    churnRate: 0,
    avgRevenuePerUser: 0,
    customerLifetimeValue: 0
  });
  
  const [aiInsights, setAiInsights] = useState([
    {
      type: 'opportunity',
      title: 'Revenue Optimization Opportunity',
      description: '23% of customers could be upsold to higher tier plans based on usage patterns',
      impact: 'High',
      action: 'Review upsell candidates',
      icon: <RevenueIcon color="success" />
    },
    {
      type: 'warning',
      title: 'Churn Risk Alert',
      description: '5 customers showing decreased activity - intervention recommended',
      impact: 'Medium',
      action: 'Contact at-risk customers',
      icon: <WarningIcon color="warning" />
    },
    {
      type: 'growth',
      title: 'Market Expansion',
      description: 'Strong demand detected in Texas market - 47% increase in trial signups',
      impact: 'High',
      action: 'Scale marketing in Texas',
      icon: <GrowthIcon color="primary" />
    }
  ]);

  const [competitiveIntel, setCompetitiveIntel] = useState({
    marketPosition: 'Strong',
    competitorActivity: [
      { competitor: 'Legacy System A', activity: 'Price increase announced', impact: 'Positive', date: '2 days ago' },
      { competitor: 'Competitor B', activity: 'Service outage reported', impact: 'Positive', date: '1 week ago' },
      { competitor: 'Legacy System A', activity: 'Customer complaints about UI', impact: 'Positive', date: '3 days ago' }
    ],
    opportunities: [
      'Legacy System A customers frustrated with outdated interface',
      'Market gap in AI-powered predictive maintenance',
      'Growing demand for mobile-first solutions'
    ]
  });

  const [growthMetrics, setGrowthMetrics] = useState({
    conversionRate: 23.5,
    timeToValue: '4.2 days',
    nps: 72,
    featureAdoption: {
      mobileApp: 89,
      aiInsights: 67,
      automation: 45
    }
  });

  useEffect(() => {
    loadBusinessMetrics();
    // In real implementation, these would come from AI services and competitive intelligence APIs
  }, []);

  const loadBusinessMetrics = async () => {
    try {
      setLoading(true);
      
      // Get organization count
      const { count: orgCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      // Get total users across all organizations
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Calculate real revenue data based on subscription plans
      const { data: organizations } = await supabase
        .from('organizations')
        .select('subscription_plan, subscription_status, created_at');

      let totalRevenue = 0;
      let activeSubscriptions = 0;
      
      if (organizations) {
        const planPrices = { basic: 29, pro: 99, enterprise: 299 };
        
        organizations.forEach(org => {
          if (org.subscription_status === 'active') {
            const planPrice = planPrices[org.subscription_plan] || 0;
            totalRevenue += planPrice;
            activeSubscriptions++;
          }
        });
      }

      // Calculate monthly growth (simplified)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const newThisMonth = organizations?.filter(org => 
        new Date(org.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      ).length || 0;
      const newLastMonth = organizations?.filter(org => 
        new Date(org.created_at) >= lastMonth && 
        new Date(org.created_at) < new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      ).length || 0;
      
      const monthlyGrowth = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0;

      setBusinessMetrics({
        totalRevenue,
        monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
        customerCount: orgCount || 0,
        churnRate: 0, // TODO: Calculate real churn rate
        avgRevenuePerUser: userCount > 0 ? totalRevenue / userCount : 0,
        customerLifetimeValue: 0 // TODO: Calculate real CLV
      });
      
    } catch (error) {
      logger.error('Error loading business metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, change, icon, color = 'primary' }) => (
    <Card sx={{ height: '100%', border: '1px solid #e2e8f0' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          {change && (
            <Chip
              icon={change > 0 ? <UpIcon /> : <DownIcon />}
              label={`${change > 0 ? '+' : ''}${change}%`}
              color={change > 0 ? 'success' : 'error'}
              size="small"
            />
          )}
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
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
        <Typography variant="h4" gutterBottom>Loading Command Center...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
          Owner Command Center
        </Typography>
        <Typography variant="h6" color="text.secondary">
          AI-powered insights and competitive intelligence for your gas cylinder platform
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Business Performance
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Monthly Revenue"
            value={`$${businessMetrics.totalRevenue.toLocaleString()}`}
            change={businessMetrics.monthlyGrowth}
            icon={<RevenueIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Active Customers"
            value={businessMetrics.customerCount}
            change={12.3}
            icon={<BusinessIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Churn Rate"
            value={`${businessMetrics.churnRate}%`}
            change={-0.8}
            icon={<TrendingUpIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="ARPU"
            value={`$${businessMetrics.avgRevenuePerUser}`}
            change={5.2}
            icon={<AnalyticsIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Customer LTV"
            value={`$${businessMetrics.customerLifetimeValue.toLocaleString()}`}
            change={8.7}
            icon={<StarIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="NPS Score"
            value={growthMetrics.nps}
            change={4.2}
            icon={<SpeedIcon />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* AI Insights */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        <AIIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        AI-Powered Insights
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {aiInsights.map((insight, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card sx={{ height: '100%', border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {insight.icon}
                  <Chip
                    label={insight.impact}
                    color={insight.impact === 'High' ? 'error' : insight.impact === 'Medium' ? 'warning' : 'info'}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                  {insight.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {insight.description}
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  {insight.action}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Competitive Intelligence */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        <CompareIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Competitive Intelligence
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Recent Competitor Activity
              </Typography>
              <List>
                {competitiveIntel.competitorActivity.map((activity, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Chip
                        label={activity.impact}
                        color={activity.impact === 'Positive' ? 'success' : activity.impact === 'Negative' ? 'error' : 'default'}
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${activity.competitor}: ${activity.activity}`}
                      secondary={activity.date}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Market Opportunities
              </Typography>
              <List>
                {competitiveIntel.opportunities.map((opportunity, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <GrowthIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={opportunity} />
                  </ListItem>
                ))}
              </List>
              <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }}>
                Capitalize on Opportunities
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Growth Tools */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        <GrowthIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Growth & Automation Tools
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 3, border: '1px solid #e2e8f0' }}>
            <AutomationIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Customer Automation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Automated onboarding, success emails, and retention campaigns
            </Typography>
            <Button variant="outlined" size="small">
              Configure
            </Button>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 3, border: '1px solid #e2e8f0' }}>
            <PredictIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Churn Prediction
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              AI-powered early warning system for customer churn risk
            </Typography>
            <Button variant="outlined" size="small">
              View Risks
            </Button>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 3, border: '1px solid #e2e8f0' }}>
            <MarketplaceIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Integration Hub
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Marketplace for third-party integrations and custom apps
            </Typography>
            <Button variant="outlined" size="small">
              Manage
            </Button>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 3, border: '1px solid #e2e8f0' }}>
            <RevenueIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Revenue Optimization
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              A/B test pricing, upsell automation, and revenue experiments
            </Typography>
            <Button variant="outlined" size="small">
              Optimize
            </Button>
          </Card>
        </Grid>
      </Grid>

      {/* Feature Adoption */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
          Platform Feature Adoption
        </Typography>
        <Card sx={{ p: 3, border: '1px solid #e2e8f0' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Mobile App Usage</Typography>
                  <Typography variant="body2" fontWeight={600}>{growthMetrics.featureAdoption.mobileApp}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={growthMetrics.featureAdoption.mobileApp} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">AI Insights Adoption</Typography>
                  <Typography variant="body2" fontWeight={600}>{growthMetrics.featureAdoption.aiInsights}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={growthMetrics.featureAdoption.aiInsights} 
                  sx={{ height: 8, borderRadius: 4 }}
                  color="warning"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Automation Features</Typography>
                  <Typography variant="body2" fontWeight={600}>{growthMetrics.featureAdoption.automation}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={growthMetrics.featureAdoption.automation} 
                  sx={{ height: 8, borderRadius: 4 }}
                  color="info"
                />
              </Box>
            </Grid>
          </Grid>
        </Card>
      </Box>
    </Box>
  );
} 