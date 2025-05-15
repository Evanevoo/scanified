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
  Stack
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useThemeContext } from '../context/ThemeContext';
import UserManagement from './UserManagement';

const themeColors = [
  { name: 'Blue', value: 'blue-600' },
  { name: 'Emerald', value: 'emerald-500' },
  { name: 'Purple', value: 'purple-600' },
  { name: 'Rose', value: 'rose-500' },
  { name: 'Amber', value: 'amber-500' },
];

const colorMap = {
  'blue-600': '#2563eb',
  'emerald-500': '#10b981',
  'purple-600': '#7c3aed',
  'rose-500': '#f43f5e',
  'amber-500': '#f59e42',
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

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordSnackbar, setPasswordSnackbar] = useState(false);

  // Import Customers Page Theme
  const [importCustomersTheme, setImportCustomersTheme] = useState(localStorage.getItem('importCustomersTheme') || 'system');

  // Notifications
  const [notifications, setNotifications] = useState(
    JSON.parse(localStorage.getItem('notifications')) || {
      email: true,
      inApp: true,
    }
  );
  const [notifMsg, setNotifMsg] = useState('');
  const [notifSnackbar, setNotifSnackbar] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setEmail(user?.email || '');
  }, [profile, user]);

  // Import Customers Theme effect
  useEffect(() => {
    localStorage.setItem('importCustomersTheme', importCustomersTheme);
  }, [importCustomersTheme]);

  // Profile update
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    if (!error) {
      setProfileMsg('Profile updated!');
      setProfileSnackbar(true);
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
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setPasswordMsg('Password updated!');
      setPasswordSnackbar(true);
    } else {
      setPasswordMsg(error.message);
      setPasswordSnackbar(true);
    }
  };

  // Theme update
  const handleThemeChange = (t) => setMode(t);
  const handleColorChange = (c) => setAccent(c);

  // Notifications update
  const handleNotifChange = (type) => {
    const updated = { ...notifications, [type]: !notifications[type] };
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
    setNotifMsg('Preferences saved!');
    setNotifSnackbar(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box maxWidth={600} mx="auto" mt={8}>
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
          {profile?.role === 'admin' && <Tab label="User Management" />}
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
            <Button type="submit" variant="contained" color="primary" sx={{ mt: 2, width: 120 }}>
              Save
            </Button>
            <Snackbar open={profileSnackbar} autoHideDuration={3000} onClose={() => setProfileSnackbar(false)}>
              <Alert onClose={() => setProfileSnackbar(false)} severity={profileMsg === 'Profile updated!' ? 'success' : 'error'} sx={{ width: '100%' }}>
                {profileMsg}
              </Alert>
            </Snackbar>
          </Box>
        )}
        {/* Security Tab */}
        {activeTab === 1 && (
          <Box component="form" onSubmit={handlePasswordSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="New Password"
              type="password"
              variant="outlined"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              fullWidth
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
              <Alert onClose={() => setPasswordSnackbar(false)} severity={passwordMsg === 'Password updated!' ? 'success' : 'error'} sx={{ width: '100%' }}>
                {passwordMsg}
              </Alert>
            </Snackbar>
          </Box>
        )}
        {/* Appearance Tab */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
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
            <FormControl fullWidth>
              <InputLabel>Import Customers Page Theme</InputLabel>
              <Select
                value={importCustomersTheme}
                label="Import Customers Page Theme"
                onChange={e => setImportCustomersTheme(e.target.value)}
              >
                <MenuItem value="system">System/Global</MenuItem>
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Typography variant="subtitle1" mb={1}>Accent Color</Typography>
              <Stack direction="row" spacing={2}>
                {themeColors.map(tc => (
                  <IconButton
                    key={tc.value}
                    onClick={() => handleColorChange(tc.value)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: accent === tc.value ? `3px solid #fff` : '2px solid #ccc',
                      background: colorMap[tc.value],
                      boxShadow: accent === tc.value ? '0 0 0 4px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {accent === tc.value && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    )}
                  </IconButton>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">Your accent color is used for highlights, buttons, and tabs.</Typography>
            </Box>
          </Box>
        )}
        {/* Notifications Tab */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControlLabel
              control={<Switch checked={notifications.email} onChange={() => handleNotifChange('email')} color="primary" />}
              label="Email Notifications"
            />
            <FormControlLabel
              control={<Switch checked={notifications.inApp} onChange={() => handleNotifChange('inApp')} color="primary" />}
              label="In-App Notifications"
            />
            <Snackbar open={notifSnackbar} autoHideDuration={3000} onClose={() => setNotifSnackbar(false)}>
              <Alert onClose={() => setNotifSnackbar(false)} severity="success" sx={{ width: '100%' }}>
                {notifMsg}
              </Alert>
            </Snackbar>
          </Box>
        )}
        {/* User Management Tab (Admins Only) */}
        {profile?.role === 'admin' && activeTab === 4 && (
          <Box sx={{ mt: 2 }}>
            <UserManagement />
          </Box>
        )}
      </Paper>
    </Box>
  );
} 