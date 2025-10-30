import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, IconButton, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Avatar, Tooltip, Badge,
  FormControl, InputLabel, Select, MenuItem, Container,
  Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon,
  Divider, Switch, FormControlLabel, FormGroup,
  Stepper, Step, StepLabel, StepContent,
  Tabs, Tab, Slider, FormControlLabel as MuiFormControlLabel,
  Checkbox, RadioGroup, Radio
} from '@mui/material';
import {
  Route as RouteIcon,
  Directions as DirectionsIcon,
  Schedule as ScheduleIcon,
  LocalShipping as TruckIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Distance as DistanceIcon,
  GasStation as FuelIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  Navigation as NavigationIcon,
  Speed as SpeedIcon,
  Eco as EcoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export default function RouteOptimization() {
  const { profile, organization } = useAuth();
  const { can } = usePermissions();
  
  const [routes, setRoutes] = useState([]);
  const [optimizedRoutes, setOptimizedRoutes] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [createRouteDialog, setCreateRouteDialog] = useState(false);
  const [editRouteDialog, setEditRouteDialog] = useState(false);
  const [optimizeDialog, setOptimizeDialog] = useState(false);
  const [viewRouteDialog, setViewRouteDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  // Form states
  const [routeForm, setRouteForm] = useState({
    name: '',
    description: '',
    driver_id: '',
    vehicle_id: '',
    delivery_ids: [],
    start_location: '',
    end_location: '',
    start_time: '',
    end_time: '',
    max_stops: 50,
    max_distance: 500,
    fuel_cost_per_mile: 0.50,
    driver_cost_per_hour: 25.00,
    priority: 'medium'
  });
  
  const [optimizationSettings, setOptimizationSettings] = useState({
    algorithm: 'time_based',
    constraints: {
      max_distance: 500,
      max_time: 8,
      max_stops: 50,
      avoid_tolls: false,
      avoid_highways: false,
      fuel_efficiency: true
    },
    preferences: {
      minimize_time: true,
      minimize_distance: false,
      minimize_cost: false,
      balance_load: true
    }
  });

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const orgId = profile.organization_id;

      // Fetch routes, deliveries, drivers, and vehicles in parallel
      const [routesResult, deliveriesResult, driversResult, vehiclesResult] = await Promise.all([
        supabase
          .from('delivery_routes')
          .select(`
            *,
            driver:profiles!delivery_routes_driver_id_fkey(full_name, email),
            vehicle:vehicles(name, type, capacity)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('deliveries')
          .select(`
            *,
            customer:customers(name, address, city, state, postal_code, phone, email)
          `)
          .eq('organization_id', orgId)
          .eq('status', 'pending')
          .order('delivery_date', { ascending: true }),
        
        supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('organization_id', orgId)
          .in('role', ['driver', 'admin', 'manager']),
        
        supabase
          .from('vehicles')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true)
      ]);

      if (routesResult.error) throw routesResult.error;
      if (deliveriesResult.error) throw deliveriesResult.error;
      if (driversResult.error) throw driversResult.error;
      if (vehiclesResult.error) throw vehiclesResult.error;

      setRoutes(routesResult.data || []);
      setDeliveries(deliveriesResult.data || []);
      setDrivers(driversResult.data || []);
      setVehicles(vehiclesResult.data || []);

    } catch (error) {
      console.error('Error fetching route data:', error);
      setError('Failed to load route optimization data');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeRoutes = async () => {
    try {
      setOptimizing(true);
      setError('');
      
      // Simulate route optimization (in a real app, this would call a routing API)
      const optimizationResult = await simulateRouteOptimization();
      
      setOptimizedRoutes(optimizationResult);
      setSuccess('Routes optimized successfully');
      setOptimizeDialog(false);

    } catch (error) {
      console.error('Error optimizing routes:', error);
      setError('Failed to optimize routes');
    } finally {
      setOptimizing(false);
    }
  };

  const simulateRouteOptimization = async () => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock optimized routes
    const mockOptimizedRoutes = deliveries.slice(0, 3).map((delivery, index) => ({
      id: `optimized_${index}`,
      name: `Optimized Route ${index + 1}`,
      driver: drivers[index % drivers.length],
      vehicle: vehicles[index % vehicles.length],
      deliveries: [delivery],
      total_distance: Math.random() * 100 + 50,
      total_time: Math.random() * 4 + 2,
      total_cost: Math.random() * 200 + 100,
      fuel_cost: Math.random() * 50 + 25,
      driver_cost: Math.random() * 100 + 50,
      efficiency_score: Math.random() * 20 + 80,
      stops: [
        {
          order: 1,
          delivery: delivery,
          estimated_arrival: new Date(Date.now() + index * 60 * 60 * 1000).toISOString(),
          estimated_departure: new Date(Date.now() + (index + 1) * 60 * 60 * 1000).toISOString(),
          distance_from_previous: Math.random() * 20 + 5
        }
      ]
    }));
    
    return mockOptimizedRoutes;
  };

  const handleCreateRoute = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('delivery_routes')
        .insert({
          organization_id: profile.organization_id,
          name: routeForm.name,
          description: routeForm.description,
          driver_id: routeForm.driver_id || null,
          vehicle_id: routeForm.vehicle_id || null,
          delivery_ids: routeForm.delivery_ids,
          start_location: routeForm.start_location,
          end_location: routeForm.end_location,
          start_time: routeForm.start_time,
          end_time: routeForm.end_time,
          max_stops: routeForm.max_stops,
          max_distance: routeForm.max_distance,
          fuel_cost_per_mile: routeForm.fuel_cost_per_mile,
          driver_cost_per_hour: routeForm.driver_cost_per_hour,
          priority: routeForm.priority,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Route created successfully');
      setCreateRouteDialog(false);
      resetRouteForm();
      fetchData();

    } catch (error) {
      console.error('Error creating route:', error);
      setError('Failed to create route');
    }
  };

  const resetRouteForm = () => {
    setRouteForm({
      name: '',
      description: '',
      driver_id: '',
      vehicle_id: '',
      delivery_ids: [],
      start_location: '',
      end_location: '',
      start_time: '',
      end_time: '',
      max_stops: 50,
      max_distance: 500,
      fuel_cost_per_mile: 0.50,
      driver_cost_per_hour: 25.00,
      priority: 'medium'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'primary';
      case 'pending': return 'warning';
      case 'draft': return 'default';
      case 'cancelled': return 'error';
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

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (miles) => {
    return `${miles.toFixed(1)} mi`;
  };

  const formatCost = (cost) => {
    return `$${cost.toFixed(2)}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Route Optimization
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Optimize delivery routes for efficiency and cost savings
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setOptimizeDialog(true)}
            sx={{ mr: 2 }}
          >
            Optimize Routes
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateRouteDialog(true)}
          >
            New Route
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <RouteIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{routes.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Routes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TruckIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{deliveries.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Deliveries
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{drivers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Drivers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <DirectionsIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{optimizedRoutes.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Optimized Routes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Active Routes" />
          <Tab label="Optimized Routes" />
          <Tab label="Pending Deliveries" />
          <Tab label="Route Analytics" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Active Routes
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Route Name</TableCell>
                    <TableCell>Driver</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Deliveries</TableCell>
                    <TableCell>Distance</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{route.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {route.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {route.driver?.full_name || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {route.vehicle?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {route.delivery_ids?.length || 0}
                      </TableCell>
                      <TableCell>
                        {formatDistance(route.estimated_distance || 0)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={route.status} 
                          size="small" 
                          color={getStatusColor(route.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setSelectedRoute(route);
                                setViewRouteDialog(true);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setSelectedRoute(route);
                                setEditRouteDialog(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Optimized Routes
            </Typography>
            {optimizedRoutes.length > 0 ? (
              <Grid container spacing={3}>
                {optimizedRoutes.map((route) => (
                  <Grid item xs={12} md={6} key={route.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6">{route.name}</Typography>
                          <Chip 
                            label={`${route.efficiency_score.toFixed(0)}% Efficient`}
                            color="success"
                            size="small"
                          />
                        </Box>
                        
                        <Box mb={2}>
                          <Typography variant="body2" color="text.secondary">
                            Driver: {route.driver?.full_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Vehicle: {route.vehicle?.name}
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box textAlign="center">
                              <DistanceIcon color="primary" />
                              <Typography variant="h6">{formatDistance(route.total_distance)}</Typography>
                              <Typography variant="caption">Distance</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box textAlign="center">
                              <TimeIcon color="primary" />
                              <Typography variant="h6">{formatDuration(route.total_time * 60)}</Typography>
                              <Typography variant="caption">Time</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box textAlign="center">
                              <FuelIcon color="primary" />
                              <Typography variant="h6">{formatCost(route.total_cost)}</Typography>
                              <Typography variant="caption">Cost</Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        
                        <Box mt={2}>
                          <Typography variant="body2" color="text.secondary">
                            Deliveries: {route.deliveries.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Fuel Cost: {formatCost(route.fuel_cost)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Driver Cost: {formatCost(route.driver_cost)}
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button size="small" startIcon={<ViewIcon />}>
                          View Details
                        </Button>
                        <Button size="small" startIcon={<PlayIcon />} color="primary">
                          Accept Route
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box textAlign="center" py={4}>
                <DirectionsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No Optimized Routes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Run route optimization to see suggested routes
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  onClick={() => setOptimizeDialog(true)}
                >
                  Optimize Routes
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Pending Deliveries
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{delivery.customer?.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {delivery.customer?.phone}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{delivery.customer?.address}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {delivery.customer?.city}, {delivery.customer?.state} {delivery.customer?.postal_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={delivery.priority || 'medium'} 
                          size="small" 
                          color={getPriorityColor(delivery.priority || 'medium')}
                        />
                      </TableCell>
                      <TableCell>
                        {delivery.items?.length || 0}
                      </TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<AddIcon />}>
                          Add to Route
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Route Analytics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Performance Metrics
                    </Typography>
                    <Box mb={2}>
                      <Typography variant="body2">Average Route Efficiency</Typography>
                      <Typography variant="h4" color="primary">87%</Typography>
                    </Box>
                    <Box mb={2}>
                      <Typography variant="body2">Average Delivery Time</Typography>
                      <Typography variant="h4" color="primary">4.2h</Typography>
                    </Box>
                    <Box mb={2}>
                      <Typography variant="body2">Fuel Cost per Mile</Typography>
                      <Typography variant="h4" color="primary">$0.52</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Cost Analysis
                    </Typography>
                    <Box mb={2}>
                      <Typography variant="body2">Total Monthly Cost</Typography>
                      <Typography variant="h4" color="primary">$12,450</Typography>
                    </Box>
                    <Box mb={2}>
                      <Typography variant="body2">Fuel Savings</Typography>
                      <Typography variant="h4" color="success">$1,200</Typography>
                    </Box>
                    <Box mb={2}>
                      <Typography variant="body2">Time Savings</Typography>
                      <Typography variant="h4" color="success">15%</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* Optimize Routes Dialog */}
      <Dialog 
        open={optimizeDialog} 
        onClose={() => setOptimizeDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Optimize Delivery Routes</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Optimization Algorithm</InputLabel>
                  <Select
                    value={optimizationSettings.algorithm}
                    onChange={(e) => setOptimizationSettings({
                      ...optimizationSettings,
                      algorithm: e.target.value
                    })}
                  >
                    <MenuItem value="time_based">Time-Based Optimization</MenuItem>
                    <MenuItem value="distance_based">Distance-Based Optimization</MenuItem>
                    <MenuItem value="cost_based">Cost-Based Optimization</MenuItem>
                    <MenuItem value="balanced">Balanced Optimization</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Constraints
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Max Distance (miles)"
                      type="number"
                      value={optimizationSettings.constraints.max_distance}
                      onChange={(e) => setOptimizationSettings({
                        ...optimizationSettings,
                        constraints: {
                          ...optimizationSettings.constraints,
                          max_distance: parseInt(e.target.value) || 0
                        }
                      })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Max Time (hours)"
                      type="number"
                      value={optimizationSettings.constraints.max_time}
                      onChange={(e) => setOptimizationSettings({
                        ...optimizationSettings,
                        constraints: {
                          ...optimizationSettings.constraints,
                          max_time: parseInt(e.target.value) || 0
                        }
                      })}
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Preferences
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={optimizationSettings.preferences.minimize_time}
                        onChange={(e) => setOptimizationSettings({
                          ...optimizationSettings,
                          preferences: {
                            ...optimizationSettings.preferences,
                            minimize_time: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Minimize Time"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={optimizationSettings.preferences.minimize_distance}
                        onChange={(e) => setOptimizationSettings({
                          ...optimizationSettings,
                          preferences: {
                            ...optimizationSettings.preferences,
                            minimize_distance: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Minimize Distance"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={optimizationSettings.preferences.minimize_cost}
                        onChange={(e) => setOptimizationSettings({
                          ...optimizationSettings,
                          preferences: {
                            ...optimizationSettings.preferences,
                            minimize_cost: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Minimize Cost"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={optimizationSettings.preferences.balance_load}
                        onChange={(e) => setOptimizationSettings({
                          ...optimizationSettings,
                          preferences: {
                            ...optimizationSettings.preferences,
                            balance_load: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Balance Load"
                  />
                </FormGroup>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOptimizeDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleOptimizeRoutes} 
            variant="contained"
            disabled={optimizing}
            startIcon={optimizing ? <CircularProgress size={20} /> : <SettingsIcon />}
          >
            {optimizing ? 'Optimizing...' : 'Optimize Routes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Route Dialog */}
      <Dialog 
        open={createRouteDialog} 
        onClose={() => setCreateRouteDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Route</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Route Name"
                  value={routeForm.name}
                  onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={routeForm.description}
                  onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Driver</InputLabel>
                  <Select
                    value={routeForm.driver_id}
                    onChange={(e) => setRouteForm({ ...routeForm, driver_id: e.target.value })}
                  >
                    {drivers.map((driver) => (
                      <MenuItem key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Vehicle</InputLabel>
                  <Select
                    value={routeForm.vehicle_id}
                    onChange={(e) => setRouteForm({ ...routeForm, vehicle_id: e.target.value })}
                  >
                    {vehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Location"
                  value={routeForm.start_location}
                  onChange={(e) => setRouteForm({ ...routeForm, start_location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Location"
                  value={routeForm.end_location}
                  onChange={(e) => setRouteForm({ ...routeForm, end_location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Stops"
                  type="number"
                  value={routeForm.max_stops}
                  onChange={(e) => setRouteForm({ ...routeForm, max_stops: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Distance (miles)"
                  type="number"
                  value={routeForm.max_distance}
                  onChange={(e) => setRouteForm({ ...routeForm, max_distance: parseInt(e.target.value) || 0 })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRouteDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateRoute} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}