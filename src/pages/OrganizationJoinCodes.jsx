import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert, CircularProgress,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip, FormControl, InputLabel, Select,
  MenuItem, Divider, Container
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Code as CodeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  CleaningServices as CleanupIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function OrganizationJoinCodes() {
  const { user, profile, organization } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState([]);
  const [creating, setCreating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create code dialog
  const [createDialog, setCreateDialog] = useState({
    open: false,
    expiresHours: 24,
    maxUses: 1,
    notes: '',
    assignedRole: 'user'
  });

  useEffect(() => {
    if (organization) {
      console.log('🏢 Organization ID:', organization.id);
      console.log('🏢 Organization Details:', organization);
      fetchJoinCodes();
    }
  }, [organization]);

  const fetchJoinCodes = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching join codes for organization:', organization.id);
      
      // Call the PostgreSQL function to get join codes
      const { data, error } = await supabase
        .rpc('get_organization_join_codes', {
          p_organization_id: organization.id
        });

      console.log('🔍 Fetch join codes response:', { data, error });
      
      if (error) throw error;
      
      console.log('✅ Found', data?.length || 0, 'join codes');
      setCodes(data || []);
      
      // Also check the raw table data for debugging
      const { data: rawData, error: rawError } = await supabase
        .from('organization_join_codes')
        .select('*')
        .eq('organization_id', organization.id);
        
      console.log('🔍 Raw table data check:', { rawData, rawError });
      
    } catch (err) {
      console.error('Error fetching join codes:', err);
      setError('Failed to load join codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      console.log('🎯 Creating join code with params:', {
        p_organization_id: organization.id,
        p_created_by: user.id,
        p_expires_hours: createDialog.expiresHours,
        p_max_uses: createDialog.maxUses,
        p_notes: createDialog.notes || null
      });

      const { data, error } = await supabase
        .rpc('create_organization_join_code', {
          p_organization_id: organization.id,
          p_created_by: user.id,
          p_expires_hours: createDialog.expiresHours,
          p_max_uses: createDialog.maxUses,
          p_notes: createDialog.notes || null,
          p_assigned_role: createDialog.assignedRole
        });

      console.log('🎯 RPC Response:', { data, error });

      if (error) throw error;

      console.log('✅ Code creation successful, raw data:', data);
      
      if (!data || data.length === 0) {
        throw new Error('No data returned from code creation function');
      }

      const newCode = data[0];
      console.log('✅ New code details:', newCode);
      
      if (!newCode.join_code) {
        throw new Error('Code creation function did not return a join_code field');
      }
      
      setSuccess(`Join code ${newCode.join_code} created successfully! Role: ${newCode.assigned_role || 'user'}. It expires at ${new Date(newCode.expires_at).toLocaleString()}`);
      setCreateDialog({ open: false, expiresHours: 24, maxUses: 1, notes: '', assignedRole: 'user' });
      
      // Refresh the codes list
      console.log('🔄 Refreshing codes list...');
      await fetchJoinCodes();

      // Copy code to clipboard automatically
      navigator.clipboard.writeText(newCode.join_code);
      console.log('📋 Code copied to clipboard:', newCode.join_code);

    } catch (err) {
      console.error('Error creating join code:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setSuccess(`Code ${code} copied to clipboard!`);
    } catch (err) {
      setError('Failed to copy code to clipboard');
    }
  };

  const handleDeactivateCode = async (codeId) => {
    try {
      const { error } = await supabase
        .from('organization_join_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (error) throw error;

      setSuccess('Join code deactivated successfully');
      await fetchJoinCodes();
    } catch (err) {
      console.error('Error deactivating code:', err);
      setError('Failed to deactivate join code');
    }
  };

  const handleCleanupCodes = async () => {
    setCleaning(true);
    setError('');
    setSuccess('');

    try {
      console.log('🧹 Cleaning up old join codes...');
      
      const { data, error } = await supabase
        .rpc('admin_cleanup_join_codes', {
          p_organization_id: organization.id,
          p_days_old: 7 // Remove codes older than 7 days
        });

      if (error) throw error;

      const result = data[0];
      if (result.deleted_count > 0) {
        setSuccess(`Cleanup complete! Removed ${result.deleted_count} old join codes.`);
      } else {
        setSuccess('No old codes to clean up.');
      }
      
      await fetchJoinCodes();
    } catch (err) {
      console.error('Error cleaning up codes:', err);
      setError('Failed to cleanup old codes');
    } finally {
      setCleaning(false);
    }
  };

  const getCodeStatus = (code) => {
    const now = new Date();
    const expiresAt = new Date(code.expires_at);
    
    if (!code.is_active) {
      return { label: 'Inactive', color: 'default' };
    }
    
    if (expiresAt < now) {
      return { label: 'Expired', color: 'error' };
    }
    
    if (code.current_uses >= code.max_uses) {
      return { label: 'Used Up', color: 'warning' };
    }
    
    return { label: 'Active', color: 'success' };
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Organization Join Codes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate secure, one-time numeric codes for users to join your organization.
        </Typography>
      </Box>

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

      {/* Action Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Active Join Codes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {codes.filter(c => c.is_active && new Date(c.expires_at) > new Date()).length} active codes
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchJoinCodes}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<CleanupIcon />}
                onClick={handleCleanupCodes}
                disabled={cleaning}
                color="warning"
              >
                {cleaning ? 'Cleaning...' : 'Cleanup Old'}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog({ ...createDialog, open: true })}
              >
                Generate Code
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Join Codes Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Usage</TableCell>
                  <TableCell>Time Remaining</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No join codes created yet. Generate your first code to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((code) => {
                    const status = getCodeStatus(code);
                    return (
                      <TableRow key={code.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" component="code" sx={{ 
                              fontFamily: 'monospace',
                              bgcolor: 'grey.100',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1
                            }}>
                              {code.code}
                            </Typography>
                            <Tooltip title="Copy code">
                              <IconButton 
                                size="small" 
                                onClick={() => handleCopyCode(code.code)}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={status.label} 
                            color={status.color} 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={code.assigned_role || 'user'} 
                            color={
                              code.assigned_role === 'admin' ? 'error' :
                              code.assigned_role === 'manager' ? 'warning' : 'default'
                            }
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PeopleIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {code.current_uses} / {code.max_uses}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TimeIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {formatTimeRemaining(code.expires_at)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {code.used_at ? new Date(code.used_at).toLocaleDateString() : '-'}
                          </Typography>
                          {code.used_at && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(code.used_at).toLocaleTimeString()}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {code.created_by_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(code.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }}>
                            {code.notes || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {code.is_active && (
                            <Tooltip title="Deactivate code">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeactivateCode(code.id)}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Code Dialog */}
      <Dialog 
        open={createDialog.open} 
        onClose={() => setCreateDialog({ ...createDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Join Code</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Expires In</InputLabel>
                  <Select
                    value={createDialog.expiresHours}
                    onChange={(e) => setCreateDialog({ 
                      ...createDialog, 
                      expiresHours: e.target.value 
                    })}
                    label="Expires In"
                  >
                    <MenuItem value={1}>1 Hour</MenuItem>
                    <MenuItem value={6}>6 Hours</MenuItem>
                    <MenuItem value={12}>12 Hours</MenuItem>
                    <MenuItem value={24}>24 Hours (1 Day)</MenuItem>
                    <MenuItem value={72}>72 Hours (3 Days)</MenuItem>
                    <MenuItem value={168}>1 Week</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Max Uses</InputLabel>
                  <Select
                    value={createDialog.maxUses}
                    onChange={(e) => setCreateDialog({ 
                      ...createDialog, 
                      maxUses: e.target.value 
                    })}
                    label="Max Uses"
                  >
                    <MenuItem value={1}>Single Use</MenuItem>
                    <MenuItem value={3}>3 Uses</MenuItem>
                    <MenuItem value={5}>5 Uses</MenuItem>
                    <MenuItem value={10}>10 Uses</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Assigned Role</InputLabel>
                  <Select
                    value={createDialog.assignedRole}
                    onChange={(e) => setCreateDialog({ 
                      ...createDialog, 
                      assignedRole: e.target.value 
                    })}
                    label="Assigned Role"
                  >
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes (Optional)"
                  multiline
                  rows={2}
                  value={createDialog.notes}
                  onChange={(e) => setCreateDialog({ 
                    ...createDialog, 
                    notes: e.target.value 
                  })}
                  placeholder="e.g., For new employee John Smith"
                />
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Security Note:</strong> The generated code will be automatically copied to your clipboard. 
                Share it securely with the intended user and ensure they use it promptly.
                <br /><br />
                <strong>Auto-deactivation:</strong> Single-use codes are automatically deactivated after successful use. 
                Inactive and expired codes are automatically cleaned up after 30 days.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog({ ...createDialog, open: false })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateCode}
            disabled={creating}
            startIcon={creating ? <CircularProgress size={20} /> : <CodeIcon />}
          >
            {creating ? 'Generating...' : 'Generate Code'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* How to Use Section */}
      <Card sx={{ mt: 3, bgcolor: 'info.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How to Use Join Codes
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="h6" color="primary">1.</Typography>
                <Box>
                  <Typography variant="subtitle2">Generate Code</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click "Generate Code" to create a secure 6-digit code
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="h6" color="primary">2.</Typography>
                <Box>
                  <Typography variant="subtitle2">Share Securely</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Share the code with your new team member privately
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="h6" color="primary">3.</Typography>
                <Box>
                  <Typography variant="subtitle2">User Joins</Typography>
                  <Typography variant="body2" color="text.secondary">
                    User enters the code at /connect-organization to join
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}
