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
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  FormatSize as FormatSizeIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// Predefined format templates
const FORMAT_TEMPLATES = {
  barcode: {
    numeric_9: {
      name: '9-Digit Numeric',
      pattern: '^[0-9]{9}$',
      description: 'Exactly 9 digits (0-9)',
      examples: ['123456789', '987654321']
    },
    alphanumeric_6_12: {
      name: '6-12 Alphanumeric',
      pattern: '^[A-Z0-9]{6,12}$',
      description: '6-12 uppercase letters and numbers',
      examples: ['ABC123', 'XYZ789012']
    },
    custom_prefix: {
      name: 'Custom Prefix',
      pattern: '^[A-Z]{2,4}[0-9]{6,8}$',
      description: '2-4 letters followed by 6-8 digits',
      examples: ['CYL123456', 'GAS789012']
    }
  },
  order_number: {
    alphanumeric_6_12: {
      name: '6-12 Alphanumeric',
      pattern: '^[A-Z0-9]{6,12}$',
      description: '6-12 uppercase letters and numbers',
      examples: ['ORD123456', 'SO789012']
    },
    prefix_numeric: {
      name: 'Prefix + Numeric',
      pattern: '^[A-Z]{2,4}[0-9]{4,8}$',
      description: '2-4 letters followed by 4-8 digits',
      examples: ['ORD123456', 'SO2024001']
    },
    year_sequence: {
      name: 'Year + Sequence',
      pattern: '^[0-9]{4}[A-Z0-9]{4,8}$',
      description: '4-digit year followed by 4-8 alphanumeric',
      examples: ['2024ORD123', '2024SO456']
    },
    flexible_5_digit: {
      name: 'Flexible 5-Digit',
      pattern: '^[A-Z]?[0-9]{5}[A-Z]?$',
      description: '5 digits, or letter+5 digits, or 5 digits+letter',
      examples: ['12345', 'A12345', '12345A']
    }
  },
  customer_id: {
    alphanumeric_4_10: {
      name: '4-10 Alphanumeric',
      pattern: '^[A-Z0-9]{4,10}$',
      description: '4-10 uppercase letters and numbers',
      examples: ['CUST123', 'CLIENT456']
    },
    prefix_numeric: {
      name: 'Prefix + Numeric',
      pattern: '^[A-Z]{2,4}[0-9]{3,6}$',
      description: '2-4 letters followed by 3-6 digits',
      examples: ['CUST001', 'CLIENT123']
    },
    numeric_only: {
      name: 'Numeric Only',
      pattern: '^[0-9]{4,8}$',
      description: '4-8 digits only',
      examples: ['1234', '12345678']
    }
  }
};

