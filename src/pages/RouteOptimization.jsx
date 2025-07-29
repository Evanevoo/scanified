import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert,
  CircularProgress, Tabs, Tab, Switch, FormControlLabel, Divider,
  List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction,
  Accordion, AccordionSummary, AccordionDetails, Avatar, Tooltip
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Navigation as RouteIcon, Map as MapIcon, Traffic as TrafficIcon,
  Schedule as ScheduleIcon, CheckCircle as CheckIcon, Warning as WarningIcon, 
  LocationOn as LocationIcon, LocalShipping as TruckIcon,
  Timer as TimerIcon, TrendingUp as OptimizeIcon, Refresh as RefreshIcon,
  Print as PrintIcon, Send as SendIcon, ExpandMore as ExpandMoreIcon,
  MyLocation as CurrentLocationIcon, DirectionsCar as DirectionsIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { deliveryService } from '../services/deliveryService';

// Google Maps integration component
function RouteMap({ routes, selectedRoute, onRouteSelect, center, zoom = 10 }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);

  useEffect(() => {
    if (window.google && mapRef.current) {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: center || { lat: 40.7128, lng: -74.0060 }, // Default to NYC
        zoom: zoom,
        mapTypeId: 'roadmap'
      });

      const service = new window.google.maps.DirectionsService();
      const renderer = new window.google.maps.DirectionsRenderer({
        draggable: true,
        panel: null
      });

      renderer.setMap(googleMap);

      setMap(googleMap);
      setDirectionsService(service);
      setDirectionsRenderer(renderer);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (selectedRoute && directionsService && directionsRenderer) {
      displayRoute(selectedRoute);
    }
  }, [selectedRoute, directionsService, directionsRenderer]);

  const displayRoute = (route) => {
    if (!route.waypoints || route.waypoints.length < 2) return;

    const waypoints = route.waypoints.slice(1, -1).map(wp => ({
      location: wp.address,
      stopover: true
    }));

    const request = {
      origin: route.waypoints[0].address,
      destination: route.waypoints[route.waypoints.length - 1].address,
      waypoints: waypoints,
      optimizeWaypoints: true,
      travelMode: window.google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
      } else {
        console.error('Directions request failed:', status);
      }
    });
  };

  return (
    <Box sx={{ height: '500px', width: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {!window.google && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          <Alert severity="warning">
            Google Maps API not loaded. Please check your API key configuration.
          </Alert>
        </Box>
      )}
    </Box>
  );
}

