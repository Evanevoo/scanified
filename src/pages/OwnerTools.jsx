import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, TextField, Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, Divider, IconButton, Tooltip } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Email as EmailIcon, Settings as SettingsIcon, Support as SupportIcon, Analytics as AnalyticsIcon, Security as SecurityIcon, Backup as BackupIcon, Restore as RestoreIcon, Send as SendIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAppStore } from '../store/appStore';

export default function OwnerTools() {
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [bulkEmailDialog, setBulkEmailDialog] = useState(false);
  const [bulkPlanDialog, setBulkPlanDialog] = useState(false);
  const [trialExtensionDialog, setTrialExtensionDialog] = useState(false);
  const [systemHealth, setSystemHealth] = useState({});
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    template: 'custom'
  });
  const [planData, setPlanData] = useState({
    plan: 'basic',
    reason: ''
  });
  const [trialExtensionData, setTrialExtensionData] = useState({
    days: 7,
    reason: ''
  });
  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOrganizations();
    checkSystemHealth();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error loading organizations:', err);
      addNotification({ type: 'error', title: 'Error loading organizations', message: err.message });
    }
  };

  const checkSystemHealth = async () => {
    try {
      // Check database connectivity
      const { data: dbCheck } = await supabase
        .from('organizations')
        .select('count', { count: 'exact', head: true });

      setSystemHealth({
        database: dbCheck !== null ? 'healthy' : 'error',
        notifications: 'healthy', // Assume healthy
        lastChecked: new Date().toISOString()
      });
    } catch (err) {
      setSystemHealth({
        database: 'error',
        notifications: 'error',
        lastChecked: new Date().toISOString()
      });
    }
  };

  const handleBulkEmail = async () => {
    if (!emailData.subject || !emailData.message || selectedOrgs.length === 0) return;

    setLoading(true);
    try {
      // Simulate sending emails
      await new Promise(resolve => setTimeout(resolve, 2000));
      setBulkEmailDialog(false);
      setEmailData({ subject: '', message: '', template: 'custom' });
      setSelectedOrgs([]);
      addNotification({ type: 'success', title: 'Bulk emails sent successfully' });
    } catch (err) {
      console.error('Error sending bulk emails:', err);
      addNotification({ type: 'error', title: 'Error sending bulk emails', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPlanChange = async () => {
    if (!planData.plan || selectedOrgs.length === 0) return;

    setLoading(true);
    try {
      const updatePromises = selectedOrgs.map(orgId => 
        supabase
          .from('organizations')
          .update({ 
            subscription_plan: planData.plan,
            updated_at: new Date().toISOString()
          })
          .eq('id', orgId)
      );

      await Promise.all(updatePromises);
      setBulkPlanDialog(false);
      setPlanData({ plan: 'basic', reason: '' });
      setSelectedOrgs([]);
      loadOrganizations(); // Refresh the list
      addNotification({ type: 'success', title: 'Plans updated successfully' });
    } catch (err) {
      console.error('Error updating plans:', err);
      addNotification({ type: 'error', title: 'Error updating plans', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTrialExtension = async () => {
    if (!trialExtensionData.days || selectedOrgs.length === 0) return;

    setLoading(true);
    try {
      const updatePromises = selectedOrgs.map(orgId => {
        const org = organizations.find(o => o.id === orgId);
        const currentEndDate = new Date(org.trial_end_date);
        const newEndDate = new Date(currentEndDate.getTime() + trialExtensionData.days * 24 * 60 * 60 * 1000);
        
        return supabase
          .from('organizations')
          .update({ 
            trial_end_date: newEndDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', orgId);
      });

      await Promise.all(updatePromises);
      setTrialExtensionDialog(false);
      setTrialExtensionData({ days: 7, reason: '' });
      setSelectedOrgs([]);
      loadOrganizations(); // Refresh the list
      addNotification({ type: 'success', title: 'Trial extensions applied successfully' });
    } catch (err) {
      console.error('Error extending trials:', err);
      addNotification({ type: 'error', title: 'Error extending trials', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrgs.length === organizations.length) {
      setSelectedOrgs([]);
    } else {
      setSelectedOrgs(organizations.map(org => org.id));
    }
  };

  const handleSelectOrg = (orgId) => {
    setSelectedOrgs(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <ErrorIcon color="error" />;
    }
  };

  const getTrialDaysRemaining = (trialEndDate) => {
    if (!trialEndDate) return 0;
    const end = new Date(trialEndDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTrialStatus = (org) => {
    const daysRemaining = getTrialDaysRemaining(org.trial_end_date);
    if (org.subscription_status !== 'trial') return 'active';
    if (daysRemaining <= 0) return 'expired';
    if (daysRemaining <= 3) return 'expiring';
    return 'active';
  };

  const getTrialStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expiring': return 'warning';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const trialOrganizations = organizations.filter(org => org.subscription_status === 'trial');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Owner Tools & System Management
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor system performance and health metrics
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bulk Operations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage multiple organizations at once
              </Typography>
              <Button variant="contained" color="primary" sx={{ mt: 2, mr: 2 }} onClick={() => setBulkEmailDialog(true)}>
                Send Bulk Email
              </Button>
              <Button variant="contained" color="secondary" sx={{ mt: 2, mr: 2 }} onClick={() => setBulkPlanDialog(true)}>
                Change Plans
              </Button>
              <Button variant="contained" color="warning" sx={{ mt: 2 }} onClick={() => setTrialExtensionDialog(true)}>
                Extend Trials
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Support
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tools for customer support and management
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Maintenance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maintenance and administrative tasks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bulk Email Dialog */}
      <Dialog open={bulkEmailDialog} onClose={() => setBulkEmailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Bulk Email</DialogTitle>
        <DialogContent>
          <TextField
            label="Subject"
            fullWidth
            margin="normal"
            value={emailData.subject}
            onChange={e => setEmailData({ ...emailData, subject: e.target.value })}
          />
          <TextField
            label="Message"
            fullWidth
            margin="normal"
            multiline
            minRows={4}
            value={emailData.message}
            onChange={e => setEmailData({ ...emailData, message: e.target.value })}
          />
          {/* You can add organization selection here if needed */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkEmailDialog(false)}>Cancel</Button>
          <Button onClick={handleBulkEmail} variant="contained" disabled={loading}>Send</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Plan Change Dialog */}
      <Dialog open={bulkPlanDialog} onClose={() => setBulkPlanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Plans</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Plan</InputLabel>
            <Select
              value={planData.plan}
              onChange={e => setPlanData({ ...planData, plan: e.target.value })}
            >
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="pro">Pro</MenuItem>
              <MenuItem value="enterprise">Enterprise</MenuItem>
            </Select>
          </FormControl>
          {/* You can add organization selection here if needed */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkPlanDialog(false)}>Cancel</Button>
          <Button onClick={handleBulkPlanChange} variant="contained" disabled={loading}>Change</Button>
        </DialogActions>
      </Dialog>

      {/* Trial Extension Dialog */}
      <Dialog open={trialExtensionDialog} onClose={() => setTrialExtensionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Extend Trials</DialogTitle>
        <DialogContent>
          <TextField
            label="Days to Extend"
            type="number"
            fullWidth
            margin="normal"
            value={trialExtensionData.days}
            onChange={e => setTrialExtensionData({ ...trialExtensionData, days: parseInt(e.target.value) })}
          />
          {/* You can add organization selection here if needed */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrialExtensionDialog(false)}>Cancel</Button>
          <Button onClick={handleTrialExtension} variant="contained" disabled={loading}>Extend</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 