export default function FormatConfigurationManager() {
  const { organization, profile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    barcodeFormat: {
      pattern: '^[0-9]{9}$',
      description: '9-digit numeric barcode',
      examples: ['123456789', '987654321'],
      validation_enabled: true
    },
    orderNumberFormat: {
      pattern: '^[A-Z0-9]{6,12}$',
      description: '6-12 alphanumeric characters',
      examples: ['ORD123456', 'SO789012'],
      prefix: '',
      validation_enabled: true
    },
    customerIdFormat: {
      pattern: '^[A-Z0-9]{4,10}$',
      description: '4-10 alphanumeric characters',
      examples: ['CUST123', 'CLIENT456'],
      prefix: '',
      validation_enabled: true
    }
  });

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState({});

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
        .select('format_configuration')
        .eq('id', organization.id)
        .single();

      if (error) throw error;

      const formatConfig = data?.format_configuration || {};
      
      setConfig({
        barcodeFormat: formatConfig.barcode_format || {
          pattern: '^[0-9]{9}$',
          description: '9-digit numeric barcode',
          examples: ['123456789', '987654321'],
          validation_enabled: true
        },
        orderNumberFormat: formatConfig.order_number_format || {
          pattern: '^[A-Z0-9]{6,12}$',
          description: '6-12 alphanumeric characters',
          examples: ['ORD123456', 'SO789012'],
          prefix: '',
          validation_enabled: true
        },
        customerIdFormat: formatConfig.customer_id_format || {
          pattern: '^[A-Z0-9]{4,10}$',
          description: '4-10 alphanumeric characters',
          examples: ['CUST123', 'CLIENT456'],
          prefix: '',
          validation_enabled: true
        }
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
          format_configuration: {
            barcode_format: config.barcodeFormat,
            order_number_format: config.orderNumberFormat,
            customer_id_format: config.customerIdFormat
          }
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('Format configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (formatType, templateKey) => {
    const template = FORMAT_TEMPLATES[formatType][templateKey];
    if (template) {
      setConfig(prev => ({
        ...prev,
        [`${formatType}Format`]: {
          ...prev[`${formatType}Format`],
          pattern: template.pattern,
          description: template.description,
          examples: template.examples
        }
      }));
      toast.success(`Applied ${template.name} template`);
    }
  };

  const validatePattern = (pattern) => {
    try {
      new RegExp(pattern);
      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  };

  const testPattern = (pattern, testValue) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(testValue);
    } catch (error) {
      return false;
    }
  };

  const generatePreviewContent = () => {
    const preview = {
      barcode: {
        valid: config.barcodeFormat.examples.filter(ex => testPattern(config.barcodeFormat.pattern, ex)),
        invalid: ['INVALID123', '12345', 'ABC123DEF'].filter(ex => !testPattern(config.barcodeFormat.pattern, ex))
      },
      orderNumber: {
        valid: config.orderNumberFormat.examples.filter(ex => testPattern(config.orderNumberFormat.pattern, ex)),
        invalid: ['INVALID', '123', 'ABC123DEF456'].filter(ex => !testPattern(config.orderNumberFormat.pattern, ex))
      },
      customerId: {
        valid: config.customerIdFormat.examples.filter(ex => testPattern(config.customerIdFormat.pattern, ex)),
        invalid: ['INVALID', '123', 'ABC123DEF456'].filter(ex => !testPattern(config.customerIdFormat.pattern, ex))
      }
    };
    return preview;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
        Format Configuration Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure validation patterns for barcodes, order numbers, and customer IDs. These settings will be applied to the mobile app.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
                <Tab label="Barcode Format" />
                <Tab label="Order Number Format" />
                <Tab label="Customer ID Format" />
              </Tabs>

              {/* Barcode Format Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Barcode Format Configuration
                  </Typography>
                  
                  <Stack spacing={2}>
                    <FormControl fullWidth>
                      <InputLabel>Template</InputLabel>
                      <Select
                        value=""
                        onChange={(e) => applyTemplate('barcode', e.target.value)}
                        label="Template"
                      >
                        {Object.entries(FORMAT_TEMPLATES.barcode).map(([key, template]) => (
                          <MenuItem key={key} value={key}>
                            {template.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Pattern (Regex)"
                      value={config.barcodeFormat.pattern}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        barcodeFormat: { ...prev.barcodeFormat, pattern: e.target.value }
                      }))}
                      helperText={validatePattern(config.barcodeFormat.pattern).error || 'Regular expression pattern for validation'}
                      error={!!validatePattern(config.barcodeFormat.pattern).error}
                    />

                    <TextField
                      fullWidth
                      label="Description"
                      value={config.barcodeFormat.description}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        barcodeFormat: { ...prev.barcodeFormat, description: e.target.value }
                      }))}
                    />

                    <TextField
                      fullWidth
                      label="Examples (comma-separated)"
                      value={config.barcodeFormat.examples.join(', ')}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        barcodeFormat: { ...prev.barcodeFormat, examples: e.target.value.split(',').map(s => s.trim()) }
                      }))}
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.barcodeFormat.validation_enabled}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            barcodeFormat: { ...prev.barcodeFormat, validation_enabled: e.target.checked }
                          }))}
                        />
                      }
                      label="Enable validation"
                    />
                  </Stack>
                </Box>
              )}

              {/* Order Number Format Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Order Number Format Configuration
                  </Typography>
                  
                  <Stack spacing={2}>
                    <FormControl fullWidth>
                      <InputLabel>Template</InputLabel>
                      <Select
                        value=""
                        onChange={(e) => applyTemplate('order_number', e.target.value)}
                        label="Template"
                      >
                        {Object.entries(FORMAT_TEMPLATES.order_number).map(([key, template]) => (
                          <MenuItem key={key} value={key}>
                            {template.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Pattern (Regex)"
                      value={config.orderNumberFormat.pattern}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        orderNumberFormat: { ...prev.orderNumberFormat, pattern: e.target.value }
                      }))}
                      helperText={validatePattern(config.orderNumberFormat.pattern).error || 'Regular expression pattern for validation'}
                      error={!!validatePattern(config.orderNumberFormat.pattern).error}
                    />

                    <TextField
                      fullWidth
                      label="Description"
                      value={config.orderNumberFormat.description}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        orderNumberFormat: { ...prev.orderNumberFormat, description: e.target.value }
                      }))}
                    />

                    <TextField
                      fullWidth
                      label="Prefix (optional)"
                      value={config.orderNumberFormat.prefix}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        orderNumberFormat: { ...prev.orderNumberFormat, prefix: e.target.value }
                      }))}
                    />

                    <TextField
                      fullWidth
                      label="Examples (comma-separated)"
                      value={config.orderNumberFormat.examples.join(', ')}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        orderNumberFormat: { ...prev.orderNumberFormat, examples: e.target.value.split(',').map(s => s.trim()) }
                      }))}
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.orderNumberFormat.validation_enabled}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            orderNumberFormat: { ...prev.orderNumberFormat, validation_enabled: e.target.checked }
                          }))}
                        />
                      }
                      label="Enable validation"
                    />
                  </Stack>
                </Box>
              )}

              {/* Customer ID Format Tab */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Customer ID Format Configuration
                  </Typography>
                  
                  <Stack spacing={2}>
                    <FormControl fullWidth>
                      <InputLabel>Template</InputLabel>
                      <Select
                        value=""
                        onChange={(e) => applyTemplate('customer_id', e.target.value)}
                        label="Template"
                      >
                        {Object.entries(FORMAT_TEMPLATES.customer_id).map(([key, template]) => (
                          <MenuItem key={key} value={key}>
                            {template.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Pattern (Regex)"
                      value={config.customerIdFormat.pattern}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        customerIdFormat: { ...prev.customerIdFormat, pattern: e.target.value }
                      }))}
                      helperText={validatePattern(config.customerIdFormat.pattern).error || 'Regular expression pattern for validation'}
                      error={!!validatePattern(config.customerIdFormat.pattern).error}
                    />

                    <TextField
                      fullWidth
                      label="Description"
                      value={config.customerIdFormat.description}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        customerIdFormat: { ...prev.customerIdFormat, description: e.target.value }
                      }))}
                    />

                    <TextField
                      fullWidth
                      label="Prefix (optional)"
                      value={config.customerIdFormat.prefix}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        customerIdFormat: { ...prev.customerIdFormat, prefix: e.target.value }
                      }))}
                    />

                    <TextField
                      fullWidth
                      label="Examples (comma-separated)"
                      value={config.customerIdFormat.examples.join(', ')}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        customerIdFormat: { ...prev.customerIdFormat, examples: e.target.value.split(',').map(s => s.trim()) }
                      }))}
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.customerIdFormat.validation_enabled}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            customerIdFormat: { ...prev.customerIdFormat, validation_enabled: e.target.checked }
                          }))}
                        />
                      }
                      label="Enable validation"
                    />
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={saveConfiguration}
                  disabled={saving}
                  fullWidth
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={() => {
                    setPreviewData(generatePreviewContent());
                    setPreviewDialogOpen(true);
                  }}
                  fullWidth
                >
                  Preview Validation
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadConfiguration}
                  fullWidth
                >
                  Reload Configuration
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Format Validation Preview</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Barcode Format
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Pattern: {config.barcodeFormat.pattern}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Description: {config.barcodeFormat.description}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Valid Examples:
              </Typography>
              {previewData.barcode?.valid?.map((ex, i) => (
                <Chip key={i} label={ex} color="success" size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
              
              <Typography variant="subtitle2" gutterBottom>
                Invalid Examples:
              </Typography>
              {previewData.barcode?.invalid?.map((ex, i) => (
                <Chip key={i} label={ex} color="error" size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Order Number Format
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Pattern: {config.orderNumberFormat.pattern}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Description: {config.orderNumberFormat.description}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Valid Examples:
              </Typography>
              {previewData.orderNumber?.valid?.map((ex, i) => (
                <Chip key={i} label={ex} color="success" size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
              
              <Typography variant="subtitle2" gutterBottom>
                Invalid Examples:
              </Typography>
              {previewData.orderNumber?.invalid?.map((ex, i) => (
                <Chip key={i} label={ex} color="error" size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Customer ID Format
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Pattern: {config.customerIdFormat.pattern}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Description: {config.customerIdFormat.description}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Valid Examples:
              </Typography>
              {previewData.customerId?.valid?.map((ex, i) => (
                <Chip key={i} label={ex} color="success" size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
              
              <Typography variant="subtitle2" gutterBottom>
                Invalid Examples:
              </Typography>
              {previewData.customerId?.invalid?.map((ex, i) => (
                <Chip key={i} label={ex} color="error" size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 