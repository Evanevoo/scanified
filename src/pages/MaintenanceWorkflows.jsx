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
  Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import {
  Build as BuildIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
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
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export default function MaintenanceWorkflows() {
  const { profile, organization } = useAuth();
  const { can } = usePermissions();
  
  const [workflows, setWorkflows] = useState([]);
  const [workflowTemplates, setWorkflowTemplates] = useState([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [createWorkflowDialog, setCreateWorkflowDialog] = useState(false);
  const [editWorkflowDialog, setEditWorkflowDialog] = useState(false);
  const [createTemplateDialog, setCreateTemplateDialog] = useState(false);
  const [viewWorkflowDialog, setViewWorkflowDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  
  // Form states
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    category: 'preventive',
    priority: 'medium',
    frequency: 'monthly',
    estimated_duration: 60,
    assigned_to: '',
    checklist_items: [],
    required_parts: [],
    safety_requirements: [],
    documentation_required: false
  });
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: 'preventive',
    checklist_template: [],
    parts_template: [],
    safety_template: []
  });

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

      // Fetch workflows, templates, and tasks in parallel
      const [workflowsResult, templatesResult, tasksResult] = await Promise.all([
        supabase
          .from('maintenance_workflows')
          .select(`
            *,
            assigned_user:profiles!maintenance_workflows_assigned_to_fkey(full_name, email),
            created_user:profiles!maintenance_workflows_created_by_fkey(full_name, email)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('maintenance_templates')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('maintenance_tasks')
          .select(`
            *,
            workflow:maintenance_workflows(name),
            assigned_user:profiles!maintenance_tasks_assigned_to_fkey(full_name, email),
            completed_user:profiles!maintenance_tasks_completed_by_fkey(full_name, email)
          `)
          .eq('organization_id', orgId)
          .order('due_date', { ascending: true })
      ]);

      if (workflowsResult.error) throw workflowsResult.error;
      if (templatesResult.error) throw templatesResult.error;
      if (tasksResult.error) throw tasksResult.error;

      setWorkflows(workflowsResult.data || []);
      setWorkflowTemplates(templatesResult.data || []);
      setMaintenanceTasks(tasksResult.data || []);

    } catch (error) {
      logger.error('Error fetching maintenance data:', error);
      setError('Failed to load maintenance workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('maintenance_workflows')
        .insert({
          organization_id: profile.organization_id,
          created_by: profile.id,
          assigned_to: workflowForm.assigned_to || null,
          name: workflowForm.name,
          description: workflowForm.description,
          category: workflowForm.category,
          priority: workflowForm.priority,
          frequency: workflowForm.frequency,
          estimated_duration: workflowForm.estimated_duration,
          checklist_items: workflowForm.checklist_items,
          required_parts: workflowForm.required_parts,
          safety_requirements: workflowForm.safety_requirements,
          documentation_required: workflowForm.documentation_required,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Workflow created successfully');
      setCreateWorkflowDialog(false);
      resetWorkflowForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating workflow:', error);
      setError('Failed to create workflow');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('maintenance_templates')
        .insert({
          organization_id: profile.organization_id,
          name: templateForm.name,
          description: templateForm.description,
          category: templateForm.category,
          checklist_template: templateForm.checklist_template,
          parts_template: templateForm.parts_template,
          safety_template: templateForm.safety_template
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

  const handleStartWorkflow = async (workflowId) => {
    try {
      setError('');
      
      // Update workflow status to active
      const { error: updateError } = await supabase
        .from('maintenance_workflows')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', workflowId);

      if (updateError) throw updateError;

      // Create maintenance tasks based on workflow
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        const tasks = workflow.checklist_items.map((item, index) => ({
          organization_id: profile.organization_id,
          workflow_id: workflowId,
          assigned_to: workflow.assigned_to,
          name: item.name || `Task ${index + 1}`,
          description: item.description || '',
          status: 'pending',
          priority: workflow.priority,
          due_date: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString()
        }));

        const { error: tasksError } = await supabase
          .from('maintenance_tasks')
          .insert(tasks);

        if (tasksError) throw tasksError;
      }

      setSuccess('Workflow started successfully');
      fetchData();

    } catch (error) {
      logger.error('Error starting workflow:', error);
      setError('Failed to start workflow');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      setError('');
      
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: profile.id
        })
        .eq('id', taskId);

      if (error) throw error;

      setSuccess('Task completed successfully');
      fetchData();

    } catch (error) {
      logger.error('Error completing task:', error);
      setError('Failed to complete task');
    }
  };

  const resetWorkflowForm = () => {
    setWorkflowForm({
      name: '',
      description: '',
      category: 'preventive',
      priority: 'medium',
      frequency: 'monthly',
      estimated_duration: 60,
      assigned_to: '',
      checklist_items: [],
      required_parts: [],
      safety_requirements: [],
      documentation_required: false
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      category: 'preventive',
      checklist_template: [],
      parts_template: [],
      safety_template: []
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'primary';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      case 'draft': return 'default';
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
            Maintenance Workflows
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage preventive and corrective maintenance processes
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
            onClick={() => setCreateWorkflowDialog(true)}
          >
            New Workflow
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
                <BuildIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{workflows.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Workflows
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
                <ScheduleIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {maintenanceTasks.filter(t => t.status === 'pending').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Tasks
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
                <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {maintenanceTasks.filter(t => t.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed Tasks
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
                  <Typography variant="h6">{workflowTemplates.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Templates
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Workflows Table */}
      <Paper sx={{ mb: 4 }}>
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            Active Workflows
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{workflow.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {workflow.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={workflow.category} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={workflow.priority} 
                        size="small" 
                        color={getPriorityColor(workflow.priority)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={workflow.status} 
                        size="small" 
                        color={getStatusColor(workflow.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {workflow.assigned_user?.full_name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      {workflow.due_date ? new Date(workflow.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setViewWorkflowDialog(true);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {workflow.status === 'draft' && (
                          <Tooltip title="Start Workflow">
                            <IconButton 
                              size="small"
                              onClick={() => handleStartWorkflow(workflow.id)}
                            >
                              <PlayIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setEditWorkflowDialog(true);
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

      {/* Maintenance Tasks */}
      <Paper sx={{ mb: 4 }}>
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            Maintenance Tasks
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenanceTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{task.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {task.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {task.workflow?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={task.priority} 
                        size="small" 
                        color={getPriorityColor(task.priority)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={task.status} 
                        size="small" 
                        color={getStatusColor(task.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {task.assigned_user?.full_name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {task.status === 'pending' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Create Workflow Dialog */}
      <Dialog 
        open={createWorkflowDialog} 
        onClose={() => setCreateWorkflowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Maintenance Workflow</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Workflow Name"
                  value={workflowForm.name}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={workflowForm.description}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={workflowForm.category}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, category: e.target.value })}
                  >
                    <MenuItem value="preventive">Preventive</MenuItem>
                    <MenuItem value="corrective">Corrective</MenuItem>
                    <MenuItem value="predictive">Predictive</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={workflowForm.priority}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, priority: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={workflowForm.frequency}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, frequency: e.target.value })}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="annually">Annually</MenuItem>
                    <MenuItem value="as_needed">As Needed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Estimated Duration (minutes)"
                  type="number"
                  value={workflowForm.estimated_duration}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, estimated_duration: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflowForm.documentation_required}
                      onChange={(e) => setWorkflowForm({ ...workflowForm, documentation_required: e.target.checked })}
                    />
                  }
                  label="Documentation Required"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateWorkflowDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateWorkflow} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog 
        open={createTemplateDialog} 
        onClose={() => setCreateTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Maintenance Template</DialogTitle>
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
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  >
                    <MenuItem value="preventive">Preventive</MenuItem>
                    <MenuItem value="corrective">Corrective</MenuItem>
                    <MenuItem value="predictive">Predictive</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTemplateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* View Workflow Dialog */}
      <Dialog 
        open={viewWorkflowDialog} 
        onClose={() => setViewWorkflowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Workflow Details</DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedWorkflow.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {selectedWorkflow.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Category</Typography>
                  <Chip label={selectedWorkflow.category} size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Priority</Typography>
                  <Chip 
                    label={selectedWorkflow.priority} 
                    size="small" 
                    color={getPriorityColor(selectedWorkflow.priority)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip 
                    label={selectedWorkflow.status} 
                    size="small" 
                    color={getStatusColor(selectedWorkflow.status)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Frequency</Typography>
                  <Typography variant="body2">{selectedWorkflow.frequency}</Typography>
                </Grid>
              </Grid>

              {selectedWorkflow.checklist_items && selectedWorkflow.checklist_items.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Checklist Items
                  </Typography>
                  <List>
                    {selectedWorkflow.checklist_items.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircleIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.name || `Item ${index + 1}`}
                          secondary={item.description}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {selectedWorkflow.safety_requirements && selectedWorkflow.safety_requirements.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Safety Requirements
                  </Typography>
                  <List>
                    {selectedWorkflow.safety_requirements.map((requirement, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={requirement} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewWorkflowDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}