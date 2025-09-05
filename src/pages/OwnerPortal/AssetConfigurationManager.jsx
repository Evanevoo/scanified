import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Tab,
  Tabs,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  ColorLens as ColorIcon,
  Settings as SettingsIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// Predefined asset type templates
const ASSET_TEMPLATES = {
  cylinder: {
    assetType: 'cylinder',
    assetTypePlural: 'cylinders',
    assetDisplayName: 'Gas Cylinder',
    assetDisplayNamePlural: 'Gas Cylinders',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    appName: 'CylinderTrack Pro',
    customTerminology: {
      scan: 'scan',
      track: 'track',
      inventory: 'inventory',
      manage: 'manage',
      delivery: 'delivery'
    },
    featureToggles: {
      maintenance_alerts: true,
      pressure_tracking: true,
      gas_type_tracking: true,
      delivery_tracking: true
    }
  },
  pallet: {
    assetType: 'pallet',
    assetTypePlural: 'pallets',
    assetDisplayName: 'Pallet',
    assetDisplayNamePlural: 'Pallets',
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    appName: 'PalletTracker',
    customTerminology: {
      scan: 'scan',
      track: 'track',
      inventory: 'warehouse',
      manage: 'coordinate',
      delivery: 'shipment'
    },
    featureToggles: {
      maintenance_alerts: false,
      pressure_tracking: false,
      gas_type_tracking: false,
      delivery_tracking: true,
      weight_tracking: true,
      stacking_limits: true
    }
  },
  equipment: {
    assetType: 'equipment',
    assetTypePlural: 'equipment',
    assetDisplayName: 'Equipment',
    assetDisplayNamePlural: 'Equipment',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    appName: 'EquipManager',
    customTerminology: {
      scan: 'check-in',
      track: 'monitor',
      inventory: 'storage',
      manage: 'maintain',
      delivery: 'deployment'
    },
    featureToggles: {
      maintenance_alerts: true,
      pressure_tracking: false,
      gas_type_tracking: false,
      delivery_tracking: true,
      condition_tracking: true,
      calibration_tracking: true
    }
  },
  medical: {
    assetType: 'medical',
    assetTypePlural: 'medical_devices',
    assetDisplayName: 'Medical Device',
    assetDisplayNamePlural: 'Medical Devices',
    primaryColor: '#ef4444',
    secondaryColor: '#dc2626',
    appName: 'MedTrack',
    customTerminology: {
      scan: 'inspect',
      track: 'monitor',
      inventory: 'storage',
      manage: 'maintain',
      delivery: 'distribution'
    },
    featureToggles: {
      maintenance_alerts: true,
      pressure_tracking: false,
      gas_type_tracking: false,
      delivery_tracking: true,
      sterilization_tracking: true,
      expiry_tracking: true,
      compliance_tracking: true
    }
  },
  tool: {
    assetType: 'tool',
    assetTypePlural: 'tools',
    assetDisplayName: 'Tool',
    assetDisplayNamePlural: 'Tools',
    primaryColor: '#8b5cf6',
    secondaryColor: '#7c3aed',
    appName: 'ToolManager',
    customTerminology: {
      scan: 'check-out',
      track: 'locate',
      inventory: 'toolroom',
      manage: 'organize',
      delivery: 'dispatch'
    },
    featureToggles: {
      maintenance_alerts: true,
      pressure_tracking: false,
      gas_type_tracking: false,
      delivery_tracking: true,
      checkout_tracking: true,
      condition_tracking: true
    }
  }
};

