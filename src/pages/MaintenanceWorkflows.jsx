import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  LinearProgress
} from '@mui/material';
import {
  Build as BuildIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
  Person as AssignIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';

export default function MaintenanceWorkflows() {
  const { profile, organization } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [newWorkflow, setNewWorkflow] = useState({
    asset_id: '',
    type: '',
    priority: 'medium',
    assigned_to: '',
    description: '',
    due_date: ''
  });

  useEffect(() => {
    // Simulate loading workflow data
    setTimeout(() => {
      setWorkflows([
        {
          id: 1,
          asset_id: 'CYL-001',
          type: 'Scheduled Inspection',
          status: 'in_progress',
          priority: 'high',
          assigned_to: 'John Smith',
          created_date: '2024-01-10',
          due_date: '2024-01-15',
          completion: 60,
          description: 'Monthly safety inspection',
          steps: [
            { id: 1, name: 'Visual Inspection', status: 'completed' },
            { id: 2, name: 'Pressure Test', status: 'in_progress' },
            { id: 3, name: 'Documentation', status: 'pending' },
            { id: 4, name: 'Final Approval', status: 'pending' }
          ]
        },
        {
          id: 2,
          asset_id: 'CYL-002',
          type: 'Repair',
          status: 'pending',
          priority: 'medium',
          assigned_to: 'Jane Doe',
          created_date: '2024-01-12',
          due_date: '2024-01-20',
          completion: 0,
          description: 'Valve replacement required',
          steps: [
            { id: 1, name: 'Diagnosis', status: 'pending' },
            { id: 2, name: 'Parts Ordering', status: 'pending' },
            { id: 3, name: 'Repair Work', status: 'pending' },
            { id: 4, name: 'Quality Check', status: 'pending' }
          ]
        },
        {
          id: 3,
          asset_id: 'CYL-003',
          type: 'Preventive Maintenance',
          status: 'completed',
          priority: 'low',
          assigned_to: 'Mike Johnson',
          created_date: '2024-01-05',
          due_date: '2024-01-10',
          completion: 100,
          description: 'Regular maintenance cycle',
          steps: [
            { id: 1, name: 'Cleaning', status: 'completed' },
            { id: 2, name: 'Lubrication', status: 'completed' },
            { id: 3, name: 'Calibration', status: 'completed' },
            { id: 4, name: 'Documentation', status: 'completed' }
          ]
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
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

  const handleAddWorkflow = () => {
    const newId = Math.max(...workflows.map(w => w.id), 0) + 1;
    setWorkflows([...workflows, {
      ...newWorkflow,
      id: newId,
      status: 'pending',
      created_date: new Date().toISOString().split('T')[0],
      completion: 0,
      steps: [
        { id: 1, name: 'Initial Assessment', status: 'pending' },
        { id: 2, name: 'Work Execution', status: 'pending' },
        { id: 3, name: 'Quality Check', status: 'pending' },
        { id: 4, name: 'Final Documentation', status: 'pending' }
      ]
    }]);
    setNewWorkflow({
      asset_id: '',
      type: '',
      priority: 'medium',
      assigned_to: '',
      description: '',
      due_date: ''
    });
    setAddDialog(false);
  };

  const assetName = isReady ? terms.asset : 'Asset';
  const assetsName = isReady ? terms.assets : 'Assets';

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Maintenance Workflows
        </Typography>
        <Typography>Loading workflow data...</Typography>
      </Box>
    );
  }

  const pendingCount = workflows.filter(w => w.status === 'pending').length;
  const inProgressCount = workflows.filter(w => w.status === 'in_progress').length;
  const completedCount = workflows.filter(w => w.status === 'completed').length;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Maintenance Workflows
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Manage maintenance tasks and workflows for your {assetsName.toLowerCase()}
      </Typography>

      {/* Workflow Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ScheduleIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {pendingCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Tasks
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <BuildIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {inProgressCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CompleteIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {completedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box>
                  <Typography variant="h4">
                    {workflows.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Workflows
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialog(true)}
        >
          Create Workflow
        </Button>
        <Button
          variant="outlined"
          startIcon={<ScheduleIcon />}
        >
          Schedule Maintenance
        </Button>
      </Box>

      {/* Workflows Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{assetName} ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>{workflow.asset_id}</TableCell>
                  <TableCell>{workflow.type}</TableCell>
                  <TableCell>
                    <Chip
                      label={workflow.status.replace('_', ' ')}
                      color={getStatusColor(workflow.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={workflow.priority}
                      color={getPriorityColor(workflow.priority)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{workflow.assigned_to}</TableCell>
                  <TableCell>{workflow.due_date}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress
                        variant="determinate"
                        value={workflow.completion}
                        sx={{ width: 60, height: 6 }}
                      />
                      <Typography variant="caption">
                        {workflow.completion}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        setSelectedWorkflow(workflow);
                        setDetailDialog(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Workflow Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Maintenance Workflow</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`${assetName} ID`}
                value={newWorkflow.asset_id}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, asset_id: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Maintenance Type</InputLabel>
                <Select
                  value={newWorkflow.type}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, type: e.target.value })}
                  label="Maintenance Type"
                >
                  <MenuItem value="Scheduled Inspection">Scheduled Inspection</MenuItem>
                  <MenuItem value="Preventive Maintenance">Preventive Maintenance</MenuItem>
                  <MenuItem value="Repair">Repair</MenuItem>
                  <MenuItem value="Emergency Maintenance">Emergency Maintenance</MenuItem>
                  <MenuItem value="Calibration">Calibration</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newWorkflow.priority}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assigned To"
                value={newWorkflow.assigned_to}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, assigned_to: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={newWorkflow.due_date}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddWorkflow} variant="contained">
            Create Workflow
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workflow Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Workflow Details - {selectedWorkflow?.asset_id}
        </DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedWorkflow.type}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {selectedWorkflow.description}
              </Typography>
              
              <Stepper orientation="vertical">
                {selectedWorkflow.steps.map((step) => (
                  <Step key={step.id} active={step.status !== 'pending'} completed={step.status === 'completed'}>
                    <StepLabel>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>{step.name}</Typography>
                        <Chip 
                          label={step.status} 
                          size="small" 
                          color={getStatusColor(step.status)} 
                        />
                      </Box>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          <Button variant="contained">Update Progress</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}