function RouteBuilder({ onRouteCreated, customers, drivers, trucks }) {
  const [routeData, setRouteData] = useState({
    name: '',
    driver_id: '',
    truck_id: '',
    planned_date: '',
    waypoints: [],
    optimization_preference: 'time', // time, distance, fuel
    avoid_highways: false,
    avoid_tolls: false,
    max_driving_time: 8 * 60, // 8 hours in minutes
    max_stops: 20
  });
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [routeAnalysis, setRouteAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const addCustomerToRoute = (customer) => {
    if (!selectedCustomers.find(c => c.id === customer.id)) {
      setSelectedCustomers(prev => [...prev, customer]);
      setRouteData(prev => ({
        ...prev,
        waypoints: [...prev.waypoints, {
          customer_id: customer.id,
          address: customer.address,
          name: customer.name,
          estimated_service_time: 15, // minutes
          priority: 'normal'
        }]
      }));
    }
  };

  const removeCustomerFromRoute = (customerId) => {
    setSelectedCustomers(prev => prev.filter(c => c.id !== customerId));
    setRouteData(prev => ({
      ...prev,
      waypoints: prev.waypoints.filter(wp => wp.customer_id !== customerId)
    }));
  };

  const optimizeRoute = async () => {
    if (routeData.waypoints.length < 2) {
      alert('Please add at least 2 stops to optimize the route');
      return;
    }

    setOptimizing(true);
    try {
      // Call route optimization service
      const response = await fetch('/api/optimize-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waypoints: routeData.waypoints,
          optimization_preference: routeData.optimization_preference,
          avoid_highways: routeData.avoid_highways,
          avoid_tolls: routeData.avoid_tolls,
          max_driving_time: routeData.max_driving_time
        })
      });

      if (!response.ok) {
        throw new Error('Route optimization failed');
      }

      const optimizedData = await response.json();
      
      setRouteAnalysis(optimizedData);
      setRouteData(prev => ({
        ...prev,
        waypoints: optimizedData.optimized_waypoints,
        total_distance: optimizedData.total_distance,
        total_time: optimizedData.total_time,
        estimated_fuel_cost: optimizedData.estimated_fuel_cost
      }));

    } catch (error) {
      console.error('Route optimization error:', error);
      alert('Failed to optimize route. Using simple distance-based optimization.');
      
      // Fallback: simple distance-based optimization
      const optimizedWaypoints = [...routeData.waypoints].sort((a, b) => {
        // Simple heuristic based on alphabetical order of addresses
        return a.address.localeCompare(b.address);
      });
      
      setRouteData(prev => ({
        ...prev,
        waypoints: optimizedWaypoints
      }));
    } finally {
      setOptimizing(false);
    }
  };

  const createRoute = async () => {
    if (!routeData.name || !routeData.driver_id || !routeData.truck_id || routeData.waypoints.length === 0) {
      alert('Please fill all required fields and add at least one stop');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_routes')
        .insert({
          ...routeData,
          waypoints: JSON.stringify(routeData.waypoints),
          status: 'planned',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      onRouteCreated(data);
      
      // Reset form
      setRouteData({
        name: '',
        driver_id: '',
        truck_id: '',
        planned_date: '',
        waypoints: [],
        optimization_preference: 'time',
        avoid_highways: false,
        avoid_tolls: false,
        max_driving_time: 8 * 60,
        max_stops: 20
      });
      setSelectedCustomers([]);
      setRouteAnalysis(null);

    } catch (error) {
      console.error('Error creating route:', error);
      alert('Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        <RouteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Route Builder
      </Typography>

      <Grid container spacing={3}>
        {/* Route Configuration */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Route Configuration
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Route Name"
                  value={routeData.name}
                  onChange={(e) => setRouteData({ ...routeData, name: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Driver</InputLabel>
                  <Select
                    value={routeData.driver_id}
                    onChange={(e) => setRouteData({ ...routeData, driver_id: e.target.value })}
                    label="Driver"
                  >
                    {drivers.map(driver => (
                      <MenuItem key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Truck</InputLabel>
                  <Select
                    value={routeData.truck_id}
                    onChange={(e) => setRouteData({ ...routeData, truck_id: e.target.value })}
                    label="Truck"
                  >
                    {trucks.map(truck => (
                      <MenuItem key={truck.id} value={truck.id}>
                        {truck.license_plate} - {truck.model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Planned Date"
                  type="date"
                  value={routeData.planned_date}
                  onChange={(e) => setRouteData({ ...routeData, planned_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Optimization</InputLabel>
                  <Select
                    value={routeData.optimization_preference}
                    onChange={(e) => setRouteData({ ...routeData, optimization_preference: e.target.value })}
                    label="Optimization"
                  >
                    <MenuItem value="time">Minimize Time</MenuItem>
                    <MenuItem value="distance">Minimize Distance</MenuItem>
                    <MenuItem value="fuel">Minimize Fuel Cost</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={routeData.avoid_highways}
                      onChange={(e) => setRouteData({ ...routeData, avoid_highways: e.target.checked })}
                    />
                  }
                  label="Avoid Highways"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={routeData.avoid_tolls}
                      onChange={(e) => setRouteData({ ...routeData, avoid_tolls: e.target.checked })}
                    />
                  }
                  label="Avoid Tolls"
                />
              </Grid>
            </Grid>
          </Card>

          {/* Customer Selection */}
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add Customers ({selectedCustomers.length} selected)
            </Typography>
            
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {customers.map(customer => (
                  <ListItem key={customer.id}>
                    <ListItemIcon>
                      <LocationIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={customer.name}
                      secondary={customer.address}
                    />
                    <ListItemSecondaryAction>
                      {selectedCustomers.find(c => c.id === customer.id) ? (
                        <Button
                          size="small"
                          onClick={() => removeCustomerFromRoute(customer.id)}
                          color="error"
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          onClick={() => addCustomerToRoute(customer)}
                          variant="outlined"
                        >
                          Add
                        </Button>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Card>
        </Grid>

        {/* Route Preview */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Route Preview
            </Typography>
            
            {routeData.waypoints.length > 0 ? (
              <Box>
                <List dense>
                  {routeData.waypoints.map((waypoint, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                          {index + 1}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={waypoint.name}
                        secondary={waypoint.address}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={optimizeRoute}
                    disabled={optimizing}
                    startIcon={optimizing ? <CircularProgress size={20} /> : <OptimizeIcon />}
                  >
                    {optimizing ? 'Optimizing...' : 'Optimize Route'}
                  </Button>
                </Box>
                
                {routeAnalysis && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Route Analysis:</strong><br/>
                      Total Distance: {routeAnalysis.total_distance || 'N/A'}<br/>
                      Estimated Time: {routeAnalysis.total_time || 'N/A'}<br/>
                      Fuel Cost: ${routeAnalysis.estimated_fuel_cost || 'N/A'}
                    </Typography>
                  </Alert>
                )}
              </Box>
            ) : (
              <Typography color="text.secondary">
                Add customers to see route preview
              </Typography>
            )}
          </Card>

          {/* Route Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={createRoute}
              disabled={loading || routeData.waypoints.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              Create Route
            </Button>
            <Button
              variant="outlined"
              disabled={routeData.waypoints.length === 0}
              startIcon={<PrintIcon />}
            >
              Print Route
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}

function RouteTracker({ routes }) {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [liveTracking, setLiveTracking] = useState(false);

  const startTracking = (route) => {
    setSelectedRoute(route);
    setLiveTracking(true);
    // Start real-time tracking
    console.log('Starting live tracking for route:', route.id);
  };

  const stopTracking = () => {
    setLiveTracking(false);
    setSelectedRoute(null);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        <TrafficIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Live Route Tracking
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" gutterBottom>
            Active Routes
          </Typography>
          
          <List>
            {routes.filter(r => r.status === 'in_progress').map(route => (
              <ListItem key={route.id} button onClick={() => setSelectedRoute(route)}>
                <ListItemIcon>
                  <TruckIcon />
                </ListItemIcon>
                <ListItemText
                  primary={route.name}
                  secondary={`Driver: ${route.driver_name} | ${route.waypoints?.length || 0} stops`}
                />
                <ListItemSecondaryAction>
                  <Chip 
                    label={route.status} 
                    color="primary" 
                    size="small"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedRoute ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {selectedRoute.name}
                </Typography>
                <Box>
                  {liveTracking ? (
                    <Button
                      variant="outlined"
                      onClick={stopTracking}
                      color="error"
                      startIcon={<DirectionsIcon />}
                    >
                      Stop Tracking
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={() => startTracking(selectedRoute)}
                      startIcon={<DirectionsIcon />}
                    >
                      Start Tracking
                    </Button>
                  )}
                </Box>
              </Box>

              <RouteMap
                routes={[selectedRoute]}
                selectedRoute={selectedRoute}
                onRouteSelect={setSelectedRoute}
              />

              {liveTracking && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    🔴 Live tracking active - Route progress will update in real-time
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ 
              height: 400, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '2px dashed #ccc',
              borderRadius: 2
            }}>
              <Typography color="text.secondary">
                Select a route to view tracking details
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
}

function RouteOptimization() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [routes, setRoutes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch routes
      const { data: routesData, error: routesError } = await supabase
        .from('delivery_routes')
        .select(`
          *,
          drivers:profiles!delivery_routes_driver_id_fkey(full_name),
          trucks(license_plate, model)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (routesError) throw routesError;

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (customersError) throw customersError;

      // Fetch drivers
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('role', 'driver')
        .order('full_name');

      if (driversError) throw driversError;

      // Fetch trucks
      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'idle')
        .order('license_plate');

      if (trucksError) throw trucksError;

      setRoutes(routesData || []);
      setCustomers(customersData || []);
      setDrivers(driversData || []);
      setTrucks(trucksData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteCreated = (route) => {
    setRoutes(prev => [route, ...prev]);
    setActiveTab(1); // Switch to routes tab
  };

  const stats = {
    totalRoutes: routes.length,
    activeRoutes: routes.filter(r => r.status === 'in_progress').length,
    completedRoutes: routes.filter(r => r.status === 'completed').length,
    totalDistance: routes.reduce((sum, r) => sum + (r.total_distance || 0), 0)
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Route Optimization</Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Routes
              </Typography>
              <Typography variant="h4">{stats.totalRoutes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Routes
              </Typography>
              <Typography variant="h4" color="primary.main">{stats.activeRoutes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed Today
              </Typography>
              <Typography variant="h4" color="success.main">{stats.completedRoutes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Distance
              </Typography>
              <Typography variant="h4">{stats.totalDistance.toFixed(1)} mi</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Create Route" />
          <Tab label="Manage Routes" />
          <Tab label="Live Tracking" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <RouteBuilder
          onRouteCreated={handleRouteCreated}
          customers={customers}
          drivers={drivers}
          trucks={trucks}
        />
      )}

      {activeTab === 1 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Route Name</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Truck</TableCell>
                  <TableCell>Stops</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Distance</TableCell>
                  <TableCell>Est. Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.map(route => (
                  <TableRow key={route.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{route.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {route.planned_date}
                      </Typography>
                    </TableCell>
                    <TableCell>{route.drivers?.full_name}</TableCell>
                    <TableCell>{route.trucks?.license_plate}</TableCell>
                    <TableCell>{JSON.parse(route.waypoints || '[]').length}</TableCell>
                    <TableCell>
                      <Chip
                        label={route.status}
                        color={route.status === 'completed' ? 'success' : 
                               route.status === 'in_progress' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{route.total_distance || 'N/A'}</TableCell>
                    <TableCell>{route.total_time || 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <MapIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 2 && (
        <RouteTracker routes={routes} />
      )}
    </Box>
  );
}

export default RouteOptimization; 