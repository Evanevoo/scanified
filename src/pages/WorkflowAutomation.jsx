import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert,
  CircularProgress, Tabs, Tab, Switch, FormControlLabel, Divider,
  List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction,
  Accordion, AccordionSummary, AccordionDetails, Stepper, Step, StepLabel,
  StepContent
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  PlayArrow as PlayIcon, Pause as PauseIcon, Stop as StopIcon,
  Settings as SettingsIcon, Schedule as ScheduleIcon,
  CheckCircle as CheckIcon, Warning as WarningIcon, 
  Notifications as NotificationIcon, Build as MaintenanceIcon,
  Assignment as ComplianceIcon, AutoAwesome as AutomationIcon,
  ExpandMore as ExpandMoreIcon, Timeline as TimelineIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { NotificationService } from '../services/notificationService';

const WORKFLOW_TYPES = {
  MAINTENANCE: 'maintenance',
  COMPLIANCE: 'compliance',
  NOTIFICATION: 'notification',
  CUSTOM: 'custom'
};

const TRIGGER_TYPES = {
  SCHEDULE: 'schedule',
  EVENT: 'event',
  CONDITION: 'condition',
  MANUAL: 'manual'
};

const ACTION_TYPES = {
  SEND_NOTIFICATION: 'send_notification',
  CREATE_TASK: 'create_task',
  UPDATE_STATUS: 'update_status',
  SEND_EMAIL: 'send_email',
  GENERATE_REPORT: 'generate_report',
  API_CALL: 'api_call'
};

