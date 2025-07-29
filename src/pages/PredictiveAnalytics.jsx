import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Lightbulb as LightbulbIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  Build as BuildIcon,
  LocalShipping as ShippingIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';

export default function PredictiveAnalytics() {
  const { profile, organization } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();
  const [activeTab, setActiveTab] = useState(0);
  const [predictions, setPredictions] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading predictive analytics data
    setTimeout(() => {
      setPredictions([
        {
          id: 1,
          type: 'demand_forecast',
          title: 'High Demand Expected',
          asset_type: 'Propane',
          prediction: 'Demand will increase by 35% in the next 2 weeks',
          confidence: 0.89,
          timeline: '14 days',
          impact: 'high',
          recommended_action: 'Increase inventory by 150 units',
          data_points: {
            historical_trend: '+15% weekly growth',
            seasonal_factor: 'Summer peak season',
            external_factors: 'Local festival season'
          }
        },
        {
          id: 2,
          type: 'maintenance_prediction',
          title: 'Maintenance Required Soon',
          asset_type: 'Oxygen',
          prediction: '12 cylinders likely to need maintenance within 30 days',
          confidence: 0.76,
          timeline: '30 days',
          impact: 'medium',
          recommended_action: 'Schedule proactive maintenance',
          data_points: {
            usage_pattern: 'Heavy usage detected',
            age_factor: 'Assets approaching service interval',
            failure_history: 'Similar patterns in historical data'
          }
        },
        {
          id: 3,
          type: 'delivery_optimization',
          title: 'Route Optimization Opportunity',
          asset_type: 'All',
          prediction: 'Delivery efficiency can be improved by 23%',
          confidence: 0.82,
          timeline: 'Immediate',
          impact: 'medium',
          recommended_action: 'Reorganize delivery routes',
          data_points: {
            route_analysis: 'Suboptimal routing detected',
            traffic_patterns: 'Peak hour delivery inefficiencies',
            fuel_cost: 'Potential $500/month savings'
          }
        },
        {
          id: 4,
          type: 'customer_behavior',
          title: 'Customer Churn Risk',
          asset_type: 'Various',
          prediction: '3 customers at risk of churning within 60 days',
          confidence: 0.71,
          timeline: '60 days',
          impact: 'high',
          recommended_action: 'Engage retention program',
          data_points: {
            usage_decline: '-40% usage in last 3 months',
            payment_delays: 'Increasing payment terms',
            support_tickets: 'Higher than average complaints'
          }
        }
      ]);

      setInsights([
        {
          id: 1,
          category: 'efficiency',
          title: 'Asset Utilization Optimization',
          description: 'Your propane cylinders have 78% utilization rate. Industry benchmark is 85%.',
          recommendation: 'Consider implementing dynamic pricing during low-demand periods',
          impact: 'Potential 12% revenue increase',
          priority: 'high'
        },
        {
          id: 2,
          category: 'cost_savings',
          title: 'Maintenance Cost Reduction',
          description: 'Predictive maintenance could reduce repair costs by 25%',
          recommendation: 'Implement IoT sensors on high-value assets',
          impact: '$2,500 monthly savings',
          priority: 'medium'
        },
        {
          id: 3,
          category: 'growth',
          title: 'Market Expansion Opportunity',
          description: 'Nitrogen demand in your area is growing 18% annually',
          recommendation: 'Consider expanding nitrogen cylinder inventory',
          impact: 'Potential new revenue stream',
          priority: 'low'
        }
      ]);

      setLoading(false);
    }, 1500);
  }, []);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'efficiency': return <TrendingUpIcon />;
      case 'cost_savings': return <AssessmentIcon />;
      case 'growth': return <LightbulbIcon />;
      default: return <AnalyticsIcon />;
    }
  };

  const assetName = isReady ? terms.asset : 'Asset';
  const assetsName = isReady ? terms.assets : 'Assets';

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Predictive Analytics
        </Typography>
        <Typography>Loading analytics data...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  const highImpactPredictions = predictions.filter(p => p.impact === 'high').length;
  const avgConfidence = (predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100).toFixed(0);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Predictive Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        AI-powered insights and predictions for your {assetsName.toLowerCase()} management
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AnalyticsIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {predictions.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Predictions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <WarningIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {highImpactPredictions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Impact Alerts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUpIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {avgConfidence}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Confidence
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <LightbulbIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {insights.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Actionable Insights
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* High Priority Alerts */}
      {highImpactPredictions > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            High Impact Predictions Require Attention
          </Typography>
          You have {highImpactPredictions} prediction(s) with high business impact that need immediate review.
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Predictions" />
          <Tab label="Business Insights" />
          <Tab label="Model Performance" />
        </Tabs>
      </Paper>

      {/* Predictions Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {predictions.map((prediction) => (
            <Grid item xs={12} key={prediction.id}>
              <Card>
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Typography variant="h6">
                          {prediction.title}
                        </Typography>
                        <Chip
                          label={prediction.asset_type}
                          color="primary"
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${prediction.impact} impact`}
                          color={getImpactColor(prediction.impact)}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body1" mb={2}>
                        {prediction.prediction}
                      </Typography>
                      
                      <Typography variant="body2" color="primary" fontWeight="bold" mb={2}>
                        Recommended Action: {prediction.recommended_action}
                      </Typography>
                      
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Key Data Points:
                        </Typography>
                        <List dense>
                          {Object.entries(prediction.data_points).map(([key, value]) => (
                            <ListItem key={key} sx={{ py: 0 }}>
                              <ListItemText 
                                primary={value}
                                secondary={key.replace('_', ' ')}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Confidence Level
                        </Typography>
                        <Typography variant="h3" color={getConfidenceColor(prediction.confidence) + '.main'} gutterBottom>
                          {(prediction.confidence * 100).toFixed(0)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={prediction.confidence * 100}
                          color={getConfidenceColor(prediction.confidence)}
                          sx={{ mb: 2, height: 8, borderRadius: 4 }}
                        />
                        
                        <Box textAlign="left">
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Timeline: {prediction.timeline}
                          </Typography>
                          <Button variant="outlined" size="small" fullWidth>
                            View Details
                          </Button>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Business Insights Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {insights.map((insight) => (
            <Grid item xs={12} md={6} key={insight.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    {getCategoryIcon(insight.category)}
                    <Typography variant="h6">
                      {insight.title}
                    </Typography>
                    <Chip
                      label={insight.priority}
                      color={getPriorityColor(insight.priority)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {insight.description}
                  </Typography>
                  
                  <Typography variant="body2" mb={2}>
                    <strong>Recommendation:</strong> {insight.recommendation}
                  </Typography>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      {insight.impact}
                    </Typography>
                    <Button size="small" variant="outlined">
                      Take Action
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Model Performance Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Prediction Accuracy
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Demand Forecasting
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={87}
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption">87% accuracy</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Maintenance Prediction
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={76}
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption">76% accuracy</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Customer Behavior
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={71}
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption">71% accuracy</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Data Sources
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <AssessmentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Historical Usage Data"
                      secondary="3 years of asset utilization patterns"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BuildIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Maintenance Records"
                      secondary="Service history and failure patterns"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ShippingIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Delivery Data"
                      secondary="Route efficiency and timing data"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Seasonal Patterns"
                      secondary="Weather and market trend correlations"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Model Performance Metrics
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Model Type</TableCell>
                        <TableCell>Accuracy</TableCell>
                        <TableCell>Precision</TableCell>
                        <TableCell>Recall</TableCell>
                        <TableCell>Last Updated</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Demand Forecasting</TableCell>
                        <TableCell>87.3%</TableCell>
                        <TableCell>84.1%</TableCell>
                        <TableCell>89.2%</TableCell>
                        <TableCell>2024-01-14</TableCell>
                        <TableCell>
                          <Chip label="Active" color="success" size="small" />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Maintenance Prediction</TableCell>
                        <TableCell>76.5%</TableCell>
                        <TableCell>78.3%</TableCell>
                        <TableCell>74.7%</TableCell>
                        <TableCell>2024-01-13</TableCell>
                        <TableCell>
                          <Chip label="Active" color="success" size="small" />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Customer Churn</TableCell>
                        <TableCell>71.2%</TableCell>
                        <TableCell>69.8%</TableCell>
                        <TableCell>72.5%</TableCell>
                        <TableCell>2024-01-12</TableCell>
                        <TableCell>
                          <Chip label="Training" color="warning" size="small" />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}