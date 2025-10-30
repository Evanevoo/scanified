import logger from '../utils/logger';
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
  Checkbox, RadioGroup, Radio, Autocomplete
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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
  Error as ErrorIcon,
  QrCode as QrCodeIcon,
  Scanner as ScannerIcon,
  Package as PackageIcon,
  LocalShipping as ShippingIcon,
  Storage as StorageIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Distance as DistanceIcon,
  GasStation as FuelIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export default function PalletManagement() {
  const { profile, organization } = useAuth();
  const { can } = usePermissions();
  
  const [pallets, setPallets] = useState([]);
  const [palletTemplates, setPalletTemplates] = useState([]);
  const [palletItems, setPalletItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [createPalletDialog, setCreatePalletDialog] = useState(false);
  const [editPalletDialog, setEditPalletDialog] = useState(false);
  const [createTemplateDialog, setCreateTemplateDialog] = useState(false);
  const [viewPalletDialog, setViewPalletDialog] = useState(false);
  const [bulkScanDialog, setBulkScanDialog] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState(null);
  
  // Form states
  const [palletForm, setPalletForm] = useState({
    name: '',
    description: '',
    template_id: '',
    location: '',
    max_capacity: 50,
    current_items: 0,
    status: 'active',
    priority: 'medium'
  });
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    max_capacity: 50,
    item_types: [],
    safety_requirements: [],
    handling_instructions: []
  });

  const [activeTab, setActiveTab] = useState(0);
  const [scanningMode, setScanningMode] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);

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

      // Fetch pallets, templates, and items in parallel
      const [palletsResult, templatesResult, itemsResult] = await Promise.all([
        supabase
          .from('pallets')
          .select(`
            *,
            template:pallet_templates(name, max_capacity),
            items:pallet_items(count)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('pallet_templates')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('pallet_items')
          .select(`
            *,
            bottle:bottles(barcode_number, size, type, customer_name),
            pallet:pallets(name)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
      ]);

      if (palletsResult.error) throw palletsResult.error;
      if (templatesResult.error) throw templatesResult.error;
      if (itemsResult.error) throw itemsResult.error;

      setPallets(palletsResult.data || []);
      setPalletTemplates(templatesResult.data || []);
      setPalletItems(itemsResult.data || []);

    } catch (error) {
      logger.error('Error fetching pallet data:', error);
      setError('Failed to load pallet management data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePallet = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('pallets')
        .insert({
          organization_id: profile.organization_id,
          name: palletForm.name,
          description: palletForm.description,
          template_id: palletForm.template_id || null,
          location: palletForm.location,
          max_capacity: palletForm.max_capacity,
          current_items: palletForm.current_items,
          status: palletForm.status,
          priority: palletForm.priority
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Pallet created successfully');
      setCreatePalletDialog(false);
      resetPalletForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating pallet:', error);
      setError('Failed to create pallet');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('pallet_templates')
        .insert({
          organization_id: profile.organization_id,
          name: templateForm.name,
          description: templateForm.description,
          max_capacity: templateForm.max_capacity,
          item_types: templateForm.item_types,
          safety_requirements: templateForm.safety_requirements,
          handling_instructions: templateForm.handling_instructions
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Template created successfully');
      setCreateTemplateDialog(false);
      resetTemplateForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating template:', error);
      setError('Failed to create template');
    }
  };

  const handleBulkScan = async () => {
    try {
      setError('');
      
      // Process scanned items and add to pallet
      for (const item of scannedItems) {
        const { error } = await supabase
          .from('pallet_items')
          .insert({
            organization_id: profile.organization_id,
            pallet_id: selectedPallet.id,
            bottle_id: item.bottle_id,
            quantity: 1,
            scanned_at: new Date().toISOString(),
            scanned_by: profile.id
          });

        if (error) throw error;
      }

      // Update pallet current items count
      const { error: updateError } = await supabase
        .from('pallets')
        .update({ 
          current_items: selectedPallet.current_items + scannedItems.length 
        })
        .eq('id', selectedPallet.id);

      if (updateError) throw updateError;

      setSuccess(`Successfully added ${scannedItems.length} items to pallet`);
      setBulkScanDialog(false);
      setScannedItems([]);
      fetchData();

    } catch (error) {
      logger.error('Error in bulk scan:', error);
      setError('Failed to process bulk scan');
    }
  };

  const resetPalletForm = () => {
    setPalletForm({
      name: '',
      description: '',
      template_id: '',
      location: '',
      max_capacity: 50,
      current_items: 0,
      status: 'active',
      priority: 'medium'
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      max_capacity: 50,
      item_types: [],
      safety_requirements: [],
      handling_instructions: []
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'full': return 'warning';
      case 'in_transit': return 'primary';
      case 'maintenance': return 'error';
      case 'retired': return 'default';
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

  const getCapacityPercentage = (current, max) => {
    return Math.round((current / max) * 100);
  };

  const getCapacityColor = (percentage) => {
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return 'success';
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
            Pallet Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage palletization and bulk scanning operations
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateTemplateDialog(true)}
            sx={{ mr: 2 }}
          >
            New Template
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreatePalletDialog(true)}
          >
            New Pallet
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
                <PackageIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{pallets.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Pallets
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
                <InventoryIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {pallets.filter(p => p.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Pallets
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
                <StorageIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {pallets.reduce((sum, p) => sum + (p.current_items || 0), 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Items
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
                <AssignmentIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{palletTemplates.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Templates
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
          <Tab label="Active Pallets" />
          <Tab label="Pallet Templates" />
          <Tab label="Pallet Items" />
          <Tab label="Bulk Operations" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Active Pallets
            </Typography>
            <Grid container spacing={3}>
              {pallets.map((pallet) => {
                const capacityPercentage = getCapacityPercentage(pallet.current_items || 0, pallet.max_capacity);
                return (
                  <Grid item xs={12} md={6} lg={4} key={pallet.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6">{pallet.name}</Typography>
                          <Chip 
                            label={pallet.status} 
                            size="small" 
                            color={getStatusColor(pallet.status)}
                          />
                        </Box>
                        
                        <Box mb={2}>
                          <Typography variant="body2" color="text.secondary">
                            {pallet.description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Location: {pallet.location || 'Not specified'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Template: {pallet.template?.name || 'None'}
                          </Typography>
                        </Box>
                        
                        <Box mb={2}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2">Capacity</Typography>
                            <Typography variant="body2">
                              {pallet.current_items || 0} / {pallet.max_capacity}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center">
                            <Box 
                              sx={{ 
                                width: '100%', 
                                height: 8, 
                                backgroundColor: 'grey.300', 
                                borderRadius: 1,
                                mr: 1
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${capacityPercentage}%`,
                                  height: '100%',
                                  backgroundColor: getCapacityColor(capacityPercentage) === 'error' ? 'error.main' : 
                                                   getCapacityColor(capacityPercentage) === 'warning' ? 'warning.main' : 'success.main',
                                  borderRadius: 1
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {capacityPercentage}%
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Chip 
                            label={pallet.priority} 
                            size="small" 
                            color={getPriorityColor(pallet.priority)}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(pallet.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button size="small" startIcon={<ViewIcon />}>
                          View
                        </Button>
                        <Button size="small" startIcon={<ScannerIcon />}>
                          Scan
                        </Button>
                        <Button size="small" startIcon={<EditIcon />}>
                          Edit
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Pallet Templates
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Template Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Max Capacity</TableCell>
                    <TableCell>Item Types</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {palletTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{template.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {template.max_capacity}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {template.item_types?.map((type, index) => (
                            <Chip key={index} label={type} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small">
                              <DeleteIcon />
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

      {activeTab === 2 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Pallet Items
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Barcode</TableCell>
                    <TableCell>Pallet</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Scanned At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {palletItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {item.bottle?.barcode_number || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.pallet?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.bottle?.size || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.bottle?.type || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.bottle?.customer_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.scanned_at ? new Date(item.scanned_at).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Remove from Pallet">
                            <IconButton size="small">
                              <DeleteIcon />
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

      {activeTab === 3 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Bulk Operations
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <ScannerIcon color="primary" sx={{ mr: 2 }} />
                      <Typography variant="h6">Bulk Scanning</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Scan multiple items and add them to a pallet in one operation.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<ScannerIcon />}
                      onClick={() => setBulkScanDialog(true)}
                    >
                      Start Bulk Scan
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <UploadIcon color="primary" sx={{ mr: 2 }} />
                      <Typography variant="h6">Import Items</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Import items from CSV or Excel files for bulk palletization.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<UploadIcon />}
                    >
                      Import Items
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <DownloadIcon color="primary" sx={{ mr: 2 }} />
                      <Typography variant="h6">Export Data</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Export pallet and item data for reporting and analysis.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                    >
                      Export Data
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <SettingsIcon color="primary" sx={{ mr: 2 }} />
                      <Typography variant="h6">Pallet Settings</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Configure pallet templates, capacity limits, and safety requirements.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<SettingsIcon />}
                    >
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* Create Pallet Dialog */}
      <Dialog 
        open={createPalletDialog} 
        onClose={() => setCreatePalletDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Pallet</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pallet Name"
                  value={palletForm.name}
                  onChange={(e) => setPalletForm({ ...palletForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={palletForm.description}
                  onChange={(e) => setPalletForm({ ...palletForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={palletForm.template_id}
                    onChange={(e) => setPalletForm({ ...palletForm, template_id: e.target.value })}
                  >
                    {palletTemplates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={palletForm.location}
                  onChange={(e) => setPalletForm({ ...palletForm, location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Capacity"
                  type="number"
                  value={palletForm.max_capacity}
                  onChange={(e) => setPalletForm({ ...palletForm, max_capacity: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={palletForm.priority}
                    onChange={(e) => setPalletForm({ ...palletForm, priority: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePalletDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePallet} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog 
        open={createTemplateDialog} 
        onClose={() => setCreateTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Pallet Template</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Template Name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Max Capacity"
                  type="number"
                  value={templateForm.max_capacity}
                  onChange={(e) => setTemplateForm({ ...templateForm, max_capacity: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={templateForm.item_types}
                  onChange={(event, newValue) => {
                    setTemplateForm({ ...templateForm, item_types: newValue });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Item Types"
                      placeholder="Add item types..."
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTemplateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Scan Dialog */}
      <Dialog 
        open={bulkScanDialog} 
        onClose={() => setBulkScanDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bulk Scan Items</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Pallet</InputLabel>
                  <Select
                    value={selectedPallet?.id || ''}
                    onChange={(e) => {
                      const pallet = pallets.find(p => p.id === e.target.value);
                      setSelectedPallet(pallet);
                    }}
                  >
                    {pallets.map((pallet) => (
                      <MenuItem key={pallet.id} value={pallet.id}>
                        {pallet.name} ({pallet.current_items || 0}/{pallet.max_capacity})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Box textAlign="center" py={4}>
                  <QrCodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Scan Mode Ready
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Point your scanner at barcodes to add items to the pallet
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<ScannerIcon />}
                    onClick={() => setScanningMode(!scanningMode)}
                  >
                    {scanningMode ? 'Stop Scanning' : 'Start Scanning'}
                  </Button>
                </Box>
              </Grid>
              
              {scannedItems.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Scanned Items ({scannedItems.length})
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Barcode</TableCell>
                          <TableCell>Item</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {scannedItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.barcode}</TableCell>
                            <TableCell>{item.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <IconButton 
                                size="small"
                                onClick={() => {
                                  setScannedItems(prev => prev.filter((_, i) => i !== index));
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkScanDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkScan} 
            variant="contained"
            disabled={!selectedPallet || scannedItems.length === 0}
          >
            Add {scannedItems.length} Items
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