function WorkflowBuilder({ onWorkflowCreated }) {
  const [workflowData, setWorkflowData] = useState({
    name: '',
    description: '',
    type: WORKFLOW_TYPES.MAINTENANCE,
    triggers: [],
    actions: [],
    conditions: [],
    is_active: true
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const steps = ['Basic Info', 'Triggers', 'Conditions', 'Actions', 'Review'];

  const addTrigger = () => {
    setWorkflowData(prev => ({
      ...prev,
      triggers: [...prev.triggers, {
        id: Date.now(),
        type: TRIGGER_TYPES.SCHEDULE,
        config: {}
      }]
    }));
  };

  const addAction = () => {
    setWorkflowData(prev => ({
      ...prev,
      actions: [...prev.actions, {
        id: Date.now(),
        type: ACTION_TYPES.SEND_NOTIFICATION,
        config: {}
      }]
    }));
  };

  const addCondition = () => {
    setWorkflowData(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        id: Date.now(),
        field: 'status',
        operator: 'equals',
        value: ''
      }]
    }));
  };

  const createWorkflow = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          ...workflowData,
          triggers: JSON.stringify(workflowData.triggers),
          actions: JSON.stringify(workflowData.actions),
          conditions: JSON.stringify(workflowData.conditions),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      onWorkflowCreated(data);
      
      // Reset form
      setWorkflowData({
        name: '',
        description: '',
        type: WORKFLOW_TYPES.MAINTENANCE,
        triggers: [],
        actions: [],
        conditions: [],
        is_active: true
      });
      setCurrentStep(0);

    } catch (error) {
      console.error('Error creating workflow:', error);
      alert('Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        <AutomationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Workflow Builder
      </Typography>

      <Stepper activeStep={currentStep} orientation="vertical">
        {/* Basic Info Step */}
        <Step>
          <StepLabel>Basic Information</StepLabel>
          <StepContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Workflow Name"
                  value={workflowData.name}
                  onChange={(e) => setWorkflowData({ ...workflowData, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={workflowData.type}
                    onChange={(e) => setWorkflowData({ ...workflowData, type: e.target.value })}
                    label="Type"
                  >
                    <MenuItem value={WORKFLOW_TYPES.MAINTENANCE}>Maintenance</MenuItem>
                    <MenuItem value={WORKFLOW_TYPES.COMPLIANCE}>Compliance</MenuItem>
                    <MenuItem value={WORKFLOW_TYPES.NOTIFICATION}>Notification</MenuItem>
                    <MenuItem value={WORKFLOW_TYPES.CUSTOM}>Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={workflowData.description}
                  onChange={(e) => setWorkflowData({ ...workflowData, description: e.target.value })}
                />
              </Grid>
            </Grid>
            <Box sx={{ mb: 1 }}>
              <Button
                variant="contained"
                onClick={() => setCurrentStep(1)}
                disabled={!workflowData.name}
              >
                Continue
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Triggers Step */}
        <Step>
          <StepLabel>Triggers</StepLabel>
          <StepContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Define what events will start this workflow
            </Typography>
            
            {workflowData.triggers.map((trigger, index) => (
              <Card key={trigger.id} sx={{ mb: 2, p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Trigger Type</InputLabel>
                      <Select
                        value={trigger.type}
                        onChange={(e) => {
                          const newTriggers = [...workflowData.triggers];
                          newTriggers[index].type = e.target.value;
                          setWorkflowData({ ...workflowData, triggers: newTriggers });
                        }}
                        label="Trigger Type"
                      >
                        <MenuItem value={TRIGGER_TYPES.SCHEDULE}>Schedule</MenuItem>
                        <MenuItem value={TRIGGER_TYPES.EVENT}>Event</MenuItem>
                        <MenuItem value={TRIGGER_TYPES.CONDITION}>Condition</MenuItem>
                        <MenuItem value={TRIGGER_TYPES.MANUAL}>Manual</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {trigger.type === TRIGGER_TYPES.SCHEDULE && (
                    <>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Cron Expression"
                          placeholder="0 9 * * 1"
                          value={trigger.config.cron || ''}
                          onChange={(e) => {
                            const newTriggers = [...workflowData.triggers];
                            newTriggers[index].config.cron = e.target.value;
                            setWorkflowData({ ...workflowData, triggers: newTriggers });
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Timezone"
                          value={trigger.config.timezone || 'UTC'}
                          onChange={(e) => {
                            const newTriggers = [...workflowData.triggers];
                            newTriggers[index].config.timezone = e.target.value;
                            setWorkflowData({ ...workflowData, triggers: newTriggers });
                          }}
                        />
                      </Grid>
                    </>
                  )}

                  {trigger.type === TRIGGER_TYPES.EVENT && (
                    <Grid item xs={12} sm={8}>
                      <FormControl fullWidth>
                        <InputLabel>Event Type</InputLabel>
                        <Select
                          value={trigger.config.event_type || ''}
                          onChange={(e) => {
                            const newTriggers = [...workflowData.triggers];
                            newTriggers[index].config.event_type = e.target.value;
                            setWorkflowData({ ...workflowData, triggers: newTriggers });
                          }}
                          label="Event Type"
                        >
                          <MenuItem value="bottle_scanned">Bottle Scanned</MenuItem>
                          <MenuItem value="delivery_completed">Delivery Completed</MenuItem>
                          <MenuItem value="maintenance_due">Maintenance Due</MenuItem>
                          <MenuItem value="customer_created">Customer Created</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                </Grid>
              </Card>
            ))}

            <Button
              variant="outlined"
              onClick={addTrigger}
              startIcon={<AddIcon />}
              sx={{ mb: 2 }}
            >
              Add Trigger
            </Button>

            <Box sx={{ mb: 1 }}>
              <Button
                variant="contained"
                onClick={() => setCurrentStep(2)}
                sx={{ mr: 1 }}
              >
                Continue
              </Button>
              <Button onClick={() => setCurrentStep(0)}>
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Conditions Step */}
        <Step>
          <StepLabel>Conditions</StepLabel>
          <StepContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Add conditions that must be met for the workflow to execute
            </Typography>

            {workflowData.conditions.map((condition, index) => (
              <Card key={condition.id} sx={{ mb: 2, p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Field"
                      value={condition.field}
                      onChange={(e) => {
                        const newConditions = [...workflowData.conditions];
                        newConditions[index].field = e.target.value;
                        setWorkflowData({ ...workflowData, conditions: newConditions });
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={condition.operator}
                        onChange={(e) => {
                          const newConditions = [...workflowData.conditions];
                          newConditions[index].operator = e.target.value;
                          setWorkflowData({ ...workflowData, conditions: newConditions });
                        }}
                        label="Operator"
                      >
                        <MenuItem value="equals">Equals</MenuItem>
                        <MenuItem value="not_equals">Not Equals</MenuItem>
                        <MenuItem value="greater_than">Greater Than</MenuItem>
                        <MenuItem value="less_than">Less Than</MenuItem>
                        <MenuItem value="contains">Contains</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Value"
                      value={condition.value}
                      onChange={(e) => {
                        const newConditions = [...workflowData.conditions];
                        newConditions[index].value = e.target.value;
                        setWorkflowData({ ...workflowData, conditions: newConditions });
                      }}
                    />
                  </Grid>
                </Grid>
              </Card>
            ))}

            <Button
              variant="outlined"
              onClick={addCondition}
              startIcon={<AddIcon />}
              sx={{ mb: 2 }}
            >
              Add Condition
            </Button>

            <Box sx={{ mb: 1 }}>
              <Button
                variant="contained"
                onClick={() => setCurrentStep(3)}
                sx={{ mr: 1 }}
              >
                Continue
              </Button>
              <Button onClick={() => setCurrentStep(1)}>
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Actions Step */}
        <Step>
          <StepLabel>Actions</StepLabel>
          <StepContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Define what actions will be performed when the workflow runs
            </Typography>

            {workflowData.actions.map((action, index) => (
              <Card key={action.id} sx={{ mb: 2, p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Action Type</InputLabel>
                      <Select
                        value={action.type}
                        onChange={(e) => {
                          const newActions = [...workflowData.actions];
                          newActions[index].type = e.target.value;
                          setWorkflowData({ ...workflowData, actions: newActions });
                        }}
                        label="Action Type"
                      >
                        <MenuItem value={ACTION_TYPES.SEND_NOTIFICATION}>Send Notification</MenuItem>
                        <MenuItem value={ACTION_TYPES.CREATE_TASK}>Create Task</MenuItem>
                        <MenuItem value={ACTION_TYPES.UPDATE_STATUS}>Update Status</MenuItem>
                        <MenuItem value={ACTION_TYPES.SEND_EMAIL}>Send Email</MenuItem>
                        <MenuItem value={ACTION_TYPES.GENERATE_REPORT}>Generate Report</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {action.type === ACTION_TYPES.SEND_NOTIFICATION && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Message"
                          value={action.config.message || ''}
                          onChange={(e) => {
                            const newActions = [...workflowData.actions];
                            newActions[index].config.message = e.target.value;
                            setWorkflowData({ ...workflowData, actions: newActions });
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Priority</InputLabel>
                          <Select
                            value={action.config.priority || 'medium'}
                            onChange={(e) => {
                              const newActions = [...workflowData.actions];
                              newActions[index].config.priority = e.target.value;
                              setWorkflowData({ ...workflowData, actions: newActions });
                            }}
                            label="Priority"
                          >
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="urgent">Urgent</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </>
                  )}

                  {action.type === ACTION_TYPES.SEND_EMAIL && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Recipients"
                          placeholder="email1@example.com, email2@example.com"
                          value={action.config.recipients || ''}
                          onChange={(e) => {
                            const newActions = [...workflowData.actions];
                            newActions[index].config.recipients = e.target.value;
                            setWorkflowData({ ...workflowData, actions: newActions });
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Subject"
                          value={action.config.subject || ''}
                          onChange={(e) => {
                            const newActions = [...workflowData.actions];
                            newActions[index].config.subject = e.target.value;
                            setWorkflowData({ ...workflowData, actions: newActions });
                          }}
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
              </Card>
            ))}

            <Button
              variant="outlined"
              onClick={addAction}
              startIcon={<AddIcon />}
              sx={{ mb: 2 }}
            >
              Add Action
            </Button>

            <Box sx={{ mb: 1 }}>
              <Button
                variant="contained"
                onClick={() => setCurrentStep(4)}
                sx={{ mr: 1 }}
                disabled={workflowData.actions.length === 0}
              >
                Continue
              </Button>
              <Button onClick={() => setCurrentStep(2)}>
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Review Step */}
        <Step>
          <StepLabel>Review & Create</StepLabel>
          <StepContent>
            <Typography variant="h6" gutterBottom>
              Workflow Summary
            </Typography>
            
            <Card sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>{workflowData.name}</strong> ({workflowData.type})
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {workflowData.description}
              </Typography>
              
              <Typography variant="body2">
                <strong>Triggers:</strong> {workflowData.triggers.length}
              </Typography>
              <Typography variant="body2">
                <strong>Conditions:</strong> {workflowData.conditions.length}
              </Typography>
              <Typography variant="body2">
                <strong>Actions:</strong> {workflowData.actions.length}
              </Typography>
            </Card>

            <FormControlLabel
              control={
                <Switch
                  checked={workflowData.is_active}
                  onChange={(e) => setWorkflowData({ ...workflowData, is_active: e.target.checked })}
                />
              }
              label="Activate workflow immediately"
            />

            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={createWorkflow}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
                sx={{ mr: 1 }}
              >
                Create Workflow
              </Button>
              <Button onClick={() => setCurrentStep(3)}>
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>
      </Stepper>
    </Paper>
  );
}

function WorkflowExecutionHistory({ workflows }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutions();
  }, [workflows]);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'primary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckIcon />;
      case 'failed': return <WarningIcon />;
      case 'running': return <PlayIcon />;
      default: return <ScheduleIcon />;
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Execution History
      </Typography>

      <List>
        {executions.map((execution, index) => (
          <ListItem key={execution.id} sx={{ alignItems: 'flex-start', py: 2 }}>
            <ListItemIcon>
              <Chip
                icon={getStatusIcon(execution.status)}
                label={execution.status}
                color={getStatusColor(execution.status)}
                size="small"
              />
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {execution.workflow_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(execution.executed_at).toLocaleString()}
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Duration: {execution.duration || 'N/A'}
                  </Typography>
                  {execution.error_message && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {execution.error_message}
                    </Alert>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
        {executions.length === 0 && (
          <ListItem>
            <ListItemText
              primary="No execution history"
              secondary="Workflows will appear here once they start running"
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
}

function WorkflowAutomation() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchWorkflows();
    }
  }, [profile]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowCreated = (workflow) => {
    setWorkflows(prev => [workflow, ...prev]);
    setActiveTab(1); // Switch to workflows tab
  };

  const toggleWorkflow = async (workflowId, isActive) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .update({ is_active: isActive })
        .eq('id', workflowId);

      if (error) throw error;

      setWorkflows(prev => 
        prev.map(w => w.id === workflowId ? { ...w, is_active: isActive } : w)
      );
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const stats = {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter(w => w.is_active).length,
    maintenanceWorkflows: workflows.filter(w => w.type === WORKFLOW_TYPES.MAINTENANCE).length,
    complianceWorkflows: workflows.filter(w => w.type === WORKFLOW_TYPES.COMPLIANCE).length
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workflow Automation</Typography>
        <Button
          variant="contained"
          startIcon={<AutomationIcon />}
          onClick={() => setActiveTab(0)}
        >
          Create Workflow
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Workflows
              </Typography>
              <Typography variant="h4">{stats.totalWorkflows}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Workflows
              </Typography>
              <Typography variant="h4" color="success.main">{stats.activeWorkflows}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Maintenance
              </Typography>
              <Typography variant="h4" color="warning.main">{stats.maintenanceWorkflows}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Compliance
              </Typography>
              <Typography variant="h4" color="info.main">{stats.complianceWorkflows}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Create Workflow" />
          <Tab label="Active Workflows" />
          <Tab label="Execution History" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <WorkflowBuilder onWorkflowCreated={handleWorkflowCreated} />
      )}

      {activeTab === 1 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Triggers</TableCell>
                  <TableCell>Actions</TableCell>
                  <TableCell>Last Run</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workflows.map(workflow => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{workflow.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {workflow.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={workflow.type} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={workflow.is_active ? 'Active' : 'Inactive'}
                        color={workflow.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {JSON.parse(workflow.triggers || '[]').length}
                    </TableCell>
                    <TableCell>
                      {JSON.parse(workflow.actions || '[]').length}
                    </TableCell>
                    <TableCell>
                      {workflow.last_executed_at 
                        ? new Date(workflow.last_executed_at).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={workflow.is_active}
                        onChange={(e) => toggleWorkflow(workflow.id, e.target.checked)}
                        size="small"
                      />
                      <IconButton size="small">
                        <EditIcon />
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
        <WorkflowExecutionHistory workflows={workflows} />
      )}
    </Box>
  );
}

export default WorkflowAutomation; 