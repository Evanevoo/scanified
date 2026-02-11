import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import logger from '../utils/logger';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Refresh as RefreshIcon,
  CloudDownload as CloudDownloadIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

export default function TenantBackupRestore() {
  const { profile, organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [backupHistory, setBackupHistory] = useState([]);
  const [availableBackups, setAvailableBackups] = useState([]);
  const [message, setMessage] = useState(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreDate, setRestoreDate] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';

  useEffect(() => {
    if (isAdmin && organization?.id) {
      loadBackupHistory();
      loadAvailableBackups();
    }
  }, [isAdmin, organization]);

  const loadBackupHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .or(`backup_type.eq.daily_tenant,backup_type.eq.restore`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setBackupHistory(data || []);
    } catch (error) {
      logger.error('Error loading backup history:', error);
      setMessage({ type: 'error', text: `Failed to load backup history: ${error.message}` });
    }
  };

  const loadAvailableBackups = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      // List backup folders for this organization
      const { data: folders, error } = await supabase.storage
        .from('backups')
        .list(`tenant-backups/${organization.id}`, {
          limit: 100,
          sortBy: { column: 'name', order: 'desc' }
        });

      if (error) throw error;

      // Process folders to get backup dates
      const backups = (folders || [])
        .filter(folder => folder.name && /^\d{4}-\d{2}-\d{2}$/.test(folder.name))
        .map(folder => ({
          date: folder.name,
          path: `tenant-backups/${organization.id}/${folder.name}`,
          created_at: folder.created_at
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      setAvailableBackups(backups);
    } catch (error) {
      logger.error('Error loading available backups:', error);
      setMessage({ type: 'error', text: `Failed to load backups: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const triggerManualBackup = async () => {
    if (!organization?.id) {
      setMessage({ type: 'error', text: 'No organization found' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Call the daily tenant backup function
      const response = await fetch('/.netlify/functions/daily-tenant-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Backup failed');
      }

      setMessage({ 
        type: 'success', 
        text: `Backup completed successfully! ${result.summary?.total_records || 0} records backed up.` 
      });

      // Reload backup history
      setTimeout(() => {
        loadBackupHistory();
        loadAvailableBackups();
      }, 2000);

    } catch (error) {
      logger.error('Backup error:', error);
      setMessage({ type: 'error', text: `Backup failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreDate || !organization?.id) {
      setMessage({ type: 'error', text: 'Please select a backup date' });
      return;
    }

    setRestoring(true);
    setMessage(null);

    try {
      const response = await fetch('/.netlify/functions/restore-tenant-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organization_id: organization.id,
          backup_date: restoreDate,
          dry_run: dryRun
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Restore failed');
      }

      if (dryRun) {
        setMessage({ 
          type: 'info', 
          text: `Dry run completed: Would restore ${result.summary?.total_records_restored || 0} records. Review the results before proceeding with actual restore.` 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: `Restore completed successfully! ${result.summary?.total_records_restored || 0} records restored.` 
        });
        setRestoreDialogOpen(false);
        // Reload data
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }

      // Reload backup history
      loadBackupHistory();

    } catch (error) {
      logger.error('Restore error:', error);
      setMessage({ type: 'error', text: `Restore failed: ${error.message}` });
    } finally {
      setRestoring(false);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          You must be an administrator to access backup and restore features.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
        <BackupIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Tenant Backup & Restore
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage daily backups and restore tenant data in case of data loss.
      </Typography>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Backup Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <BackupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Backup Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <BackupIcon />}
                  onClick={triggerManualBackup}
                  disabled={loading}
                  size="large"
                  fullWidth
                >
                  {loading ? 'Creating Backup...' : 'Create Manual Backup'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadAvailableBackups}
                  disabled={loading}
                  fullWidth
                >
                  Refresh Backup List
                </Button>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Automatic Backups:</strong> Daily backups run automatically at 2 AM UTC.
                  Manual backups can be created at any time.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Restore Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <RestoreIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Restore Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<RestoreIcon />}
                  onClick={() => setRestoreDialogOpen(true)}
                  disabled={availableBackups.length === 0}
                  size="large"
                  fullWidth
                >
                  Restore from Backup
                </Button>

                {availableBackups.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    No backups available. Create a backup first.
                  </Alert>
                )}
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>⚠️ Warning:</strong> Restoring will replace all current data with backup data.
                  Always test with dry run first!
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Available Backups */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Available Backups
                </Typography>
                <Tooltip title="Refresh backup list">
                  <IconButton onClick={loadAvailableBackups} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : availableBackups.length === 0 ? (
                <Alert severity="info">
                  No backups found. Create a backup to get started.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Backup Date</strong></TableCell>
                        <TableCell><strong>Created</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {availableBackups.map((backup) => (
                        <TableRow key={backup.date}>
                          <TableCell>
                            <Typography variant="body1" fontWeight={600}>
                              {backup.date}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {backup.created_at 
                              ? new Date(backup.created_at).toLocaleString()
                              : 'Unknown'
                            }
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<RestoreIcon />}
                              onClick={() => {
                                setRestoreDate(backup.date);
                                setRestoreDialogOpen(true);
                              }}
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
        </Grid>

        {/* Backup History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Backup History
              </Typography>

              {backupHistory.length === 0 ? (
                <Alert severity="info">No backup history available.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Records</strong></TableCell>
                        <TableCell><strong>Size</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backupHistory.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Chip 
                              label={log.backup_type === 'restore' ? 'Restore' : 'Backup'} 
                              size="small"
                              color={log.backup_type === 'restore' ? 'warning' : 'primary'}
                            />
                          </TableCell>
                          <TableCell>
                            {log.status === 'completed' ? (
                              <Chip 
                                icon={<CheckCircleIcon />} 
                                label="Success" 
                                color="success" 
                                size="small"
                              />
                            ) : log.status === 'failed' ? (
                              <Chip 
                                icon={<ErrorIcon />} 
                                label="Failed" 
                                color="error" 
                                size="small"
                              />
                            ) : (
                              <Chip 
                                label={log.status} 
                                color="warning" 
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell>{log.records_backed_up?.toLocaleString() || 0}</TableCell>
                          <TableCell>
                            {log.backup_size 
                              ? `${(log.backup_size / 1024 / 1024).toFixed(2)} MB`
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Restore Dialog */}
      <Dialog 
        open={restoreDialogOpen} 
        onClose={() => !restoring && setRestoreDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
          Restore Tenant Data
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <strong>⚠️ Warning:</strong> This will replace all current data with data from the backup.
            This action cannot be undone!
          </Alert>

          <TextField
            label="Backup Date"
            value={restoreDate}
            onChange={(e) => setRestoreDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            fullWidth
            margin="normal"
            helperText="Select the date of the backup to restore from"
            InputLabelProps={{ shrink: true }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                color="primary"
              />
            }
            label="Dry Run (Validate only, don't restore)"
            sx={{ mt: 2 }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Recommended:</strong> Always run a dry run first to validate the backup
              before performing the actual restore.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRestoreDialogOpen(false)} 
            disabled={restoring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            variant="contained"
            color="warning"
            disabled={!restoreDate || restoring}
            startIcon={restoring ? <CircularProgress size={20} /> : <RestoreIcon />}
          >
            {restoring 
              ? (dryRun ? 'Validating...' : 'Restoring...')
              : (dryRun ? 'Validate Backup' : 'Restore Data')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

