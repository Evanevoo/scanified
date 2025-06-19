import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  Snackbar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Alert,
  Stack,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Badge
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import SaveIcon from '@mui/icons-material/Save';
import { useThemeContext } from '../context/ThemeContext';
import UserManagement from './UserManagement';

const themeColors = [
  { name: 'Blue', value: 'blue-600' },
  { name: 'Emerald', value: 'emerald-500' },
  { name: 'Purple', value: 'purple-600' },
  { name: 'Rose', value: 'rose-500' },
  { name: 'Amber', value: 'amber-500' },
  { name: 'Teal', value: 'teal-500' },
  { name: 'Cyan', value: 'cyan-500' },
  { name: 'Green', value: 'green-500' },
  { name: 'Orange', value: 'orange-500' },
  { name: 'Red', value: 'red-500' },
  { name: 'Pink', value: 'pink-500' },
  { name: 'Indigo', value: 'indigo-500' },
  { name: 'Lime', value: 'lime-500' },
  { name: 'Violet', value: 'violet-600' },
  { name: 'Slate', value: 'slate-500' },
  { name: 'Sky', value: 'sky-500' },
];

const colorMap = {
  'blue-600': '#2563eb',
  'emerald-500': '#10b981',
  'purple-600': '#7c3aed',
  'rose-500': '#f43f5e',
  'amber-500': '#f59e42',
  'teal-500': '#14b8a6',
  'cyan-500': '#06b6d4',
  'green-500': '#22c55e',
  'orange-500': '#f97316',
  'red-500': '#ef4444',
  'pink-500': '#ec4899',
  'indigo-500': '#6366f1',
  'lime-500': '#84cc16',
  'violet-600': '#a21caf',
  'slate-500': '#64748b',
  'sky-500': '#0ea5e9',
};

