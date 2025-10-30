import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Chip, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Divider, Snackbar, Accordion, AccordionSummary, AccordionDetails, Badge
} from '@mui/material';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function AuditLog() {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedLog, setSelectedLog] = useState(null);
  const [logDetailDialog, setLogDetailDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchAuditLogs();
    fetchOrganizations();
    fetchUsers();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // In a real implementation, you'd have an audit_logs table
      // For now, we'll simulate audit logs with mock data
      const mockAuditLogs = [
        {
          id: 1,
          user_id: 'user1',
          user_email: 'admin@company1.com',
          organization_id: 'org1',
          organization_name: 'Company One',
          action: 'login',
          action_type: 'security',
          details: { ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0...' },
          severity: 'info',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          id: 2,
          user_id: 'user2',
          user_email: 'manager@company2.com',
          organization_id: 'org2',
          organization_name: 'Company Two',
          action: 'create_customer',
          action_type: 'data',
          details: { customer_name: 'John Doe', customer_id: 'cust123' },
          severity: 'info',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        {
          id: 3,
          user_id: 'user3',
          user_email: 'user@company3.com',
          organization_id: 'org3',
          organization_name: 'Company Three',
          action: 'failed_login',
          action_type: 'security',
          details: { reason: 'Invalid password', attempts: 3 },
          severity: 'warning',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          id: 4,
          user_id: 'owner',
          user_email: 'owner@platform.com',
          organization_id: null,
          organization_name: 'Platform Owner',
          action: 'impersonate_user',
          action_type: 'admin',
          details: { impersonated_user: 'user1@company1.com', reason: 'Support request' },
          severity: 'warning',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          ip_address: '192.168.1.103',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          id: 5,
          user_id: 'user4',
          user_email: 'admin@company4.com',
          organization_id: 'org4',
          organization_name: 'Company Four',
          action: 'delete_customer',
          action_type: 'data',
          details: { customer_name: 'Jane Smith', customer_id: 'cust456' },
          severity: 'error',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          ip_address: '192.168.1.104',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        {
          id: 6,
          user_id: 'system',
          user_email: 'system@platform.com',
          organization_id: null,
          organization_name: 'System',
          action: 'daily_backup',
          action_type: 'system',
          details: { backup_size: '2.5GB', tables_backed_up: 15 },
          severity: 'info',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          ip_address: '127.0.0.1',
          user_agent: 'System/1.0'
        },
        {
          id: 7,
          user_id: 'user5',
          user_email: 'user@company5.com',
          organization_id: 'org5',
          organization_name: 'Company Five',
          action: 'export_data',
          action_type: 'data',
          details: { export_type: 'customers', record_count: 150 },
          severity: 'info',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          ip_address: '192.168.1.105',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          id: 8,
          user_id: 'owner',
          user_email: 'owner@platform.com',
          organization_id: null,
          organization_name: 'Platform Owner',
          action: 'change_plan',
          action_type: 'admin',
          details: { organization: 'Company Six', old_plan: 'basic', new_plan: 'pro' },
          severity: 'info',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          ip_address: '192.168.1.106',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      ];

      setAuditLogs(mockAuditLogs);
    } catch (err) {
      logger.error('Error fetching audit logs:', err);
      setSnackbar({ open: true, message: 'Error loading audit logs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      logger.error('Error fetching organizations:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      logger.error('Error fetching users:', err);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setLogDetailDialog(true);
  };

  const handleDeleteLog = (log) => {
    setLogToDelete(log);
    setDeleteDialog(true);
  };

  const confirmDeleteLog = async () => {
    setLoading(true);
    try {
      // In production, this would delete from the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedLogs = auditLogs.filter(log => log.id !== logToDelete.id);
      setAuditLogs(updatedLogs);
      setDeleteDialog(false);
      setLogToDelete(null);
      setSnackbar({ open: true, message: 'Audit log deleted successfully', severity: 'success' });
    } catch (error) {
      logger.error('Error deleting audit log:', error);
      setSnackbar({ open: true, message: 'Error deleting audit log', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = () => {
    const filteredLogs = getFilteredLogs();
    const csvContent = generateCSV(filteredLogs);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setSnackbar({ open: true, message: 'Audit logs exported successfully', severity: 'success' });
  };

  const generateCSV = (logs) => {
    const headers = ['Timestamp', 'User', 'Organization', 'Action', 'Type', 'Severity', 'IP Address', 'Details'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user_email,
      log.organization_name || 'N/A',
      log.action,
      log.action_type,
      log.severity,
      log.ip_address,
      JSON.stringify(log.details)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const getFilteredLogs = () => {
    return auditLogs.filter(log => {
      const matchesSearch = log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = !selectedAction || log.action === selectedAction;
      const matchesUser = !selectedUser || log.user_id === selectedUser;
      const matchesOrg = !selectedOrg || log.organization_id === selectedOrg;
      
      const matchesDateRange = (!dateRange.start || new Date(log.timestamp) >= new Date(dateRange.start)) &&
                              (!dateRange.end || new Date(log.timestamp) <= new Date(dateRange.end));

      return matchesSearch && matchesAction && matchesUser && matchesOrg && matchesDateRange;
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  const getActionTypeColor = (type) => {
    switch (type) {
      case 'security': return 'error';
      case 'admin': return 'warning';
      case 'data': return 'primary';
      case 'system': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const filteredLogs = getFilteredLogs();

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
        Audit Log
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          This page shows a comprehensive log of all user actions, system events, and administrative activities. 
          All actions are logged for security, compliance, and troubleshooting purposes.
        </Typography>
      </Alert>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search logs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Action Type</InputLabel>
              <Select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                label="Action Type"
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="failed_login">Failed Login</MenuItem>
                <MenuItem value="create_customer">Create Customer</MenuItem>
                <MenuItem value="delete_customer">Delete Customer</MenuItem>
                <MenuItem value="export_data">Export Data</MenuItem>
                <MenuItem value="impersonate_user">Impersonate User</MenuItem>
                <MenuItem value="change_plan">Change Plan</MenuItem>
                <MenuItem value="daily_backup">Daily Backup</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>User</InputLabel>
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                label="User"
              >
                <MenuItem value="">All Users</MenuItem>
                {users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Organization</InputLabel>
              <Select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                label="Organization"
              >
                <MenuItem value="">All Organizations</MenuItem>
                {organizations.map(org => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => {
              setSearchTerm('');
              setSelectedAction('');
              setSelectedUser('');
              setSelectedOrg('');
              setDateRange({ start: '', end: '' });
            }}
          >
            Clear Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAuditLogs}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportLogs}
          >
            Export CSV
          </Button>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Logs
              </Typography>
              <Typography variant="h4" color="primary">
                {filteredLogs.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Events
              </Typography>
              <Typography variant="h4" color="error">
                {filteredLogs.filter(log => log.action_type === 'security').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Admin Actions
              </Typography>
              <Typography variant="h4" color="warning">
                {filteredLogs.filter(log => log.action_type === 'admin').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Operations
              </Typography>
              <Typography variant="h4" color="info">
                {filteredLogs.filter(log => log.action_type === 'data').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Audit Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(log.timestamp)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {log.user_email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {log.organization_name || 'N/A'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {log.action.replace('_', ' ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.action_type}
                    color={getActionTypeColor(log.action_type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getSeverityIcon(log.severity)}
                    label={log.severity}
                    color={getSeverityColor(log.severity)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {log.ip_address}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(log)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete log">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLog(log)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredLogs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No audit logs found matching your criteria
          </Typography>
        </Box>
      )}

      {/* Log Detail Dialog */}
      <Dialog open={logDetailDialog} onClose={() => setLogDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 1 }} />
            Audit Log Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">User</Typography>
                  <Typography variant="body1">{selectedLog.user_email}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Organization</Typography>
                  <Typography variant="body1">{selectedLog.organization_name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Action</Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {selectedLog.action.replace('_', ' ')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body1">{formatDate(selectedLog.timestamp)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">IP Address</Typography>
                  <Typography variant="body1" fontFamily="monospace">{selectedLog.ip_address}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">User Agent</Typography>
                  <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                    {selectedLog.user_agent}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Details</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700} color="error">
            Delete Audit Log
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to delete this audit log entry?
          </Typography>
          {logToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>User:</strong> {logToDelete.user_email}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Action:</strong> {logToDelete.action.replace('_', ' ')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Timestamp:</strong> {formatDate(logToDelete.timestamp)}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This action cannot be undone. The log entry will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteLog}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete Log'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700} color="error">
            Delete Audit Log
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to delete this audit log entry?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Action: {logToDelete?.action} | User: {logToDelete?.user_email}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteLog}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete Log'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
} 