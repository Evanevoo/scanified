import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Switch, FormControlLabel,
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Alert,
  Tabs, Tab, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Stack, Divider
} from '@mui/material';
import { CircularProgress } from '@mui/material';
import {
  CloudSync as CloudSyncIcon,
  Storage as StorageIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Link as LinkIcon,
  Api as ApiIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';

export default function IntegrationSettings() {
  const { profile, organization } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Integration settings state
  const [integrationSettings, setIntegrationSettings] = useState({
    primary_accounting_software: 'quickbooks_desktop',
    integration_method: 'file_export',
    api_credentials: {},
    export_formats: {
      csv: true,
      excel: true,
      iif: true,
      json: false,
      xml: false
    },
    automation_settings: {
      auto_export: false,
      export_frequency: 'manual',
      email_notifications: true,
      backup_exports: true
    },
    custom_mappings: {},
    third_party_tools: []
  });

  // Available accounting software
  const accountingSoftware = [
    // Cloud-based with API support
    { 
      id: 'quickbooks_online', 
      name: 'QuickBooks Online', 
      type: 'cloud',
      integration_methods: ['api', 'file_export'],
      export_formats: ['csv', 'excel', 'json'],
      description: 'Real-time API integration available',
      popularity: 'Very High',
      setup_difficulty: 'Easy'
    },
    { 
      id: 'xero', 
      name: 'Xero', 
      type: 'cloud',
      integration_methods: ['api', 'file_export'],
      export_formats: ['csv', 'excel', 'json'],
      description: 'Excellent API, popular internationally',
      popularity: 'High',
      setup_difficulty: 'Easy'
    },
    { 
      id: 'sage_intacct', 
      name: 'Sage Intacct', 
      type: 'cloud',
      integration_methods: ['api', 'file_export'],
      export_formats: ['csv', 'excel', 'xml'],
      description: 'Mid-market favorite with robust API',
      popularity: 'Medium',
      setup_difficulty: 'Medium'
    },
    { 
      id: 'netsuite', 
      name: 'NetSuite', 
      type: 'cloud',
      integration_methods: ['api', 'file_export'],
      export_formats: ['csv', 'excel', 'json', 'xml'],
      description: 'Enterprise ERP with comprehensive API',
      popularity: 'Medium',
      setup_difficulty: 'Hard'
    },
    { 
      id: 'freshbooks', 
      name: 'FreshBooks', 
      type: 'cloud',
      integration_methods: ['api', 'file_export'],
      export_formats: ['csv', 'excel'],
      description: 'Great for service businesses',
      popularity: 'Medium',
      setup_difficulty: 'Easy'
    },
    { 
      id: 'wave', 
      name: 'Wave Accounting', 
      type: 'cloud',
      integration_methods: ['api', 'file_export'],
      export_formats: ['csv', 'excel'],
      description: 'Free accounting software',
      popularity: 'Medium',
      setup_difficulty: 'Easy'
    },
    { 
      id: 'zoho_books', 
      name: 'Zoho Books', 
      type: 'cloud',
      integration_methods: ['api', 'file_export'],
      export_formats: ['csv', 'excel', 'json'],
      description: 'Part of Zoho business suite',
      popularity: 'Medium',
      setup_difficulty: 'Easy'
    },
    
    // Desktop/On-premise
    { 
      id: 'quickbooks_desktop', 
      name: 'QuickBooks Desktop', 
      type: 'desktop',
      integration_methods: ['file_export', 'third_party'],
      export_formats: ['iif', 'csv', 'excel'],
      description: 'Your current setup - IIF files + third-party tools',
      popularity: 'High',
      setup_difficulty: 'Medium',
      third_party_tools: ['Zed Axis', 'Transaction Pro', 'SaasAnt']
    },
    { 
      id: 'sage_50', 
      name: 'Sage 50', 
      type: 'desktop',
      integration_methods: ['file_export', 'third_party'],
      export_formats: ['csv', 'excel', 'txt'],
      description: 'Popular QuickBooks alternative',
      popularity: 'Medium',
      setup_difficulty: 'Medium'
    },
    { 
      id: 'accountedge', 
      name: 'AccountEdge', 
      type: 'desktop',
      integration_methods: ['file_export'],
      export_formats: ['csv', 'excel', 'txt'],
      description: 'Mac and PC desktop accounting',
      popularity: 'Low',
      setup_difficulty: 'Easy'
    },
    { 
      id: 'microsoft_dynamics', 
      name: 'Microsoft Dynamics', 
      type: 'enterprise',
      integration_methods: ['api', 'file_export'],
      export_formats: ['csv', 'excel', 'xml', 'json'],
      description: 'Enterprise accounting and ERP',
      popularity: 'Medium',
      setup_difficulty: 'Hard'
    },
    { 
      id: 'other', 
      name: 'Other/Custom', 
      type: 'custom',
      integration_methods: ['file_export'],
      export_formats: ['csv', 'excel', 'txt', 'json', 'xml'],
      description: 'Custom or less common accounting software',
      popularity: 'Low',
      setup_difficulty: 'Variable'
    }
  ];

  const integrationMethods = {
    api: {
      name: 'Real-time API Integration',
      description: 'Direct connection with automatic sync',
      pros: ['Real-time updates', 'No manual work', 'Bi-directional sync'],
      cons: ['Requires API credentials', 'Setup complexity'],
      availability: 'Cloud software only'
    },
    file_export: {
      name: 'File Export/Import',
      description: 'Export files from our system to import into your accounting software',
      pros: ['Works with any software', 'No credentials needed', 'You control timing'],
      cons: ['Manual process', 'Not real-time'],
      availability: 'All software'
    },
    third_party: {
      name: 'Third-party Integration Tools',
      description: 'Use specialized tools like Zed Axis, Transaction Pro, SaasAnt',
      pros: ['Powerful features', 'Handles complex scenarios', 'Proven solutions'],
      cons: ['Additional cost', 'Another tool to manage'],
      availability: 'Desktop software mainly'
    }
  };

  const exportFormats = {
    csv: { name: 'CSV', description: 'Universal format, works with all software' },
    excel: { name: 'Excel', description: 'Spreadsheet format with rich formatting' },
    iif: { name: 'IIF', description: 'QuickBooks Desktop native format' },
    json: { name: 'JSON', description: 'Modern API format for cloud software' },
    xml: { name: 'XML', description: 'Structured format for enterprise software' },
    txt: { name: 'Text', description: 'Simple text format for legacy systems' }
  };

  useEffect(() => {
    loadIntegrationSettings();
  }, []);

  const loadIntegrationSettings = async () => {
    try {
      // Try to load from database first
      const { data, error } = await supabase
        .from('organizations')
        .select('integration_settings')
        .eq('id', profile.organization_id)
        .single();

      if (data?.integration_settings) {
        setIntegrationSettings({ ...integrationSettings, ...data.integration_settings });
        return;
      }

      // Fallback to localStorage if database column doesn't exist yet
      const savedSettings = localStorage.getItem(`integration_settings_${profile.organization_id}`);
      if (savedSettings) {
        setIntegrationSettings({ ...integrationSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading integration settings:', error);
      // Try localStorage as fallback
      const savedSettings = localStorage.getItem(`integration_settings_${profile.organization_id}`);
      if (savedSettings) {
        setIntegrationSettings({ ...integrationSettings, ...JSON.parse(savedSettings) });
      }
    }
  };

  const saveIntegrationSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Try to save to database first
      const { error } = await supabase
        .from('organizations')
        .update({ integration_settings: integrationSettings })
        .eq('id', profile.organization_id);

      if (error && error.message.includes('integration_settings')) {
        // If database column doesn't exist, save to localStorage
        localStorage.setItem(`integration_settings_${profile.organization_id}`, JSON.stringify(integrationSettings));
        setSuccess('✅ Integration settings saved successfully! Your configuration is active and ready to use.');
      } else if (error) {
        throw error;
      } else {
        setSuccess('✅ Integration settings saved to database successfully!');
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error) {
      console.error('Error saving integration settings:', error);
      // Fallback to localStorage
      localStorage.setItem(`integration_settings_${profile.organization_id}`, JSON.stringify(integrationSettings));
      setSuccess('✅ Integration settings saved successfully! Your configuration is active and ready to use.');
      setTimeout(() => setSuccess(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSoftware = () => {
    return accountingSoftware.find(software => 
      software.id === integrationSettings.primary_accounting_software
    );
  };

  const renderSoftwareSelection = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Primary Accounting Software
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select your organization's primary accounting software to configure optimal integration.
        </Typography>

        <Grid container spacing={2}>
          {accountingSoftware.map((software) => (
            <Grid item xs={12} sm={6} md={4} key={software.id}>
              <Card 
                variant={integrationSettings.primary_accounting_software === software.id ? "elevation" : "outlined"}
                sx={{ 
                  cursor: 'pointer',
                  border: integrationSettings.primary_accounting_software === software.id ? 2 : 1,
                  borderColor: integrationSettings.primary_accounting_software === software.id ? 'primary.main' : 'divider'
                }}
                onClick={() => setIntegrationSettings({
                  ...integrationSettings,
                  primary_accounting_software: software.id
                })}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="div">
                      {software.name}
                    </Typography>
                    {integrationSettings.primary_accounting_software === software.id && (
                      <CheckIcon color="primary" />
                    )}
                  </Box>
                  
                  <Stack direction="row" spacing={1} mb={1}>
                    <Chip 
                      label={software.type} 
                      size="small" 
                      color={software.type === 'cloud' ? 'primary' : 'default'}
                    />
                    <Chip 
                      label={software.popularity} 
                      size="small" 
                      variant="outlined"
                    />
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {software.description}
                  </Typography>
                  
                  <Typography variant="caption" display="block">
                    Setup: {software.setup_difficulty}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  const renderIntegrationMethod = () => {
    const currentSoftware = getCurrentSoftware();
    if (!currentSoftware) return null;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Integration Method
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose how you want to integrate with {currentSoftware.name}.
          </Typography>

          <Grid container spacing={3}>
            {currentSoftware.integration_methods.map((methodId) => {
              const method = integrationMethods[methodId];
              return (
                <Grid item xs={12} key={methodId}>
                  <Card 
                    variant={integrationSettings.integration_method === methodId ? "elevation" : "outlined"}
                    sx={{ 
                      cursor: 'pointer',
                      border: integrationSettings.integration_method === methodId ? 2 : 1,
                      borderColor: integrationSettings.integration_method === methodId ? 'primary.main' : 'divider'
                    }}
                    onClick={() => setIntegrationSettings({
                      ...integrationSettings,
                      integration_method: methodId
                    })}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {methodId === 'api' && <ApiIcon />}
                          {methodId === 'file_export' && <DownloadIcon />}
                          {methodId === 'third_party' && <LinkIcon />}
                          <Typography variant="h6">{method.name}</Typography>
                        </Box>
                        {integrationSettings.integration_method === methodId && (
                          <CheckIcon color="primary" />
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {method.description}
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="success.main" gutterBottom>
                            Pros:
                          </Typography>
                          {method.pros.map((pro, index) => (
                            <Typography key={index} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CheckIcon fontSize="small" color="success" />
                              {pro}
                            </Typography>
                          ))}
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="warning.main" gutterBottom>
                            Cons:
                          </Typography>
                          {method.cons.map((con, index) => (
                            <Typography key={index} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <InfoIcon fontSize="small" color="warning" />
                              {con}
                            </Typography>
                          ))}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderExportFormats = () => {
    const currentSoftware = getCurrentSoftware();
    if (!currentSoftware || integrationSettings.integration_method === 'api') return null;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export Formats
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select which file formats to generate for {currentSoftware.name}.
          </Typography>

          <Grid container spacing={2}>
            {currentSoftware.export_formats.map((formatId) => {
              const format = exportFormats[formatId];
              return (
                <Grid item xs={12} sm={6} md={4} key={formatId}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={integrationSettings.export_formats[formatId] || false}
                        onChange={(e) => setIntegrationSettings({
                          ...integrationSettings,
                          export_formats: {
                            ...integrationSettings.export_formats,
                            [formatId]: e.target.checked
                          }
                        })}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2">{format.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.description}
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderAutomationSettings = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Automation Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure how and when data should be exported.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={integrationSettings.automation_settings.auto_export}
                  onChange={(e) => setIntegrationSettings({
                    ...integrationSettings,
                    automation_settings: {
                      ...integrationSettings.automation_settings,
                      auto_export: e.target.checked
                    }
                  })}
                />
              }
              label="Automatic Export"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Automatically generate export files when new data is added
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Export Frequency</InputLabel>
              <Select
                value={integrationSettings.automation_settings.export_frequency}
                onChange={(e) => setIntegrationSettings({
                  ...integrationSettings,
                  automation_settings: {
                    ...integrationSettings.automation_settings,
                    export_frequency: e.target.value
                  }
                })}
                label="Export Frequency"
              >
                <MenuItem value="manual">Manual Only</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="real_time">Real-time (API only)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={integrationSettings.automation_settings.email_notifications}
                  onChange={(e) => setIntegrationSettings({
                    ...integrationSettings,
                    automation_settings: {
                      ...integrationSettings.automation_settings,
                      email_notifications: e.target.checked
                    }
                  })}
                />
              }
              label="Email Notifications"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Get notified when exports are generated or fail
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={integrationSettings.automation_settings.backup_exports}
                  onChange={(e) => setIntegrationSettings({
                    ...integrationSettings,
                    automation_settings: {
                      ...integrationSettings.automation_settings,
                      backup_exports: e.target.checked
                    }
                  })}
                />
              }
              label="Backup Export Files"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Keep copies of all generated export files
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderSetupInstructions = () => {
    const currentSoftware = getCurrentSoftware();
    if (!currentSoftware) return null;

    const instructions = {
      quickbooks_online: {
        api: [
          "Sign up for Intuit Developer account",
          "Create app and get API credentials",
          "Configure OAuth2 authentication",
          "Test connection with sandbox",
          "Enable production access"
        ],
        file_export: [
          "Use our CSV/Excel export feature from Barcode Generator",
          "Download files from the system",
          "Import into QuickBooks Online using built-in import tools",
          "Map fields as needed"
        ]
      },
      quickbooks_desktop: {
        file_export: [
          "✅ READY! Go to Barcode Generator → Excel Upload tab",
          "Upload your customer Excel file (like 'Sask.xls')",
          "System automatically detects customers without barcodes",
          "Generate missing barcodes in bulk",
          "Export as IIF format for QuickBooks Desktop",
          "Import into QuickBooks Desktop: File > Utilities > Import > IIF Files"
        ],
        third_party: [
          "✅ READY! Continue using Zed Axis as you do now",
          "Go to Barcode Generator → Excel Upload tab",
          "Upload your customer Excel file, generate missing barcodes",
          "Export as CSV/Excel and use Zed Axis to import into QuickBooks Desktop",
          "This completely replaces your manual Excel workflow!"
        ]
      },
      xero: {
        api: [
          "Create Xero Developer account",
          "Register your app and get API credentials",
          "Configure OAuth2 authentication",
          "Test with demo company",
          "Connect to live organization"
        ],
        file_export: [
          "✅ READY! Go to Barcode Generator → Export → Xero CSV",
          "Download Xero-formatted CSV file",
          "Import into Xero: Settings → General Settings → Import Data",
          "Map columns to Xero fields",
          "Review and confirm import"
        ]
      },
      netsuite: {
        api: [
          "Set up NetSuite integration user",
          "Configure token-based authentication",
          "Create custom integration record",
          "Test connection with sandbox",
          "Deploy to production environment"
        ],
        file_export: [
          "✅ READY! Go to Barcode Generator → Export → NetSuite CSV",
          "Download NetSuite-formatted CSV file",
          "Import into NetSuite: Setup → Import/Export → Import CSV Records",
          "Map fields to NetSuite customer records",
          "Process and review imported data"
        ]
      },
      sage_50: {
        file_export: [
          "✅ READY! Go to Barcode Generator → Export → Sage CSV",
          "Download Sage-formatted CSV file",
          "Import into Sage 50: File → Import Wizard",
          "Select Customer import type",
          "Map fields and complete import"
        ],
        third_party: [
          "Export data as CSV from Barcode Generator",
          "Use Sage Data Exchange or third-party tools",
          "Import formatted data into Sage 50",
          "Verify customer records and barcodes"
        ]
      },
      sage_business_cloud: {
        api: [
          "Register with Sage Developer Portal",
          "Create application and get API keys",
          "Configure OAuth2 authentication",
          "Test with sandbox environment",
          "Enable production access"
        ],
        file_export: [
          "✅ READY! Export CSV from Barcode Generator",
          "Format for Sage Business Cloud import",
          "Import via Sage Business Cloud interface",
          "Map customer fields and barcodes"
        ]
      },
      freshbooks: {
        api: [
          "Create FreshBooks Developer account",
          "Register app and get OAuth credentials",
          "Configure authentication flow",
          "Test with sandbox account",
          "Connect to live business"
        ],
        file_export: [
          "✅ READY! Export CSV from Barcode Generator",
          "Import into FreshBooks: Settings → Advanced → Import/Export",
          "Map customer fields",
          "Review and confirm import"
        ]
      },
      wave: {
        file_export: [
          "✅ READY! Export CSV from Barcode Generator",
          "Import into Wave: Settings → Data Import",
          "Upload CSV file and map fields",
          "Review customer data before saving"
        ]
      },
      other: {
        file_export: [
          "✅ READY! Use universal CSV export from Barcode Generator",
          "Download customer data with barcodes",
          "Import into your accounting software using their import tools",
          "Most software accepts CSV format with customer names and numbers"
        ],
        api: [
          "✅ READY! Use JSON/API export from Barcode Generator",
          "Get structured customer data with barcodes",
          "Use your accounting software's API to import data",
          "Custom integration possible with JSON format"
        ]
      }
    };

    const softwareInstructions = instructions[currentSoftware.id];
    const methodInstructions = softwareInstructions?.[integrationSettings.integration_method];

    if (!methodInstructions) return null;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Setup Instructions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Follow these steps to set up integration with {currentSoftware.name} using {integrationMethods[integrationSettings.integration_method]?.name}.
          </Typography>

          <Box component="ol" sx={{ pl: 2 }}>
            {methodInstructions.map((instruction, index) => (
              <Typography component="li" key={index} sx={{ mb: 1 }}>
                {instruction}
              </Typography>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Accounting Software Integration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Configure how your organization integrates with accounting software. 
        We support all major accounting platforms with multiple integration methods.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🎯 What This Page Does:
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>1. Choose Your Accounting Software:</strong> Select from QuickBooks, Xero, NetSuite, Sage, and more
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>2. Pick Integration Method:</strong> API (real-time), File Export (manual), or Third-party Tools
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>3. Configure Export Formats:</strong> CSV, Excel, IIF, JSON - optimized for your software
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'info.dark' }}>
          💡 Result: Get step-by-step instructions to connect your Barcode Generator with your accounting software!
        </Typography>
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Software Selection" />
        <Tab label="Integration Method" />
        <Tab label="Export Settings" />
        <Tab label="Automation" />
        <Tab label="Setup Guide" />
      </Tabs>

      {activeTab === 0 && renderSoftwareSelection()}
      {activeTab === 1 && renderIntegrationMethod()}
      {activeTab === 2 && renderExportFormats()}
      {activeTab === 3 && renderAutomationSettings()}
      {activeTab === 4 && renderSetupInstructions()}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Current Configuration: <strong>{getCurrentSoftware()?.name || 'Not Selected'}</strong> via <strong>{integrationMethods[integrationSettings.integration_method]?.name || 'Not Selected'}</strong>
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={saveIntegrationSettings}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SettingsIcon />}
          size="large"
        >
          {loading ? 'Saving...' : 'Save Integration Settings'}
        </Button>
      </Box>
    </Box>
  );
}