export default function AssetConfigurationManager() {
  const { organization, profile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    assetType: '',
    assetTypePlural: '',
    assetDisplayName: '',
    assetDisplayNamePlural: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    appName: '',
    customTerminology: {},
    featureToggles: {}
  });

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [customTermKey, setCustomTermKey] = useState('');
  const [customTermValue, setCustomTermValue] = useState('');

  useEffect(() => {
    if (organization) {
      loadConfiguration();
    }
  }, [organization]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          asset_type,
          asset_type_plural,
          asset_display_name,
          asset_display_name_plural,
          primary_color,
          secondary_color,
          app_name,
          custom_terminology,
          feature_toggles
        `)
        .eq('id', organization.id)
        .single();

      if (error) throw error;

      setConfig({
        assetType: data.asset_type || 'cylinder',
        assetTypePlural: data.asset_type_plural || 'cylinders',
        assetDisplayName: data.asset_display_name || 'Gas Cylinder',
        assetDisplayNamePlural: data.asset_display_name_plural || 'Gas Cylinders',
        primaryColor: data.primary_color || '#2563eb',
        secondaryColor: data.secondary_color || '#1e40af',
        appName: data.app_name || 'Scanified',
        customTerminology: data.custom_terminology || {},
        featureToggles: data.feature_toggles || {}
      });
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('organizations')
        .update({
          asset_type: config.assetType,
          asset_type_plural: config.assetTypePlural,
          asset_display_name: config.assetDisplayName,
          asset_display_name_plural: config.assetDisplayNamePlural,
          primary_color: config.primaryColor,
          secondary_color: config.secondaryColor,
          app_name: config.appName,
          custom_terminology: config.customTerminology,
          feature_toggles: config.featureToggles
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('Configuration saved successfully!');
      
      // Force page reload to apply changes throughout the app
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (templateKey) => {
    const template = ASSET_TEMPLATES[templateKey];
    setConfig({
      ...config,
      assetType: template.assetType,
      assetTypePlural: template.assetTypePlural,
      assetDisplayName: template.assetDisplayName,
      assetDisplayNamePlural: template.assetDisplayNamePlural,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      appName: template.appName,
      customTerminology: template.customTerminology,
      featureToggles: template.featureToggles
    });
    setTemplateDialogOpen(false);
    toast.success(`Applied ${template.assetDisplayName} template`);
  };

  const addCustomTerminology = () => {
    if (customTermKey && customTermValue) {
      setConfig({
        ...config,
        customTerminology: {
          ...config.customTerminology,
          [customTermKey]: customTermValue
        }
      });
      setCustomTermKey('');
      setCustomTermValue('');
    }
  };

  const removeCustomTerminology = (key) => {
    const newTerminology = { ...config.customTerminology };
    delete newTerminology[key];
    setConfig({
      ...config,
      customTerminology: newTerminology
    });
  };

  const toggleFeature = (featureKey) => {
    setConfig({
      ...config,
      featureToggles: {
        ...config.featureToggles,
        [featureKey]: !config.featureToggles[featureKey]
      }
    });
  };

  const generatePreviewContent = () => ({
    dashboardTitle: `${config.assetDisplayName} Management Dashboard`,
    searchPlaceholder: `Search ${config.assetDisplayNamePlural}...`,
    addButtonText: `Add New ${config.assetDisplayName}`,
    totalLabel: `Total ${config.assetDisplayNamePlural}`,
    quickActions: [
      `${config.customTerminology.scan || 'Scan'} ${config.assetDisplayNamePlural}`,
      `${config.customTerminology.manage || 'Manage'} ${config.customTerminology.inventory || 'Inventory'}`,
      `${config.customTerminology.track || 'Track'} ${config.customTerminology.delivery || 'Delivery'}`,
      `View ${config.assetDisplayName} Reports`
    ]
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const previewContent = generatePreviewContent();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          <SettingsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Asset Configuration Manager
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadConfiguration}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewDialogOpen(true)}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveConfiguration}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Stack>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Configure your organization's asset type, terminology, and branding. Changes will be applied across 
          both the web platform and mobile app after saving.
        </Typography>
      </Alert>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Basic Configuration" />
            <Tab label="Custom Terminology" />
            <Tab label="Feature Toggles" />
            <Tab label="Barcode & Number Formats" />
            <Tab label="Branding & Colors" />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {/* Tab 0: Basic Configuration */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setTemplateDialogOpen(true)}
                  sx={{ mb: 3 }}
                >
                  Apply Template
                </Button>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Asset Type (singular)"
                  value={config.assetType}
                  onChange={(e) => setConfig({ ...config, assetType: e.target.value })}
                  helperText="e.g., cylinder, pallet, equipment"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Asset Type (plural)"
                  value={config.assetTypePlural}
                  onChange={(e) => setConfig({ ...config, assetTypePlural: e.target.value })}
                  helperText="e.g., cylinders, pallets, equipment"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Display Name (singular)"
                  value={config.assetDisplayName}
                  onChange={(e) => setConfig({ ...config, assetDisplayName: e.target.value })}
                  helperText="e.g., Gas Cylinder, Medical Device"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Display Name (plural)"
                  value={config.assetDisplayNamePlural}
                  onChange={(e) => setConfig({ ...config, assetDisplayNamePlural: e.target.value })}
                  helperText="e.g., Gas Cylinders, Medical Devices"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="App Name"
                  value={config.appName}
                  onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                  helperText="Name shown in mobile app and website headers"
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Custom Terminology */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Custom Terminology</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Define custom terms that will be used throughout the application.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    label="Term Key"
                    value={customTermKey}
                    onChange={(e) => setCustomTermKey(e.target.value)}
                    placeholder="e.g., scan, delivery, inventory"
                  />
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    label="Term Value"
                    value={customTermValue}
                    onChange={(e) => setCustomTermValue(e.target.value)}
                    placeholder="e.g., inspect, shipment, storage"
                  />
                </Grid>
                <Grid item xs={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ height: '56px' }}
                    onClick={addCustomTerminology}
                    disabled={!customTermKey || !customTermValue}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Current Terminology</Typography>
                {Object.keys(config.customTerminology).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No custom terminology defined.
                  </Typography>
                ) : (
                  <Grid container spacing={1}>
                    {Object.entries(config.customTerminology).map(([key, value]) => (
                      <Grid item key={key}>
                        <Chip
                          label={`${key}: "${value}"`}
                          onDelete={() => removeCustomTerminology(key)}
                          deleteIcon={<DeleteIcon />}
                          variant="outlined"
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Paper>
            </Box>
          )}

          {/* Tab 2: Feature Toggles */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Feature Toggles</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enable or disable features based on your industry needs.
              </Typography>

              <Grid container spacing={2}>
                {[
                  { key: 'maintenance_alerts', label: 'Maintenance Alerts', description: 'Track maintenance schedules and alerts' },
                  { key: 'pressure_tracking', label: 'Pressure Tracking', description: 'Monitor pressure levels (gas cylinders)' },
                  { key: 'gas_type_tracking', label: 'Gas Type Tracking', description: 'Track different gas types' },
                  { key: 'delivery_tracking', label: 'Delivery Tracking', description: 'Track deliveries and shipments' },
                  { key: 'condition_tracking', label: 'Condition Tracking', description: 'Monitor asset condition' },
                  { key: 'calibration_tracking', label: 'Calibration Tracking', description: 'Track calibration schedules' },
                  { key: 'sterilization_tracking', label: 'Sterilization Tracking', description: 'Track sterilization cycles' },
                  { key: 'expiry_tracking', label: 'Expiry Tracking', description: 'Monitor expiration dates' },
                  { key: 'compliance_tracking', label: 'Compliance Tracking', description: 'Regulatory compliance monitoring' },
                  { key: 'checkout_tracking', label: 'Check-out Tracking', description: 'Track asset check-in/out' },
                  { key: 'weight_tracking', label: 'Weight Tracking', description: 'Monitor asset weight' },
                  { key: 'stacking_limits', label: 'Stacking Limits', description: 'Enforce stacking restrictions' }
                ].map((feature) => (
                  <Grid item xs={12} sm={6} key={feature.key}>
                    <Paper sx={{ p: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.featureToggles[feature.key] || false}
                            onChange={() => toggleFeature(feature.key)}
                          />
                        }
                        label={feature.label}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Tab 3: Barcode & Number Formats */}
          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Barcode & Number Formats</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Barcode and number format configuration has been moved to dedicated pages for better organization.
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Barcode Formats</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure barcode patterns, validation rules, and examples.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => window.location.href = '/settings?tab=barcodes'}
                    fullWidth
                  >
                    Go to Barcode Settings
                  </Button>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Advanced Format Configuration</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Advanced format templates and validation rules for power users.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<CodeIcon />}
                    onClick={() => window.location.href = '/format-configuration'}
                    fullWidth
                  >
                    Go to Format Configuration Manager
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Tab 4: Branding & Colors */}
          {activeTab === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Branding & Colors</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Customize colors and branding for your organization.
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Primary Color"
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <Box 
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          bgcolor: config.primaryColor, 
                          borderRadius: 1, 
                          mr: 1,
                          border: '1px solid #ccc'
                        }} 
                      />
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Secondary Color"
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <Box 
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          bgcolor: config.secondaryColor, 
                          borderRadius: 1, 
                          mr: 1,
                          border: '1px solid #ccc'
                        }} 
                      />
                    )
                  }}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Choose Asset Type Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {Object.entries(ASSET_TEMPLATES).map(([key, template]) => (
              <Grid item xs={12} sm={6} key={key}>
                <Card 
                  sx={{ 
                    cursor: 'pointer', 
                    border: '2px solid transparent',
                    '&:hover': { 
                      boxShadow: 6,
                      borderColor: template.primaryColor 
                    }
                  }}
                  onClick={() => applyTemplate(key)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box 
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          bgcolor: template.primaryColor, 
                          borderRadius: 1, 
                          mr: 2 
                        }} 
                      />
                      <Typography variant="h6">{template.appName}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {template.assetDisplayNamePlural} • {Object.keys(template.featureToggles).length} features
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Configuration Preview</DialogTitle>
        <DialogContent>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ color: config.primaryColor, fontWeight: 'bold' }}>
                  {config.appName}
                </Typography>
                <Chip 
                  label={`${config.assetType.toUpperCase()} INDUSTRY`} 
                  sx={{ bgcolor: config.primaryColor, color: 'white' }}
                />
              </Box>

              <Typography variant="h6" gutterBottom>
                {previewContent.dashboardTitle}
              </Typography>

              <TextField
                fullWidth
                placeholder={previewContent.searchPlaceholder}
                sx={{ mb: 2 }}
                size="small"
              />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {previewContent.quickActions.map((action, index) => (
                  <Chip key={index} label={action} sx={{ bgcolor: config.primaryColor, color: 'white' }} />
                ))}
              </Box>

              <Typography variant="body2" color="text.secondary">
                This is how your configuration will appear across the platform.
              </Typography>
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 