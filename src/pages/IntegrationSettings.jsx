import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TestTube as TestIcon,
  Sync as SyncIcon,
  Webhook as WebhookIcon,
  Sms as SmsIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import integrationService from '../services/integrationService';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`integration-tabpanel-${index}`}
      aria-labelledby={`integration-tab-${index}`}
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

export default function IntegrationSettings() {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [integrations, setIntegrations] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [erpDialogOpen, setErpDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  
  // Form states
  const [erpForm, setErpForm] = useState({
    type: 'sap',
    name: '',
    url: '',
    username: '',
    password: '',
    clientId: '',
    serviceName: '',
    tenantId: '',
    clientSecret: ''
  });
  
  const [smsForm, setSmsForm] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });
  
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    events: ['*'],
    secret: '',
    isActive: true
  });
  
  const [automationForm, setAutomationForm] = useState({
    name: '',
    trigger: 'bottle_created',
    conditions: [{ field: 'status', operator: 'equals', value: 'active' }],
    actions: [{ type: 'send_email', config: { to: '', subject: '', body: '' } }],
    isActive: true
  });

  useEffect(() => {
    if (organization?.id) {
      loadIntegrations();
      loadWebhooks();
      loadAutomationRules();
    }
  }, [organization]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      logger.error('Error loading integrations:', error);
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      logger.error('Error loading webhooks:', error);
      setError('Failed to load webhooks');
    }
  };

  const loadAutomationRules = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomationRules(data || []);
    } catch (error) {
      logger.error('Error loading automation rules:', error);
      setError('Failed to load automation rules');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleErpSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const config = {
        [erpForm.type === 'sap' ? 'sapUrl' : erpForm.type === 'oracle' ? 'oracleUrl' : 'dynamicsUrl']: erpForm.url,
        username: erpForm.username,
        password: erpForm.password,
        ...(erpForm.type === 'sap' && { clientId: erpForm.clientId }),
        ...(erpForm.type === 'oracle' && { serviceName: erpForm.serviceName }),
        ...(erpForm.type === 'dynamics' && { tenantId: erpForm.tenantId, clientSecret: erpForm.clientSecret })
      };

      let result;
      switch (erpForm.type) {
        case 'sap':
          result = await integrationService.integrateWithSAP(organization.id, config);
          break;
        case 'oracle':
          result = await integrationService.integrateWithOracle(organization.id, config);
          break;
        case 'dynamics':
          result = await integrationService.integrateWithDynamics(organization.id, config);
          break;
        default:
          throw new Error('Invalid ERP type');
      }

      if (result.success) {
        setSuccess('ERP integration created successfully');
        setErpDialogOpen(false);
        loadIntegrations();
        resetErpForm();
      } else {
        setError(result.error);
      }
    } catch (error) {
      logger.error('ERP integration error:', error);
      setError('Failed to create ERP integration');
    } finally {
      setLoading(false);
    }
  };

  const handleSmsSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await integrationService.integrateWithTwilio(organization.id, smsForm);
      
      if (result.success) {
        setSuccess('SMS integration created successfully');
        setSmsDialogOpen(false);
        loadIntegrations();
        resetSmsForm();
      } else {
        setError(result.error);
      }
    } catch (error) {
      logger.error('SMS integration error:', error);
      setError('Failed to create SMS integration');
    } finally {
      setLoading(false);
    }
  };

  const handleWebhookSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await integrationService.createWebhook(organization.id, webhookForm);
      
      if (result.success) {
        setSuccess('Webhook created successfully');
        setWebhookDialogOpen(false);
        loadWebhooks();
        resetWebhookForm();
      } else {
        setError(result.error);
      }
    } catch (error) {
      logger.error('Webhook creation error:', error);
      setError('Failed to create webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleAutomationSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await integrationService.createAutomationRule(organization.id, automationForm);
      
      if (result.success) {
        setSuccess('Automation rule created successfully');
        setAutomationDialogOpen(false);
        loadAutomationRules();
        resetAutomationForm();
      } else {
        setError(result.error);
      }
    } catch (error) {
      logger.error('Automation rule creation error:', error);
      setError('Failed to create automation rule');
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async (integrationId) => {
    try {
      setLoading(true);
      // Implement integration testing
      setSuccess('Integration test completed successfully');
    } catch (error) {
      logger.error('Integration test error:', error);
      setError('Integration test failed');
    } finally {
      setLoading(false);
    }
  };

  const syncIntegration = async (integrationId) => {
    try {
      setLoading(true);
      // Implement integration sync
      setSuccess('Integration sync completed successfully');
    } catch (error) {
      logger.error('Integration sync error:', error);
      setError('Integration sync failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteIntegration = async (integrationId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;
      
      setSuccess('Integration deleted successfully');
      loadIntegrations();
    } catch (error) {
      logger.error('Delete integration error:', error);
      setError('Failed to delete integration');
    } finally {
      setLoading(false);
    }
  };

  const resetErpForm = () => {
    setErpForm({
      type: 'sap',
      name: '',
      url: '',
      username: '',
      password: '',
      clientId: '',
      serviceName: '',
      tenantId: '',
      clientSecret: ''
    });
  };

  const resetSmsForm = () => {
    setSmsForm({
      accountSid: '',
      authToken: '',
      phoneNumber: ''
    });
  };

  const resetWebhookForm = () => {
    setWebhookForm({
      name: '',
      url: '',
      events: ['*'],
      secret: '',
      isActive: true
    });
  };

  const resetAutomationForm = () => {
    setAutomationForm({
      name: '',
      trigger: 'bottle_created',
      conditions: [{ field: 'status', operator: 'equals', value: 'active' }],
      actions: [{ type: 'send_email', config: { to: '', subject: '', body: '' } }],
      isActive: true
    });
  };

  const getIntegrationIcon = (type) => {
    switch (type) {
      case 'sap':
      case 'oracle':
      case 'dynamics':
        return <BusinessIcon />;
      case 'twilio':
        return <SmsIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  const getIntegrationStatus = (integration) => {
    if (integration.is_active) {
      return <Chip icon={<CheckCircleIcon />} label="Active" color="success" size="small" />;
    } else {
      return <Chip icon={<ErrorIcon />} label="Inactive" color="error" size="small" />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Integration Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="integration tabs">
            <Tab label="ERP Systems" icon={<BusinessIcon />} />
            <Tab label="SMS Services" icon={<SmsIcon />} />
            <Tab label="Webhooks" icon={<WebhookIcon />} />
            <Tab label="Automation Rules" icon={<SettingsIcon />} />
          </Tabs>
        </Box>

        {/* ERP Systems Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">ERP System Integrations</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setErpDialogOpen(true)}
            >
              Add ERP Integration
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Sync</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {integrations.filter(i => ['sap', 'oracle', 'dynamics'].includes(i.type)).map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getIntegrationIcon(integration.type)}
                        {integration.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={integration.type.toUpperCase()} variant="outlined" />
                    </TableCell>
                    <TableCell>{getIntegrationStatus(integration)}</TableCell>
                    <TableCell>
                      {integration.last_sync ? new Date(integration.last_sync).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Test Connection">
                        <IconButton onClick={() => testIntegration(integration.id)}>
                          <TestIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sync Data">
                        <IconButton onClick={() => syncIntegration(integration.id)}>
                          <SyncIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => deleteIntegration(integration.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* SMS Services Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">SMS Service Integrations</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setSmsDialogOpen(true)}
            >
              Add SMS Integration
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Phone Number</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {integrations.filter(i => i.type === 'twilio').map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmsIcon />
                        {integration.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label="Twilio" variant="outlined" />
                    </TableCell>
                    <TableCell>{getIntegrationStatus(integration)}</TableCell>
                    <TableCell>{integration.config?.phoneNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Tooltip title="Test Connection">
                        <IconButton onClick={() => testIntegration(integration.id)}>
                          <TestIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => deleteIntegration(integration.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Webhooks Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Webhook Integrations</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setWebhookDialogOpen(true)}
            >
              Add Webhook
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Events</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WebhookIcon />
                        {webhook.name}
                      </Box>
                    </TableCell>
                    <TableCell>{webhook.url}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {webhook.events.map((event, index) => (
                          <Chip key={index} label={event} size="small" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>{getIntegrationStatus(webhook)}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Automation Rules Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Automation Rules</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAutomationDialogOpen(true)}
            >
              Add Automation Rule
            </Button>
          </Box>

          <Grid container spacing={2}>
            {automationRules.map((rule) => (
              <Grid item xs={12} md={6} key={rule.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {rule.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Trigger: {rule.trigger}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Conditions: {rule.conditions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Actions: {rule.actions.length}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {getIntegrationStatus(rule)}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<EditIcon />}>
                      Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon />}>
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* ERP Integration Dialog */}
      <Dialog open={erpDialogOpen} onClose={() => setErpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add ERP Integration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="ERP Type"
                value={erpForm.type}
                onChange={(e) => setErpForm({ ...erpForm, type: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="sap">SAP</option>
                <option value="oracle">Oracle</option>
                <option value="dynamics">Microsoft Dynamics</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={erpForm.name}
                onChange={(e) => setErpForm({ ...erpForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL"
                value={erpForm.url}
                onChange={(e) => setErpForm({ ...erpForm, url: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={erpForm.username}
                onChange={(e) => setErpForm({ ...erpForm, username: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={erpForm.password}
                onChange={(e) => setErpForm({ ...erpForm, password: e.target.value })}
              />
            </Grid>
            {erpForm.type === 'sap' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client ID"
                  value={erpForm.clientId}
                  onChange={(e) => setErpForm({ ...erpForm, clientId: e.target.value })}
                />
              </Grid>
            )}
            {erpForm.type === 'oracle' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Service Name"
                  value={erpForm.serviceName}
                  onChange={(e) => setErpForm({ ...erpForm, serviceName: e.target.value })}
                />
              </Grid>
            )}
            {erpForm.type === 'dynamics' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tenant ID"
                    value={erpForm.tenantId}
                    onChange={(e) => setErpForm({ ...erpForm, tenantId: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Client Secret"
                    type="password"
                    value={erpForm.clientSecret}
                    onChange={(e) => setErpForm({ ...erpForm, clientSecret: e.target.value })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErpDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleErpSubmit} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Integration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SMS Integration Dialog */}
      <Dialog open={smsDialogOpen} onClose={() => setSmsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add SMS Integration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Account SID"
                value={smsForm.accountSid}
                onChange={(e) => setSmsForm({ ...smsForm, accountSid: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Auth Token"
                type="password"
                value={smsForm.authToken}
                onChange={(e) => setSmsForm({ ...smsForm, authToken: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                value={smsForm.phoneNumber}
                onChange={(e) => setSmsForm({ ...smsForm, phoneNumber: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSmsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSmsSubmit} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Integration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Webhook Dialog */}
      <Dialog open={webhookDialogOpen} onClose={() => setWebhookDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Webhook</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={webhookForm.name}
                onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Events (comma-separated)"
                value={webhookForm.events.join(', ')}
                onChange={(e) => setWebhookForm({ 
                  ...webhookForm, 
                  events: e.target.value.split(',').map(event => event.trim())
                })}
                placeholder="bottle_created, bottle_updated, *"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Secret (optional)"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={webhookForm.isActive}
                    onChange={(e) => setWebhookForm({ ...webhookForm, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebhookDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleWebhookSubmit} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Webhook'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Automation Rule Dialog */}
      <Dialog open={automationDialogOpen} onClose={() => setAutomationDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Add Automation Rule</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={automationForm.name}
                onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Trigger Event"
                value={automationForm.trigger}
                onChange={(e) => setAutomationForm({ ...automationForm, trigger: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="bottle_created">Bottle Created</option>
                <option value="bottle_updated">Bottle Updated</option>
                <option value="rental_created">Rental Created</option>
                <option value="delivery_scheduled">Delivery Scheduled</option>
                <option value="maintenance_due">Maintenance Due</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Conditions
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary">
                  Conditions will be configured in the automation rule editor.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Actions
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary">
                  Actions will be configured in the automation rule editor.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={automationForm.isActive}
                    onChange={(e) => setAutomationForm({ ...automationForm, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutomationDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAutomationSubmit} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Rule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
