import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Backup as BackupIcon,
  CloudDownload as DownloadIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

export default function BackupDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [scheduleActive, setScheduleActive] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) {
      loadBackupData();
    }
  }, [profile?.organization_id]);

  const loadBackupData = async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    try {
      // Get backup status
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_backup_status');

      if (statusError) throw statusError;

      const orgStatus = statusData?.find(s => s.organization_id === profile.organization_id);
      setBackupStatus(orgStatus);

      // Get backup history
      const { data: historyData, error: historyError } = await supabase
        .rpc('get_organization_backup_history', { 
          org_id: profile.organization_id,
          days_back: 30 
        });

      if (historyError) throw historyError;
      setBackupHistory(historyData || []);

      // Get schedule status
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('backup_schedules')
        .select('is_active')
        .eq('organization_id', profile.organization_id)
        .eq('schedule_type', 'daily')
        .single();

      if (!scheduleError && scheduleData) {
        setScheduleActive(scheduleData.is_active);
      }

    } catch (error) {
      console.error('Error loading backup data:', error);
      setMessage({ type: 'error', text: `Error loading backup data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const createManualBackup = async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .rpc('create_organization_backup', {
          org_id: profile.organization_id,
          backup_type_param: 'manual'
        });

      if (error) throw error;

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Backup created successfully! ${data.customers_count} customers, ${data.bottles_count} bottles backed up.` 
        });
        loadBackupData(); // Refresh data
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Backup error:', error);
      setMessage({ 
        type: 'error', 
        text: `Backup failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backupDate) => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('organization_backups')
        .select('backup_data')
        .eq('organization_id', profile.organization_id)
        .eq('backup_date', backupDate)
        .single();

      if (error) throw error;

      if (data?.backup_data) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data.backup_data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${backupDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: 'Backup downloaded successfully!' });
      }

    } catch (error) {
      console.error('Download error:', error);
      setMessage({ type: 'error', text: `Download failed: ${error.message}` });
    }
  };

  const toggleSchedule = async (active) => {
    if (!profile?.organization_id) return;

    try {
      const { error } = await supabase
        .from('backup_schedules')
        .upsert({
          organization_id: profile.organization_id,
          schedule_type: 'daily',
          is_active: active,
          schedule_time: '02:00:00'
        });

      if (error) throw error;

      setScheduleActive(active);
      setMessage({ 
        type: 'success', 
        text: `Daily backups ${active ? 'enabled' : 'disabled'} successfully!` 
      });

    } catch (error) {
      console.error('Schedule error:', error);
      setMessage({ type: 'error', text: `Schedule update failed: ${error.message}` });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <SuccessIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'pending': return <CircularProgress size={20} />;
      default: return <WarningIcon color="warning" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} color="primary" mb={3}>
        <BackupIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Backup Dashboard
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      {/* Backup Status Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Last Backup
              </Typography>
              {backupStatus ? (
                <>
                  <Typography variant="h4" color="primary">
                    {backupStatus.days_since_backup || 0} days ago
                  </Typography>
                  <Chip 
                    label={backupStatus.last_backup_status || 'Never'} 
                    color={getStatusColor(backupStatus.last_backup_status)}
                    size="small"
                  />
                </>
              ) : (
                <Typography color="text.secondary">No backups found</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Size
              </Typography>
              <Typography variant="h4" color="primary">
                {backupStatus?.customers_count || 0}
              </Typography>
              <Typography color="text.secondary">
                Customers ({(backupStatus?.backup_size_mb || 0).toFixed(2)} MB)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schedule Status
              </Typography>
              <Typography variant="h4" color={scheduleActive ? 'success.main' : 'warning.main'}>
                {scheduleActive ? 'Active' : 'Disabled'}
              </Typography>
              <Typography color="text.secondary">
                Daily at 2:00 AM UTC
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<BackupIcon />}
          onClick={createManualBackup}
          disabled={loading}
        >
          Create Backup Now
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<ScheduleIcon />}
          onClick={() => setScheduleDialog(true)}
        >
          Schedule Settings
        </Button>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadBackupData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Backup History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backup History (Last 30 Days)
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Customers</TableCell>
                  <TableCell>Size (MB)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backupHistory.map((backup, index) => (
                  <TableRow key={index}>
                    <TableCell>{backup.backup_date}</TableCell>
                    <TableCell>
                      <Chip label={backup.backup_type} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(backup.backup_status)}
                        {backup.backup_status}
                      </Box>
                    </TableCell>
                    <TableCell>{backup.customers_count}</TableCell>
                    <TableCell>{(backup.backup_size_mb || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {backup.backup_status === 'completed' && (
                        <IconButton
                          onClick={() => downloadBackup(backup.backup_date)}
                          size="small"
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {backupHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No backup history found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Schedule Settings Dialog */}
      <Dialog open={scheduleDialog} onClose={() => setScheduleDialog(false)}>
        <DialogTitle>Backup Schedule Settings</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={scheduleActive}
                onChange={(e) => setScheduleActive(e.target.checked)}
              />
            }
            label="Enable Daily Automatic Backups"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            When enabled, your organization's data will be automatically backed up every day at 2:00 AM UTC.
            Backups are kept for 30 days and then automatically cleaned up.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              toggleSchedule(scheduleActive);
              setScheduleDialog(false);
            }}
            variant="contained"
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