export default function Settings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { mode, setMode, accent, setAccent } = useThemeContext();
  const [activeTab, setActiveTab] = useState(0);

  // Profile Info
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileSnackbar, setProfileSnackbar] = useState(false);
  const [profileChanged, setProfileChanged] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordSnackbar, setPasswordSnackbar] = useState(false);

  // Import Customers Page Theme
  const [importCustomersTheme, setImportCustomersTheme] = useState(localStorage.getItem('importCustomersTheme') || 'system');
  const [importThemeChanged, setImportThemeChanged] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState(
    JSON.parse(localStorage.getItem('notifications')) || {
      email: true,
      inApp: true,
      browser: false,
      sms: false,
      dailySummary: true,
      alerts: true,
      reports: false,
    }
  );
  const [notificationsChanged, setNotificationsChanged] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const [notifSnackbar, setNotifSnackbar] = useState(false);

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState(
    JSON.parse(localStorage.getItem('securitySettings')) || {
      sessionTimeout: 30,
      twoFactorEnabled: false,
      loginHistory: true,
      passwordRequirements: true,
      accountLockout: true,
      failedAttempts: 5,
    }
  );
  const [securityChanged, setSecurityChanged] = useState(false);

  // Business Logic Settings
  const [businessSettings, setBusinessSettings] = useState(
    JSON.parse(localStorage.getItem('businessSettings')) || {
      defaultScanMode: 'SHIP',
      autoAssignment: false,
      billingPreferences: {
        taxIncluded: true,
        currency: 'USD',
        decimalPlaces: 2,
      },
      customerDefaults: {
        autoGroup: false,
        defaultStatus: 'active',
      },
      reportSettings: {
        autoGenerate: false,
        schedule: 'weekly',
        recipients: [],
      },
    }
  );
  const [businessChanged, setBusinessChanged] = useState(false);

  // Data & Export Settings
  const [dataSettings, setDataSettings] = useState(
    JSON.parse(localStorage.getItem('dataSettings')) || {
      exportFormat: 'CSV',
      backupFrequency: 'weekly',
      retentionDays: 365,
      autoBackup: true,
      includeArchived: false,
    }
  );
  const [dataChanged, setDataChanged] = useState(false);

  // Dialogs
  const [exportDialog, setExportDialog] = useState(false);
  const [backupDialog, setBackupDialog] = useState(false);
  const [securityDialog, setSecurityDialog] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setEmail(user?.email || '');
  }, [profile, user]);

  // Profile update
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    if (!error) {
      setProfileMsg('Profile updated successfully!');
      setProfileSnackbar(true);
      setProfileChanged(false);
    } else {
      setProfileMsg(error.message);
      setProfileSnackbar(true);
    }
  };

  // Password update
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      setPasswordSnackbar(true);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters long.');
      setPasswordSnackbar(true);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setPasswordMsg('Password updated successfully!');
      setPasswordSnackbar(true);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg(error.message);
      setPasswordSnackbar(true);
    }
  };

  // Theme update
  const handleThemeChange = (t) => {
    setMode(t);
    setNotifMsg('Theme updated successfully!');
    setNotifSnackbar(true);
  };

  const handleColorChange = (c) => {
    setAccent(c);
    setNotifMsg('Accent color updated successfully!');
    setNotifSnackbar(true);
  };

  // Import customers theme update
  const handleImportThemeChange = (theme) => {
    setImportCustomersTheme(theme);
    setImportThemeChanged(true);
  };

  const handleImportThemeSave = () => {
    localStorage.setItem('importCustomersTheme', importCustomersTheme);
    setImportThemeChanged(false);
    setNotifMsg('Import page theme saved!');
    setNotifSnackbar(true);
  };

  // Notifications update
  const handleNotifChange = (type) => {
    const updated = { ...notifications, [type]: !notifications[type] };
    setNotifications(updated);
    setNotificationsChanged(true);
  };

  const handleNotificationsSave = () => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
    setNotificationsChanged(false);
    setNotifMsg('Notification preferences saved!');
    setNotifSnackbar(true);
  };

  // Security settings update
  const handleSecurityChange = (key, value) => {
    const updated = { ...securitySettings, [key]: value };
    setSecuritySettings(updated);
    setSecurityChanged(true);
  };

  const handleSecuritySave = () => {
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
    setSecurityChanged(false);
    setNotifMsg('Security settings saved!');
    setNotifSnackbar(true);
  };

  // Business settings update
  const handleBusinessChange = (key, value) => {
    const updated = { ...businessSettings, [key]: value };
    setBusinessSettings(updated);
    setBusinessChanged(true);
  };

  const handleBusinessSave = () => {
    localStorage.setItem('businessSettings', JSON.stringify(businessSettings));
    setBusinessChanged(false);
    setNotifMsg('Business settings saved!');
    setNotifSnackbar(true);
  };

  // Data settings update
  const handleDataChange = (key, value) => {
    const updated = { ...dataSettings, [key]: value };
    setDataSettings(updated);
    setDataChanged(true);
  };

  const handleDataSave = () => {
    localStorage.setItem('dataSettings', JSON.stringify(dataSettings));
    setDataChanged(false);
    setNotifMsg('Data settings saved!');
    setNotifSnackbar(true);
  };

  // Export data
  const handleExportData = async (format) => {
    // This would integrate with your actual data export logic
    console.log(`Exporting data in ${format} format`);
    setExportDialog(false);
    setNotifMsg(`Data exported successfully in ${format} format!`);
    setNotifSnackbar(true);
  };

  // Create backup
  const handleCreateBackup = async () => {
    // This would integrate with your actual backup logic
    console.log('Creating backup...');
    setBackupDialog(false);
    setNotifMsg('Backup created successfully!');
    setNotifSnackbar(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Track profile changes
  useEffect(() => {
    setProfileChanged(fullName !== (profile?.full_name || ''));
  }, [fullName, profile?.full_name]);

  return (
    <Box maxWidth={800} mx="auto" mt={8}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.default' }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <IconButton color="primary" onClick={() => navigate('/dashboard')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={700}>
            Settings
          </Typography>
        </Stack>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
          <Tab label="Profile" />
          <Tab label="Security" />
          <Tab label="Appearance" />
          <Tab label="Notifications" />
          <Tab label="Business Logic" />
          <Tab label="Data & Export" />
          {profile?.role === 'admin' && <Tab label="Admin" />}
        </Tabs>
        
        {/* Profile Tab */}
        {activeTab === 0 && (
          <Box component="form" onSubmit={handleProfileSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full Name"
              variant="outlined"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              variant="outlined"
              value={email}
              disabled
              fullWidth
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              disabled={!profileChanged}
              sx={{ mt: 2, width: 150 }}
            >
              {profileChanged ? 'Save Changes' : 'Saved'}
            </Button>
            <Snackbar open={profileSnackbar} autoHideDuration={3000} onClose={() => setProfileSnackbar(false)}>
              <Alert onClose={() => setProfileSnackbar(false)} severity={profileMsg.includes('successfully') ? 'success' : 'error'} sx={{ width: '100%' }}>
                {profileMsg}
              </Alert>
            </Snackbar>
          </Box>
        )}

        {/* Security Tab */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Session Management</Typography>
                <FormControlLabel
                  control={<Switch checked={securitySettings.loginHistory} onChange={(e) => handleSecurityChange('loginHistory', e.target.checked)} />}
                  label="Track Login History"
                />
                <Box sx={{ mt: 2 }}>
                  <Typography gutterBottom>Session Timeout (minutes)</Typography>
                  <Slider
                    value={securitySettings.sessionTimeout}
                    onChange={(e, value) => handleSecurityChange('sessionTimeout', value)}
                    min={15}
                    max={120}
                    step={15}
                    marks
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Current: {securitySettings.sessionTimeout} minutes
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Password Security</Typography>
                <FormControlLabel
                  control={<Switch checked={securitySettings.passwordRequirements} onChange={(e) => handleSecurityChange('passwordRequirements', e.target.checked)} />}
                  label="Enforce Strong Password Requirements"
                />
                <FormControlLabel
                  control={<Switch checked={securitySettings.accountLockout} onChange={(e) => handleSecurityChange('accountLockout', e.target.checked)} />}
                  label="Account Lockout After Failed Attempts"
                />
                {securitySettings.accountLockout && (
                  <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>Failed Attempts Before Lockout</Typography>
                    <Slider
                      value={securitySettings.failedAttempts}
                      onChange={(e, value) => handleSecurityChange('failedAttempts', value)}
                      min={3}
                      max={10}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>

            <Box component="form" onSubmit={handlePasswordSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6">Change Password</Typography>
              <TextField
                label="New Password"
                type="password"
                variant="outlined"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                fullWidth
                helperText="Password must be at least 6 characters long"
              />
              <TextField
                label="Confirm New Password"
                type="password"
                variant="outlined"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained" color="primary" sx={{ mt: 2, width: 180 }}>
                Change Password
              </Button>
              <Snackbar open={passwordSnackbar} autoHideDuration={3000} onClose={() => setPasswordSnackbar(false)}>
                <Alert onClose={() => setPasswordSnackbar(false)} severity={passwordMsg.includes('successfully') ? 'success' : 'error'} sx={{ width: '100%' }}>
                  {passwordMsg}
                </Alert>
              </Snackbar>
            </Box>

            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              disabled={!securityChanged}
              onClick={handleSecuritySave}
              sx={{ mt: 2, width: 150 }}
            >
              {securityChanged ? 'Save Security Settings' : 'Security Settings Saved'}
            </Button>
          </Box>
        )}

        {/* Appearance Tab */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Theme Settings</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={mode}
                    label="Theme"
                    onChange={e => handleThemeChange(e.target.value)}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Import Customers Page Theme</InputLabel>
                  <Select
                    value={importCustomersTheme}
                    label="Import Customers Page Theme"
                    onChange={e => handleImportThemeChange(e.target.value)}
                  >
                    <MenuItem value="system">System/Global</MenuItem>
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                  </Select>
                </FormControl>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<SaveIcon />}
                  disabled={!importThemeChanged}
                  onClick={handleImportThemeSave}
                  sx={{ width: 200 }}
                >
                  {importThemeChanged ? 'Save Import Theme' : 'Import Theme Saved'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Accent Color</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose your accent color for highlights, buttons, and tabs
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  {themeColors.map(tc => (
                    <Tooltip key={tc.value} title={tc.name}>
                      <IconButton
                        onClick={() => handleColorChange(tc.value)}
                        sx={{
                          width: 50,
                          height: 50,
                          borderRadius: '50%',
                          border: accent === tc.value ? `4px solid #fff` : '2px solid #ccc',
                          background: colorMap[tc.value],
                          boxShadow: accent === tc.value ? '0 0 0 4px rgba(0,0,0,0.2)' : 'none',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                          },
                        }}
                      >
                        {accent === tc.value && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </IconButton>
                    </Tooltip>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Selected: {themeColors.find(tc => tc.value === accent)?.name || 'Blue'}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Notifications Tab */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Notification Channels</Typography>
                <FormControlLabel
                  control={<Switch checked={notifications.email} onChange={() => handleNotifChange('email')} />}
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={<Switch checked={notifications.inApp} onChange={() => handleNotifChange('inApp')} />}
                  label="In-App Notifications"
                />
                <FormControlLabel
                  control={<Switch checked={notifications.browser} onChange={() => handleNotifChange('browser')} />}
                  label="Browser Push Notifications"
                />
                <FormControlLabel
                  control={<Switch checked={notifications.sms} onChange={() => handleNotifChange('sms')} />}
                  label="SMS Notifications"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Notification Types</Typography>
                <FormControlLabel
                  control={<Switch checked={notifications.dailySummary} onChange={() => handleNotifChange('dailySummary')} />}
                  label="Daily Summary Reports"
                />
                <FormControlLabel
                  control={<Switch checked={notifications.alerts} onChange={() => handleNotifChange('alerts')} />}
                  label="Critical Alerts"
                />
                <FormControlLabel
                  control={<Switch checked={notifications.reports} onChange={() => handleNotifChange('reports')} />}
                  label="Weekly/Monthly Reports"
                />
              </CardContent>
            </Card>

            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              disabled={!notificationsChanged}
              onClick={handleNotificationsSave}
              sx={{ width: 200 }}
            >
              {notificationsChanged ? 'Save Notification Settings' : 'Notification Settings Saved'}
            </Button>

            <Snackbar open={notifSnackbar} autoHideDuration={3000} onClose={() => setNotifSnackbar(false)}>
              <Alert onClose={() => setNotifSnackbar(false)} severity="success" sx={{ width: '100%' }}>
                {notifMsg}
              </Alert>
            </Snackbar>
          </Box>
        )}

        {/* Business Logic Tab */}
        {activeTab === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Scan Settings</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Default Scan Mode</InputLabel>
                  <Select
                    value={businessSettings.defaultScanMode}
                    label="Default Scan Mode"
                    onChange={(e) => handleBusinessChange('defaultScanMode', e.target.value)}
                  >
                    <MenuItem value="SHIP">Ship</MenuItem>
                    <MenuItem value="RETURN">Return</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Switch checked={businessSettings.autoAssignment} onChange={(e) => handleBusinessChange('autoAssignment', e.target.checked)} />}
                  label="Auto-assign Cylinders to Customers"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Billing Preferences</Typography>
                <FormControlLabel
                  control={<Switch checked={businessSettings.billingPreferences.taxIncluded} onChange={(e) => handleBusinessChange('billingPreferences', { ...businessSettings.billingPreferences, taxIncluded: e.target.checked })} />}
                  label="Tax Included in Prices"
                />
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={businessSettings.billingPreferences.currency}
                    label="Currency"
                    onChange={(e) => handleBusinessChange('billingPreferences', { ...businessSettings.billingPreferences, currency: e.target.value })}
                  >
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                    <MenuItem value="GBP">GBP (£)</MenuItem>
                    <MenuItem value="CAD">CAD (C$)</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Customer Defaults</Typography>
                <FormControlLabel
                  control={<Switch checked={businessSettings.customerDefaults.autoGroup} onChange={(e) => handleBusinessChange('customerDefaults', { ...businessSettings.customerDefaults, autoGroup: e.target.checked })} />}
                  label="Auto-group Similar Customers"
                />
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Default Customer Status</InputLabel>
                  <Select
                    value={businessSettings.customerDefaults.defaultStatus}
                    label="Default Customer Status"
                    onChange={(e) => handleBusinessChange('customerDefaults', { ...businessSettings.customerDefaults, defaultStatus: e.target.value })}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              disabled={!businessChanged}
              onClick={handleBusinessSave}
              sx={{ width: 200 }}
            >
              {businessChanged ? 'Save Business Settings' : 'Business Settings Saved'}
            </Button>
          </Box>
        )}

        {/* Data & Export Tab */}
        {activeTab === 5 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Export Settings</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Default Export Format</InputLabel>
                  <Select
                    value={dataSettings.exportFormat}
                    label="Default Export Format"
                    onChange={(e) => handleDataChange('exportFormat', e.target.value)}
                  >
                    <MenuItem value="CSV">CSV</MenuItem>
                    <MenuItem value="Excel">Excel</MenuItem>
                    <MenuItem value="PDF">PDF</MenuItem>
                    <MenuItem value="JSON">JSON</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => setExportDialog(true)}
                  fullWidth
                >
                  Export All Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Backup Settings</Typography>
                <FormControlLabel
                  control={<Switch checked={dataSettings.autoBackup} onChange={(e) => handleDataChange('autoBackup', e.target.checked)} />}
                  label="Automatic Backups"
                />
                {dataSettings.autoBackup && (
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Backup Frequency</InputLabel>
                    <Select
                      value={dataSettings.backupFrequency}
                      label="Backup Frequency"
                      onChange={(e) => handleDataChange('backupFrequency', e.target.value)}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                )}
                <Button
                  variant="outlined"
                  onClick={() => setBackupDialog(true)}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Create Manual Backup
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Data Retention</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>Data Retention Period (days)</Typography>
                  <Slider
                    value={dataSettings.retentionDays}
                    onChange={(e, value) => handleDataChange('retentionDays', value)}
                    min={30}
                    max={1095}
                    step={30}
                    marks
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Current: {dataSettings.retentionDays} days
                  </Typography>
                </Box>
                <FormControlLabel
                  control={<Switch checked={dataSettings.includeArchived} onChange={(e) => handleDataChange('includeArchived', e.target.checked)} />}
                  label="Include Archived Records in Exports"
                />
              </CardContent>
            </Card>

            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              disabled={!dataChanged}
              onClick={handleDataSave}
              sx={{ width: 200 }}
            >
              {dataChanged ? 'Save Data Settings' : 'Data Settings Saved'}
            </Button>
          </Box>
        )}

        {/* Admin Tab */}
        {profile?.role === 'admin' && activeTab === 6 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>User Management</Typography>
                <UserManagement />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>System Health</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Database Status</Typography>
                    <Chip label="Healthy" color="success" size="small" />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Last Backup</Typography>
                    <Typography variant="body2">2 hours ago</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Active Users</Typography>
                    <Typography variant="body2">12</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Storage Used</Typography>
                    <Typography variant="body2">2.4 GB / 10 GB</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>System Actions</Typography>
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" color="warning">
                    Clear Cache
                  </Button>
                  <Button variant="outlined" color="error">
                    Reset System
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}
      </Paper>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
        <DialogTitle>Export Data</DialogTitle>
        <DialogContent>
          <Typography>Choose export format:</Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => handleExportData('CSV')}>CSV</Button>
            <Button variant="outlined" onClick={() => handleExportData('Excel')}>Excel</Button>
            <Button variant="outlined" onClick={() => handleExportData('PDF')}>PDF</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog open={backupDialog} onClose={() => setBackupDialog(false)}>
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <Typography>This will create a complete backup of all data. Continue?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateBackup} variant="contained">Create Backup</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 