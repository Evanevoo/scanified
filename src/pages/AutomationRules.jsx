import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Webhook as WebhookIcon,
  Task as TaskIcon,
  Update as UpdateIcon,
  Conditional as ConditionalIcon,
  Delay as DelayIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import automationService from '../services/automationService';

export default function AutomationRules() {
  const { organization } = useAuth();
  const [rules, setRules] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  
  // Form states
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    trigger: 'bottle_created',
    conditions: [{ field: 'status', operator: 'equals', value: 'active' }],
    actions: [{ type: 'send_email', config: { to: '', subject: '', body: '' } }],
    isActive: true
  });
  
  const [editingRule, setEditingRule] = useState(null);
  const [testContext, setTestContext] = useState({});

  useEffect(() => {
    if (organization?.id) {
      loadRules();
      loadTriggers();
      loadActions();
    }
  }, [organization]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await automationService.getRules(organization.id);
      setRules(data || []);
    } catch (error) {
      logger.error('Error loading automation rules:', error);
      setError('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const loadTriggers = async () => {
    try {
      const triggers = automationService.getAllTriggers();
      setTriggers(triggers);
    } catch (error) {
      logger.error('Error loading triggers:', error);
    }
  };

  const loadActions = async () => {
    try {
      const actions = automationService.getAllActions();
      setActions(actions);
    } catch (error) {
      logger.error('Error loading actions:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await automationService.createRule(organization.id, ruleForm);
      
      setSuccess('Automation rule created successfully');
      setCreateDialogOpen(false);
      loadRules();
      resetForm();
    } catch (error) {
      logger.error('Error creating automation rule:', error);
      setError('Failed to create automation rule');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await automationService.updateRule(editingRule.id, ruleForm);
      
      setSuccess('Automation rule updated successfully');
      setEditDialogOpen(false);
      loadRules();
      resetForm();
    } catch (error) {
      logger.error('Error updating automation rule:', error);
      setError('Failed to update automation rule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this automation rule?')) {
      return;
    }

    try {
      setLoading(true);
      await automationService.deleteRule(ruleId);
      
      setSuccess('Automation rule deleted successfully');
      loadRules();
    } catch (error) {
      logger.error('Error deleting automation rule:', error);
      setError('Failed to delete automation rule');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      setLoading(true);
      await automationService.updateRule(rule.id, { is_active: !rule.is_active });
      
      setSuccess(`Automation rule ${rule.is_active ? 'deactivated' : 'activated'}`);
      loadRules();
    } catch (error) {
      logger.error('Error toggling automation rule:', error);
      setError('Failed to toggle automation rule');
    } finally {
      setLoading(false);
    }
  };

  const handleTestRule = async (rule) => {
    try {
      setLoading(true);
      await automationService.testRule(rule.id, testContext);
      
      setSuccess('Automation rule test completed');
      setTestDialogOpen(false);
    } catch (error) {
      logger.error('Error testing automation rule:', error);
      setError('Failed to test automation rule');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      trigger: rule.trigger,
      conditions: rule.conditions || [],
      actions: rule.actions || [],
      isActive: rule.is_active
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setRuleForm({
      name: '',
      description: '',
      trigger: 'bottle_created',
      conditions: [{ field: 'status', operator: 'equals', value: 'active' }],
      actions: [{ type: 'send_email', config: { to: '', subject: '', body: '' } }],
      isActive: true
    });
    setEditingRule(null);
  };

  const addCondition = () => {
    setRuleForm({
      ...ruleForm,
      conditions: [...ruleForm.conditions, { field: '', operator: 'equals', value: '' }]
    });
  };

  const updateCondition = (index, field, value) => {
    const newConditions = [...ruleForm.conditions];
    newConditions[index][field] = value;
    setRuleForm({ ...ruleForm, conditions: newConditions });
  };

  const removeCondition = (index) => {
    const newConditions = ruleForm.conditions.filter((_, i) => i !== index);
    setRuleForm({ ...ruleForm, conditions: newConditions });
  };

  const addAction = () => {
    setRuleForm({
      ...ruleForm,
      actions: [...ruleForm.actions, { type: 'send_email', config: {} }]
    });
  };

  const updateAction = (index, field, value) => {
    const newActions = [...ruleForm.actions];
    if (field === 'type') {
      newActions[index] = { type: value, config: {} };
    } else {
      newActions[index].config[field] = value;
    }
    setRuleForm({ ...ruleForm, actions: newActions });
  };

  const removeAction = (index) => {
    const newActions = ruleForm.actions.filter((_, i) => i !== index);
    setRuleForm({ ...ruleForm, actions: newActions });
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'send_email':
        return <EmailIcon />;
      case 'send_sms':
        return <SmsIcon />;
      case 'create_task':
        return <TaskIcon />;
      case 'update_record':
        return <UpdateIcon />;
      case 'trigger_webhook':
        return <WebhookIcon />;
      case 'send_notification':
        return <NotificationsIcon />;
      case 'delay':
        return <DelayIcon />;
      case 'conditional':
        return <ConditionalIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  const getTriggerFields = (triggerId) => {
    const trigger = triggers.find(t => t.id === triggerId);
    return trigger ? trigger.fields : [];
  };

  const getActionFields = (actionType) => {
    const action = actions.find(a => a.id === actionType);
    return action ? action.configFields : [];
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Automation Rules
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {rules.length} Automation Rule{rules.length !== 1 ? 's' : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Rule
        </Button>
      </Box>

      <Grid container spacing={2}>
        {rules.map((rule) => (
          <Grid item xs={12} md={6} key={rule.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {rule.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={rule.is_active ? 'Active' : 'Inactive'}
                      color={rule.is_active ? 'success' : 'default'}
                      size="small"
                    />
                    {rule.error_count > 0 && (
                      <Chip
                        label={`${rule.error_count} errors`}
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
                
                {rule.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {rule.description}
                  </Typography>
                )}
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Trigger:</strong> {rule.trigger}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Conditions:</strong> {rule.conditions?.length || 0}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Actions:</strong> {rule.actions?.length || 0}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {rule.actions?.map((action, index) => (
                    <Chip
                      key={index}
                      icon={getActionIcon(action.type)}
                      label={action.type}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Executed {rule.execution_count || 0} times
                  {rule.last_executed && (
                    <> • Last: {new Date(rule.last_executed).toLocaleString()}</>
                  )}
                </Typography>
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={rule.is_active ? <PauseIcon /> : <PlayIcon />}
                  onClick={() => handleToggleRule(rule)}
                >
                  {rule.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditRule(rule)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  startIcon={<PlayIcon />}
                  onClick={() => {
                    setEditingRule(rule);
                    setTestDialogOpen(true);
                  }}
                >
                  Test
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteRule(rule.id)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Rule Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Automation Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Rule Name"
              value={ruleForm.name}
              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={ruleForm.description}
              onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Trigger Event</InputLabel>
              <Select
                value={ruleForm.trigger}
                onChange={(e) => setRuleForm({ ...ruleForm, trigger: e.target.value })}
                label="Trigger Event"
              >
                {triggers.map((trigger) => (
                  <MenuItem key={trigger.id} value={trigger.id}>
                    {trigger.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Conditions ({ruleForm.conditions.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {ruleForm.conditions.map((condition, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <TextField
                      label="Field"
                      value={condition.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        label="Operator"
                      >
                        <MenuItem value="equals">Equals</MenuItem>
                        <MenuItem value="not_equals">Not Equals</MenuItem>
                        <MenuItem value="greater_than">Greater Than</MenuItem>
                        <MenuItem value="less_than">Less Than</MenuItem>
                        <MenuItem value="contains">Contains</MenuItem>
                        <MenuItem value="not_contains">Not Contains</MenuItem>
                        <MenuItem value="is_empty">Is Empty</MenuItem>
                        <MenuItem value="is_not_empty">Is Not Empty</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Value"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <IconButton onClick={() => removeCondition(index)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button onClick={addCondition} startIcon={<AddIcon />} size="small">
                  Add Condition
                </Button>
              </AccordionDetails>
            </Accordion>
            
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Actions ({ruleForm.actions.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {ruleForm.actions.map((action, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Action Type</InputLabel>
                        <Select
                          value={action.type}
                          onChange={(e) => updateAction(index, 'type', e.target.value)}
                          label="Action Type"
                        >
                          {actions.map((actionType) => (
                            <MenuItem key={actionType.id} value={actionType.id}>
                              {actionType.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton onClick={() => removeAction(index)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    {getActionFields(action.type).map((field) => (
                      <TextField
                        key={field.name}
                        label={field.name}
                        value={action.config[field.name] || ''}
                        onChange={(e) => updateAction(index, field.name, e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                        required={field.required}
                        multiline={field.type === 'text'}
                        rows={field.type === 'text' ? 3 : 1}
                      />
                    ))}
                  </Box>
                ))}
                <Button onClick={addAction} startIcon={<AddIcon />} size="small">
                  Add Action
                </Button>
              </AccordionDetails>
            </Accordion>
            
            <FormControlLabel
              control={
                <Switch
                  checked={ruleForm.isActive}
                  onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRule} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Rule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Automation Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Rule Name"
              value={ruleForm.name}
              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={ruleForm.description}
              onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Trigger Event</InputLabel>
              <Select
                value={ruleForm.trigger}
                onChange={(e) => setRuleForm({ ...ruleForm, trigger: e.target.value })}
                label="Trigger Event"
              >
                {triggers.map((trigger) => (
                  <MenuItem key={trigger.id} value={trigger.id}>
                    {trigger.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Conditions ({ruleForm.conditions.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {ruleForm.conditions.map((condition, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <TextField
                      label="Field"
                      value={condition.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        label="Operator"
                      >
                        <MenuItem value="equals">Equals</MenuItem>
                        <MenuItem value="not_equals">Not Equals</MenuItem>
                        <MenuItem value="greater_than">Greater Than</MenuItem>
                        <MenuItem value="less_than">Less Than</MenuItem>
                        <MenuItem value="contains">Contains</MenuItem>
                        <MenuItem value="not_contains">Not Contains</MenuItem>
                        <MenuItem value="is_empty">Is Empty</MenuItem>
                        <MenuItem value="is_not_empty">Is Not Empty</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Value"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <IconButton onClick={() => removeCondition(index)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button onClick={addCondition} startIcon={<AddIcon />} size="small">
                  Add Condition
                </Button>
              </AccordionDetails>
            </Accordion>
            
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Actions ({ruleForm.actions.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {ruleForm.actions.map((action, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Action Type</InputLabel>
                        <Select
                          value={action.type}
                          onChange={(e) => updateAction(index, 'type', e.target.value)}
                          label="Action Type"
                        >
                          {actions.map((actionType) => (
                            <MenuItem key={actionType.id} value={actionType.id}>
                              {actionType.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton onClick={() => removeAction(index)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    {getActionFields(action.type).map((field) => (
                      <TextField
                        key={field.name}
                        label={field.name}
                        value={action.config[field.name] || ''}
                        onChange={(e) => updateAction(index, field.name, e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                        required={field.required}
                        multiline={field.type === 'text'}
                        rows={field.type === 'text' ? 3 : 1}
                      />
                    ))}
                  </Box>
                ))}
                <Button onClick={addAction} startIcon={<AddIcon />} size="small">
                  Add Action
                </Button>
              </AccordionDetails>
            </Accordion>
            
            <FormControlLabel
              control={
                <Switch
                  checked={ruleForm.isActive}
                  onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateRule} variant="contained" disabled={loading}>
            {loading ? 'Updating...' : 'Update Rule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Rule Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Automation Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Test the automation rule with sample data to verify it works correctly.
            </Typography>
            
            <TextField
              fullWidth
              label="Test Context (JSON)"
              multiline
              rows={6}
              value={JSON.stringify(testContext, null, 2)}
              onChange={(e) => {
                try {
                  setTestContext(JSON.parse(e.target.value));
                } catch (error) {
                  // Invalid JSON, keep the text
                }
              }}
              placeholder='{"newData": {"id": "test-123", "status": "active", "organization_id": "org-123"}}'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleTestRule(editingRule)} variant="contained" disabled={loading}>
            {loading ? 'Testing...' : 'Test Rule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
