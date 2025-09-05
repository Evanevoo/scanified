import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Grid, Card, CardContent, Box, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
  Alert, CircularProgress, IconButton, Tooltip, LinearProgress
} from '@mui/material';
import {
  LocalShipping as TruckIcon,
  Assignment as ManifestIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Timeline as AnalyticsIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  PlayArrow as StartIcon,
  Stop as CompleteReconciliationIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import TruckReconciliationService from '../services/truckReconciliationService';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reconciliation-tabpanel-${index}`}
      aria-labelledby={`reconciliation-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function TruckReconciliationDashboard() {
  const { user, organization } = useAuth();
  const { hasPermission } = usePermissions();
  
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manifests, setManifests] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [routes, setRoutes] = useState([]);
  
  // Dialog states
  const [manifestDialog, setManifestDialog] = useState({ open: false, data: null });
  const [reconciliationDialog, setReconciliationDialog] = useState({ open: false, data: null });
  const [routeDialog, setRouteDialog] = useState({ open: false, data: null });
  
  // Form states
  const [manifestForm, setManifestForm] = useState({
    routeId: '',
    manifestType: 'delivery',
    driverId: '',
    truckId: '',
    manifestDate: new Date().toISOString().split('T')[0]
  });
  
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    routeCode: '',
    driverId: '',
    truckId: '',
    estimatedDuration: '',
    totalDistance: '',
    notes: ''
  });
  
  const [reconciliationForm, setReconciliationForm] = useState({
    actualOut: 0,
    actualIn: 0,
    actualExchange: 0,
    notes: ''
  });

  // Load data
  useEffect(() => {
    if (organization?.id) {
      loadDashboardData();
    }
  }, [organization?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [manifestsData, reconciliationsData, routesData, analyticsData] = await Promise.all([
        TruckReconciliationService.getDeliveryManifests(organization.id),
        TruckReconciliationService.getTruckReconciliations(organization.id),
        TruckReconciliationService.getDeliveryRoutes(organization.id),
        TruckReconciliationService.getReconciliationAnalytics(organization.id)
      ]);

      setManifests(manifestsData || []);
      setReconciliations(reconciliationsData || []);
      setRoutes(routesData || []);
      setAnalytics(analyticsData || {});

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
      // Set default empty values
      setManifests([]);
      setReconciliations([]);
      setRoutes([]);
      setAnalytics({});
    } finally {
      setLoading(false);
    }
  };

  // Handle create route
  const handleCreateRoute = async () => {
    try {
      await TruckReconciliationService.createDeliveryRoute(organization.id, routeForm);
      
      setRouteDialog({ open: false, data: null });
      setRouteForm({
        routeName: '',
        routeCode: '',
        driverId: '',
        truckId: '',
        estimatedDuration: '',
        totalDistance: '',
        notes: ''
      });
      
      await loadDashboardData();

    } catch (error) {
      console.error('Error creating route:', error);
    }
  };

  // Handle create manifest
  const handleCreateManifest = async () => {
    try {
      await TruckReconciliationService.createDeliveryManifest(organization.id, {
        ...manifestForm,
        createdBy: user.id
      });
      
      setManifestDialog({ open: false, data: null });
      setManifestForm({
        routeId: '',
        manifestType: 'delivery',
        driverId: '',
        truckId: '',
        manifestDate: new Date().toISOString().split('T')[0]
      });
      
      await loadDashboardData();

    } catch (error) {
      console.error('Error creating manifest:', error);
    }
  };

  // Handle start reconciliation
  const handleStartReconciliation = async (manifestId) => {
    try {
      await TruckReconciliationService.startTruckReconciliation(manifestId, user.id);
      await loadDashboardData();
    } catch (error) {
      console.error('Error starting reconciliation:', error);
    }
  };

  // Handle complete reconciliation
  const handleCompleteReconciliation = async (reconciliationId) => {
    try {
      const actualCounts = {
        out: parseInt(reconciliationForm.actualOut),
        in: parseInt(reconciliationForm.actualIn),
        exchange: parseInt(reconciliationForm.actualExchange)
      };

      await TruckReconciliationService.completeTruckReconciliation(
        reconciliationId, 
        actualCounts, 
        reconciliationForm.notes
      );
      
      setReconciliationDialog({ open: false, data: null });
      setReconciliationForm({
        actualOut: 0,
        actualIn: 0,
        actualExchange: 0,
        notes: ''
      });
      
      await loadDashboardData();

    } catch (error) {
      console.error('Error completing reconciliation:', error);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'disputed': return 'error';
      case 'active': return 'success';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Truck Reconciliation Dashboard</Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading dashboard: {error}
        </Alert>
        <Alert severity="info" sx={{ mb: 2 }}>
          This feature requires truck reconciliation tables to be set up in your database.
          Please run the database migration script to enable this feature.
        </Alert>
        <Button variant="contained" onClick={loadDashboardData}>
          Retry
        </Button>
      </Container>
    );
  }

  if (!organization) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Truck Reconciliation Dashboard</Typography>
        <Alert severity="warning">
          No organization found. Please ensure you're logged in and have access to an organization.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          🚛 Truck Reconciliation
        </Typography>
        {hasPermission('manage_deliveries') && (
          <Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setRouteDialog({ open: true, data: null })}
              sx={{ mr: 1 }}
            >
              New Route
            </Button>
            <Button
              variant="contained"
              startIcon={<ManifestIcon />}
              onClick={() => setManifestDialog({ open: true, data: null })}
            >
              New Manifest
            </Button>
          </Box>
        )}
      </Box>

      {/* Analytics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Manifests
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {manifests.length}
                  </Typography>
                </Box>
                <ManifestIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Reconciliations
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {reconciliations.length}
                  </Typography>
                </Box>
                <CompleteIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {analytics.completionRate || 0}%
                  </Typography>
                </Box>
                <AnalyticsIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Discrepancy Cost
                  </Typography>
                  <Typography variant="h4" component="h2">
                    ${analytics.totalDiscrepancyCost?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
                <ErrorIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Accuracy Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Outbound Accuracy
              </Typography>
              <LinearProgress
                variant="determinate"
                value={parseFloat(analytics.outAccuracy || 100)}
                sx={{ height: 10, borderRadius: 5, mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {analytics.outAccuracy || 100}% - {analytics.totalActualOut || 0} of {analytics.totalExpectedOut || 0} cylinders
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inbound Accuracy
              </Typography>
              <LinearProgress
                variant="determinate"
                value={parseFloat(analytics.inAccuracy || 100)}
                sx={{ height: 10, borderRadius: 5, mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {analytics.inAccuracy || 100}% - {analytics.totalActualIn || 0} of {analytics.totalExpectedIn || 0} cylinders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Delivery Manifests" />
            <Tab label="Reconciliations" />
            <Tab label="Routes" />
          </Tabs>
        </Box>

        {/* Delivery Manifests Tab */}
        <TabPanel value={activeTab} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Manifest #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Truck</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Cylinders</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {manifests.map((manifest) => (
                  <TableRow key={manifest.id}>
                    <TableCell>{manifest.manifest_number}</TableCell>
                    <TableCell>
                      {new Date(manifest.manifest_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{manifest.driver?.full_name || 'N/A'}</TableCell>
                    <TableCell>{manifest.truck_id}</TableCell>
                    <TableCell>
                      <Chip 
                        label={manifest.manifest_type} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={manifest.status} 
                        size="small"
                        color={getStatusColor(manifest.status)}
                      />
                    </TableCell>
                    <TableCell>
                      Out: {manifest.total_cylinders_out} | In: {manifest.total_cylinders_in}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {manifest.status === 'completed' && !manifest.reconciliation?.length && (
                        <Tooltip title="Start Reconciliation">
                          <IconButton 
                            size="small"
                            color="primary"
                            onClick={() => handleStartReconciliation(manifest.id)}
                          >
                            <StartIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Reconciliations Tab */}
        <TabPanel value={activeTab} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Manifest #</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Truck</TableCell>
                  <TableCell>Expected</TableCell>
                  <TableCell>Actual</TableCell>
                  <TableCell>Discrepancies</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reconciliations.map((reconciliation) => (
                  <TableRow key={reconciliation.id}>
                    <TableCell>
                      {new Date(reconciliation.reconciliation_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{reconciliation.manifest?.manifest_number}</TableCell>
                    <TableCell>{reconciliation.driver?.full_name}</TableCell>
                    <TableCell>{reconciliation.truck_id}</TableCell>
                    <TableCell>
                      Out: {reconciliation.expected_out} | In: {reconciliation.expected_in}
                    </TableCell>
                    <TableCell>
                      Out: {reconciliation.actual_out} | In: {reconciliation.actual_in}
                    </TableCell>
                    <TableCell>
                      {reconciliation.missing_cylinders > 0 && (
                        <Chip label={`-${reconciliation.missing_cylinders}`} size="small" color="error" />
                      )}
                      {reconciliation.extra_cylinders > 0 && (
                        <Chip label={`+${reconciliation.extra_cylinders}`} size="small" color="warning" />
                      )}
                      {reconciliation.missing_cylinders === 0 && reconciliation.extra_cylinders === 0 && (
                        <Chip label="Perfect" size="small" color="success" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={reconciliation.status} 
                        size="small"
                        color={getStatusColor(reconciliation.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {reconciliation.status === 'in_progress' && (
                        <Tooltip title="Complete Reconciliation">
                          <IconButton 
                            size="small"
                            color="primary"
                            onClick={() => {
                              setReconciliationForm({
                                actualOut: reconciliation.expected_out,
                                actualIn: reconciliation.expected_in,
                                actualExchange: reconciliation.expected_exchange,
                                notes: ''
                              });
                              setReconciliationDialog({ open: true, data: reconciliation });
                            }}
                          >
                            <CompleteReconciliationIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Routes Tab */}
        <TabPanel value={activeTab} index={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Route Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Truck</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Distance</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell>{route.route_name}</TableCell>
                    <TableCell>{route.route_code}</TableCell>
                    <TableCell>{route.driver?.full_name || 'N/A'}</TableCell>
                    <TableCell>{route.truck_id}</TableCell>
                    <TableCell>{route.estimated_duration} min</TableCell>
                    <TableCell>{route.total_distance} mi</TableCell>
                    <TableCell>
                      <Chip 
                        label={route.status} 
                        size="small"
                        color={getStatusColor(route.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit Route">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>

      {/* Create Route Dialog */}
      <Dialog open={routeDialog.open} onClose={() => setRouteDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>Create Delivery Route</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Route Name"
                fullWidth
                value={routeForm.routeName}
                onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Route Code"
                fullWidth
                value={routeForm.routeCode}
                onChange={(e) => setRouteForm({ ...routeForm, routeCode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Truck ID"
                fullWidth
                value={routeForm.truckId}
                onChange={(e) => setRouteForm({ ...routeForm, truckId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Estimated Duration (minutes)"
                type="number"
                fullWidth
                value={routeForm.estimatedDuration}
                onChange={(e) => setRouteForm({ ...routeForm, estimatedDuration: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Total Distance (miles)"
                type="number"
                fullWidth
                value={routeForm.totalDistance}
                onChange={(e) => setRouteForm({ ...routeForm, totalDistance: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                multiline
                rows={3}
                fullWidth
                value={routeForm.notes}
                onChange={(e) => setRouteForm({ ...routeForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRouteDialog({ open: false, data: null })}>Cancel</Button>
          <Button onClick={handleCreateRoute} variant="contained">Create Route</Button>
        </DialogActions>
      </Dialog>

      {/* Create Manifest Dialog */}
      <Dialog open={manifestDialog.open} onClose={() => setManifestDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>Create Delivery Manifest</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Route</InputLabel>
                <Select
                  value={manifestForm.routeId}
                  onChange={(e) => setManifestForm({ ...manifestForm, routeId: e.target.value })}
                >
                  {routes.map((route) => (
                    <MenuItem key={route.id} value={route.id}>
                      {route.route_name} ({route.route_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Manifest Type</InputLabel>
                <Select
                  value={manifestForm.manifestType}
                  onChange={(e) => setManifestForm({ ...manifestForm, manifestType: e.target.value })}
                >
                  <MenuItem value="delivery">Delivery</MenuItem>
                  <MenuItem value="pickup">Pickup</MenuItem>
                  <MenuItem value="exchange">Exchange</MenuItem>
                  <MenuItem value="service">Service</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Truck ID"
                fullWidth
                value={manifestForm.truckId}
                onChange={(e) => setManifestForm({ ...manifestForm, truckId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Manifest Date"
                type="date"
                fullWidth
                value={manifestForm.manifestDate}
                onChange={(e) => setManifestForm({ ...manifestForm, manifestDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManifestDialog({ open: false, data: null })}>Cancel</Button>
          <Button onClick={handleCreateManifest} variant="contained">Create Manifest</Button>
        </DialogActions>
      </Dialog>

      {/* Complete Reconciliation Dialog */}
      <Dialog open={reconciliationDialog.open} onClose={() => setReconciliationDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>Complete Truck Reconciliation</DialogTitle>
        <DialogContent>
          {reconciliationDialog.data && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Manifest: {reconciliationDialog.data.manifest?.manifest_number} | 
                Expected Out: {reconciliationDialog.data.expected_out} | 
                Expected In: {reconciliationDialog.data.expected_in}
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Actual Out"
                    type="number"
                    fullWidth
                    value={reconciliationForm.actualOut}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, actualOut: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Actual In"
                    type="number"
                    fullWidth
                    value={reconciliationForm.actualIn}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, actualIn: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Actual Exchange"
                    type="number"
                    fullWidth
                    value={reconciliationForm.actualExchange}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, actualExchange: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Reconciliation Notes"
                    multiline
                    rows={4}
                    fullWidth
                    value={reconciliationForm.notes}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReconciliationDialog({ open: false, data: null })}>Cancel</Button>
          <Button 
            onClick={() => handleCompleteReconciliation(reconciliationDialog.data?.id)} 
            variant="contained"
          >
            Complete Reconciliation
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
