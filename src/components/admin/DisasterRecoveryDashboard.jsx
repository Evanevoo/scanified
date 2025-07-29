import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Alert,
  AlertTitle,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Badge,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Computer as ComputerIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { 
  disasterRecovery, 
  createEmergencyBackup, 
  getRecoveryStatus, 
  restoreFromBackup,
  initializeDisasterRecovery 
} from '../../utils/disasterRecovery';

const DisasterRecoveryDashboard = () => {
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState({ open: false, backup: null });
  const [healthCheckInterval, setHealthCheckInterval] = useState(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({});

  useEffect(() => {
    loadRecoveryStatus();
    startHealthMonitoring();
    
    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, []);

  const loadRecoveryStatus = async () => {
    try {
      setLoading(true);
      const status = await getRecoveryStatus();
      setRecoveryStatus(status);
      setBackupHistory(status.availableBackups || []);
      
      // Initialize if not already done
      if (!status.isInitialized) {
        await initializeDisasterRecovery();
        const updatedStatus = await getRecoveryStatus();
        setRecoveryStatus(updatedStatus);
      }
    } catch (error) {
      console.error('Failed to load recovery status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startHealthMonitoring = () => {
    const interval = setInterval(async () => {
      try {
        const status = await getRecoveryStatus();
        setRecoveryStatus(status);
        
        // Update system metrics
        setSystemMetrics({
          uptime: Math.floor((Date.now() - (status.healthCheck?.timestamp ? new Date(status.healthCheck.timestamp).getTime() : Date.now())) / 1000),
          lastHealthCheck: status.healthCheck?.timestamp,
          backupCount: status.availableBackups?.length || 0,
          systemHealth: status.healthCheck?.overall || 'unknown'
        });
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
    
    setHealthCheckInterval(interval);
  };

  const handleCreateBackup = async () => {
    try {
      setBackupInProgress(true);
      const backup = await createEmergencyBackup();
      
      // Refresh status
      await loadRecoveryStatus();
      
      alert(`✅ Backup created successfully!\n\nBackup ID: ${backup.id}\nTables: ${Object.keys(backup.tables).length}\nTotal Records: ${Object.values(backup.tables).reduce((sum, table) => sum + table.records, 0)}`);
    } catch (error) {
      console.error('Backup failed:', error);
      alert(`❌ Backup failed: ${error.message}`);
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestoreBackup = async (backupId, options = {}) => {
    try {
      setLoading(true);
      const result = await restoreFromBackup(backupId, options);
      
      if (result.status === 'cancelled') {
        alert('Restore operation cancelled');
        return;
      }
      
      const successCount = Object.values(result.tablesRestored).filter(t => t.status === 'completed').length;
      const errorCount = result.errors?.length || 0;
      
      alert(`✅ Restore completed!\n\nTables restored: ${successCount}\nErrors: ${errorCount}\nStatus: ${result.status}`);
      
      // Refresh status
      await loadRecoveryStatus();
    } catch (error) {
      console.error('Restore failed:', error);
      alert(`❌ Restore failed: ${error.message}`);
    } finally {
      setLoading(false);
      setRestoreDialog({ open: false, backup: null });
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !recoveryStatus) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Disaster Recovery Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <SecurityIcon fontSize="large" />
        Disaster Recovery Dashboard
        <Tooltip title="Refresh Status">
          <IconButton onClick={loadRecoveryStatus} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Typography>

      {/* System Health Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                {getHealthIcon(recoveryStatus?.healthCheck?.overall)}
                <Box>
                  <Typography variant="h6">System Health</Typography>
                  <Chip 
                    label={recoveryStatus?.healthCheck?.overall || 'Unknown'}
                    color={getHealthColor(recoveryStatus?.healthCheck?.overall)}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <BackupIcon />
                <Box>
                  <Typography variant="h6">Backups</Typography>
                  <Typography variant="h4" color="primary">
                    {recoveryStatus?.availableBackups?.length || 0}
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
                <StorageIcon />
                <Box>
                  <Typography variant="h6">Database</Typography>
                  <Chip 
                    label={recoveryStatus?.healthCheck?.database || 'Unknown'}
                    color={getHealthColor(recoveryStatus?.healthCheck?.database)}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CloudIcon />
                <Box>
                  <Typography variant="h6">Storage</Typography>
                  <Chip 
                    label={recoveryStatus?.healthCheck?.storage || 'Unknown'}
                    color={getHealthColor(recoveryStatus?.healthCheck?.storage)}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Critical Alerts */}
      {recoveryStatus?.healthCheck?.overall !== 'healthy' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>System Health Warning</AlertTitle>
          <Typography>
            The disaster recovery system has detected issues that require attention:
          </Typography>
          <List dense>
            {recoveryStatus?.backupStatus?.issues?.map((issue, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <WarningIcon color="warning" />
                </ListItemIcon>
                <ListItemText primary={issue} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                startIcon={<BackupIcon />}
                onClick={handleCreateBackup}
                disabled={backupInProgress}
              >
                {backupInProgress ? 'Creating Backup...' : 'Create Emergency Backup'}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={loadRecoveryStatus}
                disabled={loading}
              >
                Run Health Check
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => alert('Backup configuration will be available in the next update')}
              >
                Configure Backups
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backup History
          </Typography>
          {backupHistory.length === 0 ? (
            <Alert severity="info">
              No backups found. Create your first backup to get started.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Backup ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Tables</TableCell>
                    <TableCell>Records</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backupHistory.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {backup.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={backup.type || 'manual'} 
                          size="small"
                          color={backup.type === 'emergency' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(backup.timestamp)}</TableCell>
                      <TableCell>{Object.keys(backup.tables || {}).length}</TableCell>
                      <TableCell>
                        {Object.values(backup.tables || {}).reduce((sum, table) => sum + (table.records || 0), 0)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={backup.status || 'unknown'}
                          color={backup.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<RestoreIcon />}
                          onClick={() => setRestoreDialog({ open: true, backup })}
                          disabled={backup.status !== 'completed'}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* System Details */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">System Details & Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Recovery Objectives
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Recovery Time Objective (RTO)" 
                    secondary="4 hours maximum downtime"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Recovery Point Objective (RPO)" 
                    secondary="15 minutes maximum data loss"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Backup Retention" 
                    secondary="30 days for automated backups"
                  />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Storage Locations
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText primary="Primary Database" secondary="Supabase PostgreSQL" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ComputerIcon />
                  </ListItemIcon>
                  <ListItemText primary="Local Storage" secondary="Browser localStorage & IndexedDB" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CloudIcon />
                  </ListItemIcon>
                  <ListItemText primary="Cloud Storage" secondary="AWS S3, Google Cloud (planned)" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Restore Dialog */}
      <Dialog 
        open={restoreDialog.open} 
        onClose={() => setRestoreDialog({ open: false, backup: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Restore from Backup
        </DialogTitle>
        <DialogContent>
          {restoreDialog.backup && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>⚠️ Destructive Operation</AlertTitle>
                This will overwrite existing data in your database. This action cannot be undone.
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                Backup Details
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Backup ID" 
                    secondary={restoreDialog.backup.id}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Created" 
                    secondary={formatDateTime(restoreDialog.backup.timestamp)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Tables" 
                    secondary={Object.keys(restoreDialog.backup.tables || {}).join(', ')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Total Records" 
                    secondary={Object.values(restoreDialog.backup.tables || {}).reduce((sum, table) => sum + (table.records || 0), 0)}
                  />
                </ListItem>
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, backup: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleRestoreBackup(restoreDialog.backup.id, { dryRun: true })}
            color="info"
          >
            Dry Run
          </Button>
          <Button 
            onClick={() => handleRestoreBackup(restoreDialog.backup.id, { clearExisting: true })}
            color="error"
            variant="contained"
          >
            Restore (Overwrite)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {backupInProgress && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Creating Emergency Backup...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This may take a few minutes depending on your data size
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default DisasterRecoveryDashboard; 