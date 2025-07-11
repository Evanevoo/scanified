import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocalShipping as ShippingIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useErrorHandler } from '../hooks/useErrorHandler';

export default function SmartInventory() {
  const { profile: userProfile } = useAuth();
  const { handleError } = useErrorHandler();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [alertDialog, setAlertDialog] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'low_stock',
    threshold: 10,
    product_code: '',
    location: ''
  });
  const [locations, setLocations] = useState([]);
  const [productCodes, setProductCodes] = useState([]);

  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchInventory();
      fetchAlerts();
      fetchLocations();
      fetchProductCodes();
      generatePredictions();
    }
  }, [userProfile]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', userProfile.organization_id);

      if (error) throw error;
      
      // Process inventory data
      const processedInventory = processInventoryData(data || []);
      setInventory(processedInventory);
    } catch (error) {
      handleError(error, { message: 'Failed to fetch inventory' });
    } finally {
      setLoading(false);
    }
  };

  const processInventoryData = (bottles) => {
    // Group by product code and location
    const grouped = {};
    
    bottles.forEach(bottle => {
      const key = `${bottle.product_code}_${bottle.location || 'Unknown'}`;
      if (!grouped[key]) {
        grouped[key] = {
          product_code: bottle.product_code,
          description: bottle.description,
          location: bottle.location || 'Unknown',
          total: 0,
          available: 0,
          rented: 0,
          low_stock: false,
          critical_stock: false,
          last_updated: null
        };
      }
      
      grouped[key].total++;
      grouped[key].last_updated = bottle.last_location_update || grouped[key].last_updated;
      
      // Check if bottle is rented based on assigned_customer field
      const isRented = bottle.assigned_customer && bottle.assigned_customer !== '';
      
      if (isRented) {
        grouped[key].rented++;
      } else {
        grouped[key].available++;
      }
    });

    // Calculate stock levels and alerts
    Object.values(grouped).forEach(item => {
      const utilizationRate = item.total > 0 ? (item.rented / item.total) * 100 : 0;
      item.utilization_rate = Math.round(utilizationRate);
      item.low_stock = item.available <= 5;
      item.critical_stock = item.available <= 2;
    });

    return Object.values(grouped);
  };

  const fetchAlerts = async () => {
    try {
      // For now, we'll show an empty alerts list since the table doesn't exist
      // In a real implementation, you'd create the inventory_alerts table
      setAlerts([]);
    } catch (error) {
      handleError(error, { message: 'Failed to fetch alerts' });
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('name')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      handleError(error, { message: 'Failed to fetch locations' });
    }
  };

  const fetchProductCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('bottles')
        .select('product_code, description')
        .eq('organization_id', userProfile.organization_id)
        .not('product_code', 'is', null);

      if (error) throw error;
      
      const uniqueProducts = [...new Set(data.map(item => item.product_code))];
      setProductCodes(uniqueProducts);
    } catch (error) {
      handleError(error, { message: 'Failed to fetch product codes' });
    }
  };

  const generatePredictions = () => {
    // Simple prediction algorithm based on historical data
    const predictions = {
      low_stock_risk: inventory.filter(item => item.low_stock).length,
      critical_stock_risk: inventory.filter(item => item.critical_stock).length,
      high_utilization: inventory.filter(item => item.utilization_rate > 80).length,
      reorder_recommendations: inventory
        .filter(item => item.available <= 3)
        .map(item => ({
          product_code: item.product_code,
          description: item.description,
          location: item.location,
          recommended_quantity: Math.max(10, item.total * 0.3)
        }))
    };
    
    setPredictions(predictions);
  };

  const createAlert = async () => {
    try {
      // For now, just close the dialog since we don't have the alerts table
      // In a real implementation, you'd insert into the inventory_alerts table
      setAlertDialog(false);
      setNewAlert({
        type: 'low_stock',
        threshold: 10,
        product_code: '',
        location: ''
      });
      
      // Show a message that this feature requires the alerts table
      alert('Alert creation requires the inventory_alerts table to be created in your database.');
    } catch (error) {
      handleError(error, { message: 'Failed to create alert' });
    }
  };

  const getStockLevelColor = (available, total) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    if (percentage <= 10) return 'error';
    if (percentage <= 25) return 'warning';
    return 'success';
  };

  const getUtilizationColor = (rate) => {
    if (rate >= 90) return 'error';
    if (rate >= 75) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🧠 Smart Inventory Management
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Items
                  </Typography>
                  <Typography variant="h4">
                    {inventory.reduce((sum, item) => sum + item.total, 0)}
                  </Typography>
                </Box>
                <InventoryIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Available
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {inventory.reduce((sum, item) => sum + item.available, 0)}
                  </Typography>
                </Box>
                <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Low Stock Items
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {inventory.filter(item => item.low_stock).length}
                  </Typography>
                </Box>
                <WarningIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Alerts
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {alerts.length}
                  </Typography>
                </Box>
                <NotificationsIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inventory Table */}
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Inventory Overview</Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchInventory}
          >
            Refresh
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Available</TableCell>
                <TableCell>Rented</TableCell>
                <TableCell>Utilization</TableCell>
                <TableCell>Stock Level</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell>{item.product_code}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>{item.total}</TableCell>
                  <TableCell>
                    <Typography color={getStockLevelColor(item.available, item.total).main}>
                      {item.available}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.rented}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress
                        variant="determinate"
                        value={item.utilization_rate}
                        color={getUtilizationColor(item.utilization_rate)}
                        sx={{ width: 60 }}
                      />
                      <Typography variant="body2">
                        {item.utilization_rate}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      {item.critical_stock && (
                        <Chip label="Critical" color="error" size="small" />
                      )}
                      {item.low_stock && !item.critical_stock && (
                        <Chip label="Low" color="warning" size="small" />
                      )}
                      {!item.low_stock && (
                        <Chip label="Good" color="success" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Alerts Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Inventory Alerts</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAlertDialog(true)}
              >
                Add Alert
              </Button>
            </Box>
            <Box sx={{ p: 2 }}>
              {alerts.length === 0 ? (
                <Alert severity="info">No alerts configured. Add alerts to monitor inventory levels.</Alert>
              ) : (
                alerts.map((alert, index) => (
                  <Alert
                    key={index}
                    severity={alert.type === 'critical_stock' ? 'error' : 'warning'}
                    sx={{ mb: 2 }}
                    action={
                      <Box>
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    {alert.product_code} at {alert.location} - Threshold: {alert.threshold}
                  </Alert>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Predictions & Insights
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Low Stock Risk
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {predictions.low_stock_risk || 0}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Critical Stock Risk
                </Typography>
                <Typography variant="h4" color="error.main">
                  {predictions.critical_stock_risk || 0}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  High Utilization Items
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {predictions.high_utilization || 0}
                </Typography>
              </Box>

              {predictions.reorder_recommendations?.length > 0 && (
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Reorder Recommendations
                  </Typography>
                  {predictions.reorder_recommendations.map((rec, index) => (
                    <Chip
                      key={index}
                      label={`${rec.product_code}: ${rec.recommended_quantity}`}
                      color="primary"
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Alert Dialog */}
      <Dialog open={alertDialog} onClose={() => setAlertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Inventory Alert</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={newAlert.type}
                onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                label="Alert Type"
              >
                <MenuItem value="low_stock">Low Stock</MenuItem>
                <MenuItem value="critical_stock">Critical Stock</MenuItem>
                <MenuItem value="high_utilization">High Utilization</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Threshold"
              type="number"
              value={newAlert.threshold}
              onChange={(e) => setNewAlert({ ...newAlert, threshold: parseInt(e.target.value) })}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Product Code (Optional)</InputLabel>
              <Select
                value={newAlert.product_code}
                onChange={(e) => setNewAlert({ ...newAlert, product_code: e.target.value })}
                label="Product Code (Optional)"
              >
                <MenuItem value="">All Products</MenuItem>
                {productCodes.map(code => (
                  <MenuItem key={code} value={code}>{code}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Location (Optional)</InputLabel>
              <Select
                value={newAlert.location}
                onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
                label="Location (Optional)"
              >
                <MenuItem value="">All Locations</MenuItem>
                {locations.map(location => (
                  <MenuItem key={location.name} value={location.name}>{location.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={createAlert}>
            Create Alert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 