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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Grid,
  Card,
  CardContent,
  Tooltip,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import ThemeSelector from '../components/ThemeSelector';
import SaveIcon from '@mui/icons-material/Save';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SettingsIcon from '@mui/icons-material/Settings';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useTheme } from '../context/ThemeContext';
import UserManagement from './UserManagement';
import { usePermissions } from '../context/PermissionsContext';

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

// Predefined barcode types for easy selection
const barcodeTypes = {
  'code128': {
    name: 'Code 128',
    pattern: '^[A-Za-z0-9\\-_]{1,48}$',
    description: 'Alphanumeric, up to 48 characters',
    example: 'ABC123-DEF456'
  },
  'code39': {
    name: 'Code 39',
    pattern: '^[A-Z0-9\\-\\.\\$\\/\\+\\%\\*\\s]{1,43}$',
    description: 'Uppercase letters, numbers, and special chars',
    example: 'ABC-123'
  },
  'ean13': {
    name: 'EAN-13',
    pattern: '^[0-9]{13}$',
    description: '13 digits (standard product barcodes)',
    example: '1234567890123'
  },
  'ean8': {
    name: 'EAN-8',
    pattern: '^[0-9]{8}$',
    description: '8 digits (short product barcodes)',
    example: '12345678'
  },
  'upc': {
    name: 'UPC-A',
    pattern: '^[0-9]{12}$',
    description: '12 digits (US product barcodes)',
    example: '123456789012'
  },
  'qr': {
    name: 'QR Code',
    pattern: '^.{1,2953}$',
    description: 'Any characters, up to 2953 chars',
    example: 'https://example.com/asset/123'
  },
  'datamatrix': {
    name: 'Data Matrix',
    pattern: '^.{1,2335}$',
    description: 'Any characters, up to 2335 chars',
    example: 'ASSET:CYL001:2024'
  },
  'alphanumeric': {
    name: 'Alphanumeric',
    pattern: '^[A-Z0-9]{4,20}$',
    description: 'Uppercase letters and numbers, 4-20 chars',
    example: 'CYL123456'
  },
  'numeric': {
    name: 'Numeric Only',
    pattern: '^[0-9]{4,15}$',
    description: 'Numbers only, 4-15 digits',
    example: '1234567890'
  },
  'custom': {
    name: 'Custom Pattern',
    pattern: '^[A-Z0-9]{6,12}$',
    description: 'Define your own regex pattern',
    example: 'ABC123456'
  }
};

const orderNumberTypes = {
  'ord_numeric': {
    name: 'ORD + Numbers',
    pattern: '^ORD[0-9]{4,8}$',
    description: 'ORD followed by 4-8 digits',
    prefix: 'ORD',
    example: 'ORD123456'
  },
  'po_numeric': {
    name: 'PO + Numbers',
    pattern: '^PO[0-9]{4,8}$',
    description: 'PO followed by 4-8 digits',
    prefix: 'PO',
    example: 'PO123456'
  },
  'del_numeric': {
    name: 'DEL + Numbers',
    pattern: '^DEL[0-9]{4,8}$',
    description: 'DEL followed by 4-8 digits',
    prefix: 'DEL',
    example: 'DEL123456'
  },
  'year_sequence': {
    name: 'Year + Sequence',
    pattern: '^[0-9]{4}-[0-9]{4,6}$',
    description: 'YYYY-NNNNNN format',
    prefix: '',
    example: '2024-001234'
  },
  'alphanumeric_order': {
    name: 'Alphanumeric',
    pattern: '^[A-Z0-9]{6,15}$',
    description: 'Letters and numbers, 6-15 chars',
    prefix: '',
    example: 'ORDER12345'
  },
  'custom': {
    name: 'Custom Pattern',
    pattern: '^ORD[0-9]{6}$',
    description: 'Define your own pattern',
    prefix: 'ORD',
    example: 'ORD123456'
  }
};

const serialNumberTypes = {
  'letter_number': {
    name: 'Letters + Numbers',
    pattern: '^[A-Z]{2}[0-9]{6,10}$',
    description: '2 letters followed by 6-10 digits',
    example: 'AB1234567890'
  },
  'manufacturer_serial': {
    name: 'Manufacturer Style',
    pattern: '^[A-Z]{3}-[0-9]{4}-[0-9]{4}$',
    description: 'XXX-YYYY-ZZZZ format',
    example: 'ABC-1234-5678'
  },
  'year_serial': {
    name: 'Year + Serial',
    pattern: '^[0-9]{4}[A-Z]{2}[0-9]{6}$',
    description: 'YYYYAANNNNNN format',
    example: '2024AB123456'
  },
  'simple_numeric': {
    name: 'Numeric Serial',
    pattern: '^[0-9]{8,15}$',
    description: '8-15 digit serial number',
    example: '123456789012'
  },
  'hex_style': {
    name: 'Hexadecimal Style',
    pattern: '^[A-F0-9]{8,16}$',
    description: 'Hexadecimal characters, 8-16 chars',
    example: 'A1B2C3D4E5F6'
  },
  'custom': {
    name: 'Custom Pattern',
    pattern: '^[A-Z]{2}[0-9]{8}$',
    description: 'Define your own pattern',
    example: 'AB12345678'
  }
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const { user, profile, organization, reloadOrganization } = useAuth();
  const { isOrgAdmin } = usePermissions();
  const navigate = useNavigate();
  const { mode, setMode, accent, setAccent } = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [assetConfigLoading, setAssetConfigLoading] = useState(false);
  const [barcodeConfigLoading, setBarcodeConfigLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Messages
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [assetConfigMsg, setAssetConfigMsg] = useState('');
  const [barcodeConfigMsg, setBarcodeConfigMsg] = useState('');
  const [logoMsg, setLogoMsg] = useState('');

  // Snackbars
  const [profileSnackbar, setProfileSnackbar] = useState(false);
  const [passwordSnackbar, setPasswordSnackbar] = useState(false);
  const [notifSnackbar, setNotifSnackbar] = useState(false);

  // Profile Data
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    email: user?.email || ''
  });
  const [profileChanged, setProfileChanged] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  // Asset Configuration
  const [assetConfig, setAssetConfig] = useState({
    assetType: 'cylinder',
    assetDisplayName: '',
    assetDisplayNamePlural: '',
    appName: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
  });
  const [assetConfigChanged, setAssetConfigChanged] = useState(false);

  // Barcode Format Configuration
  const [barcodeConfig, setBarcodeConfig] = useState({
    barcodeType: 'custom', // New field for predefined types
    barcodePattern: '^[A-Z0-9]{6,12}$',
    barcodeDescription: '6-12 alphanumeric characters',
    orderNumberType: 'custom', // New field for order number types
    orderNumberPattern: '^ORD[0-9]{6}$',
    orderNumberDescription: 'ORD followed by 6 digits',
    orderNumberPrefix: 'ORD',
    serialNumberType: 'custom', // New field for serial number types
    serialNumberPattern: '^[A-Z]{2}[0-9]{8}$',
    serialNumberDescription: '2 letters followed by 8 digits',
  });
  const [barcodeConfigChanged, setBarcodeConfigChanged] = useState(false);

  // User Invites
  const [invites, setInvites] = useState([]);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'user' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [copiedToken, setCopiedToken] = useState('');

  // Logo
  const [logoUrl, setLogoUrl] = useState(organization?.logo_url || '');

  // Tab configuration based on user role
  const getTabsConfig = () => {
    const baseTabs = [
      { label: 'Profile', icon: <AccountCircleIcon />, id: 'profile' },
      { label: 'Security', icon: <SecurityIcon />, id: 'security' },
      { label: 'Appearance', icon: <BusinessIcon />, id: 'appearance' },
      { label: 'Notifications', icon: <NotificationsIcon />, id: 'notifications' },
      { label: 'Billing', icon: <PaymentIcon />, id: 'billing' },
    ];

    const adminTabs = [];
    if (profile?.role === 'admin' || profile?.role === 'owner') {
      adminTabs.push(
        { label: 'Team', icon: <PeopleIcon />, id: 'team' },
        { label: 'Invites', icon: <EmailIcon />, id: 'invites' },
        { label: 'Assets', icon: <DataUsageIcon />, id: 'assets' },
        { label: 'Barcodes', icon: <QrCodeIcon />, id: 'barcodes' }
      );
    }

    return [...baseTabs, ...adminTabs];
  };

  const tabsConfig = getTabsConfig();

  // Initialize data
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: user?.email || ''
      });
    }
    
    if (organization) {
      setAssetConfig({
        assetType: organization.asset_type || 'cylinder',
        assetDisplayName: organization.asset_display_name || 'Gas Cylinder',
        assetDisplayNamePlural: organization.asset_display_name_plural || 'Gas Cylinders',
        appName: organization.app_name || 'Scanified',
        primaryColor: organization.primary_color || '#2563eb',
        secondaryColor: organization.secondary_color || '#1e40af',
        appIcon: organization.app_icon || '/landing-icon.png',
        showAppIcon: organization.show_app_icon !== undefined ? organization.show_app_icon : true,
      });
      
      // Load barcode config from organization
      const detectBarcodeType = (pattern) => {
        for (const [key, type] of Object.entries(barcodeTypes)) {
          if (type.pattern === pattern) return key;
        }
        return 'custom';
      };

      const detectOrderNumberType = (pattern) => {
        for (const [key, type] of Object.entries(orderNumberTypes)) {
          if (type.pattern === pattern) return key;
        }
        return 'custom';
      };

      const detectSerialNumberType = (pattern) => {
        for (const [key, type] of Object.entries(serialNumberTypes)) {
          if (type.pattern === pattern) return key;
        }
        return 'custom';
      };

      setBarcodeConfig({
        barcodeType: organization.barcode_type || detectBarcodeType(organization.barcode_pattern || '^[A-Z0-9]{6,12}$'),
        barcodePattern: organization.barcode_pattern || '^[A-Z0-9]{6,12}$',
        barcodeDescription: organization.barcode_description || '6-12 alphanumeric characters',
        orderNumberType: organization.order_number_type || detectOrderNumberType(organization.order_number_pattern || '^ORD[0-9]{6}$'),
        orderNumberPattern: organization.order_number_pattern || '^ORD[0-9]{6}$',
        orderNumberDescription: organization.order_number_description || 'ORD followed by 6 digits',
        orderNumberPrefix: organization.order_number_prefix || 'ORD',
        serialNumberType: organization.serial_number_type || detectSerialNumberType(organization.serial_number_pattern || '^[A-Z]{2}[0-9]{8}$'),
        serialNumberPattern: organization.serial_number_pattern || '^[A-Z]{2}[0-9]{8}$',
        serialNumberDescription: organization.serial_number_description || '2 letters followed by 8 digits',
      });
      
      setLogoUrl(organization.logo_url || '');
    }
  }, [profile, user, organization]);

  useEffect(() => {
    if (profile?.role === 'owner' || profile?.role === 'admin') {
      fetchInvites();
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    setProfileChanged(
      profileData.full_name !== (profile?.full_name || '')
    );
  }, [profileData, profile]);

  useEffect(() => {
    setAssetConfigChanged(
      assetConfig.assetType !== (organization?.asset_type || 'cylinder') ||
      assetConfig.assetDisplayName !== (organization?.asset_display_name || '') ||
      assetConfig.assetDisplayNamePlural !== (organization?.asset_display_name_plural || '') ||
      assetConfig.appName !== (organization?.app_name || '') ||
      assetConfig.primaryColor !== (organization?.primary_color || '#2563eb') ||
      assetConfig.secondaryColor !== (organization?.secondary_color || '#1e40af')
    );
  }, [assetConfig, organization]);

  useEffect(() => {
    setBarcodeConfigChanged(
      barcodeConfig.barcodePattern !== (organization?.barcode_pattern || '^[A-Z0-9]{6,12}$') ||
      barcodeConfig.barcodeDescription !== (organization?.barcode_description || '6-12 alphanumeric characters') ||
      barcodeConfig.orderNumberPattern !== (organization?.order_number_pattern || '^ORD[0-9]{6}$') ||
      barcodeConfig.orderNumberDescription !== (organization?.order_number_description || 'ORD followed by 6 digits') ||
      barcodeConfig.orderNumberPrefix !== (organization?.order_number_prefix || 'ORD') ||
      barcodeConfig.serialNumberPattern !== (organization?.serial_number_pattern || '^[A-Z]{2}[0-9]{8}$') ||
      barcodeConfig.serialNumberDescription !== (organization?.serial_number_description || '2 letters followed by 8 digits')
    );
  }, [barcodeConfig, organization]);

  // Profile update
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: profileData.full_name
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfileMsg('Profile updated successfully!');
      setProfileChanged(false);
      
      // Reload auth context to get updated profile
      if (reloadOrganization) {
        await reloadOrganization();
      }
    } catch (error) {
      setProfileMsg('Error updating profile: ' + error.message);
    } finally {
      setProfileLoading(false);
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
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setPasswordMsg('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordMsg(error.message);
    } finally {
      setPasswordSnackbar(true);
    }
  };

  // Theme and color updates - save to database
  const handleThemeChange = async (newMode) => {
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
    
    // Save to database
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme_mode: newMode })
        .eq('id', user.id);
      
      if (!error) {
        setNotifMsg('Theme updated successfully!');
        setNotifSnackbar(true);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const handleColorChange = async (newColor) => {
    setAccent(newColor);
    localStorage.setItem('themeAccent', newColor);
    
    // Save to database
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme_accent: newColor })
        .eq('id', user.id);
      
      if (!error) {
        setNotifMsg('Accent color updated successfully!');
        setNotifSnackbar(true);
      }
    } catch (error) {
      console.error('Error saving accent color:', error);
    }
  };

  // Notifications update
  const handleNotifChange = (type) => {
    const updated = { ...notifications, [type]: !notifications[type] };
    setNotifications(updated);
    setNotificationsChanged(true);
  };

  const handleNotificationsSave = async () => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Save to database
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: notifications })
        .eq('id', user.id);
      
      if (!error) {
        setNotificationsChanged(false);
        setNotifMsg('Notification preferences saved!');
        setNotifSnackbar(true);
      }
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  // Security settings update
  const handleSecurityChange = (key, value) => {
    const updated = { ...securitySettings, [key]: value };
    setSecuritySettings(updated);
    setSecurityChanged(true);
  };

  const handleSecuritySave = async () => {
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
    
    // Save to database
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ security_settings: securitySettings })
        .eq('id', user.id);
      
      if (!error) {
        setSecurityChanged(false);
        setNotifMsg('Security settings saved!');
        setNotifSnackbar(true);
      }
    } catch (error) {
      console.error('Error saving security settings:', error);
    }
  };

  // Asset Configuration update
  const handleSaveAssetConfig = async () => {
    setAssetConfigMsg('');
    setAssetConfigLoading(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          asset_type: assetConfig.assetType,
          asset_display_name: assetConfig.assetDisplayName,
          asset_display_name_plural: assetConfig.assetDisplayNamePlural,
          app_name: assetConfig.appName,
          primary_color: assetConfig.primaryColor,
          secondary_color: assetConfig.secondaryColor,
          app_icon: assetConfig.appIcon,
          show_app_icon: assetConfig.showAppIcon,
        })
        .eq('id', profile.organization_id);

      if (error) throw error;
      
      setAssetConfigMsg('Asset configuration updated successfully!');
      setAssetConfigChanged(false);
      
      // Reload organization context
      if (reloadOrganization) {
        await reloadOrganization();
      }
    } catch (error) {
      console.error('Error saving asset config:', error);
      setAssetConfigMsg('Error saving asset configuration: ' + error.message);
    } finally {
      setAssetConfigLoading(false);
    }
  };

  // Barcode type change handlers
  const handleBarcodeTypeChange = (type) => {
    const selectedType = barcodeTypes[type];
    setBarcodeConfig(prev => ({
      ...prev,
      barcodeType: type,
      barcodePattern: selectedType.pattern,
      barcodeDescription: selectedType.description
    }));
  };

  const handleOrderNumberTypeChange = (type) => {
    const selectedType = orderNumberTypes[type];
    setBarcodeConfig(prev => ({
      ...prev,
      orderNumberType: type,
      orderNumberPattern: selectedType.pattern,
      orderNumberDescription: selectedType.description,
      orderNumberPrefix: selectedType.prefix
    }));
  };

  const handleSerialNumberTypeChange = (type) => {
    const selectedType = serialNumberTypes[type];
    setBarcodeConfig(prev => ({
      ...prev,
      serialNumberType: type,
      serialNumberPattern: selectedType.pattern,
      serialNumberDescription: selectedType.description
    }));
  };

  // Barcode Configuration update
  const handleSaveBarcodeConfig = async () => {
    setBarcodeConfigMsg('');
    setBarcodeConfigLoading(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          barcode_type: barcodeConfig.barcodeType,
          barcode_pattern: barcodeConfig.barcodePattern,
          barcode_description: barcodeConfig.barcodeDescription,
          order_number_type: barcodeConfig.orderNumberType,
          order_number_pattern: barcodeConfig.orderNumberPattern,
          order_number_description: barcodeConfig.orderNumberDescription,
          order_number_prefix: barcodeConfig.orderNumberPrefix,
          serial_number_type: barcodeConfig.serialNumberType,
          serial_number_pattern: barcodeConfig.serialNumberPattern,
          serial_number_description: barcodeConfig.serialNumberDescription,
        })
        .eq('id', profile.organization_id);

      if (error) throw error;
      
      setBarcodeConfigMsg('Barcode configuration updated successfully!');
      setBarcodeConfigChanged(false);
      
      // Reload organization context
      if (reloadOrganization) {
        await reloadOrganization();
      }
    } catch (error) {
      console.error('Error saving barcode config:', error);
      setBarcodeConfigMsg('Error saving barcode configuration: ' + error.message);
    } finally {
      setBarcodeConfigLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // User Invite Functions
  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_invites')
        .select(`
          *,
          invited_by:profiles!organization_invites_invited_by_fkey(full_name, email)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      setInviteError('Failed to load invites: ' + error.message);
    }
  };

  const handleCreateInvite = async () => {
    if (!newInvite.email || !newInvite.role) {
      setInviteError('Please fill in all fields');
      return;
    }

    setInviteLoading(true);
    setInviteError('');

    try {
      // Create the invite using the database function
      const { data, error } = await supabase.rpc('create_organization_invite', {
        p_organization_id: profile.organization_id,
        p_email: newInvite.email,
        p_role: newInvite.role,
        p_expires_in_days: 7
      });

      if (error) throw error;

      setInviteSuccess(`Invite sent to ${newInvite.email}`);
      setNewInvite({ email: '', role: 'user' });
      setInviteDialog(false);
      fetchInvites();
    } catch (error) {
      console.error('Error creating invite:', error);
      setInviteError(error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      setInviteSuccess('Invite deleted successfully');
      fetchInvites();
    } catch (error) {
      console.error('Error deleting invite:', error);
      setInviteError('Failed to delete invite: ' + error.message);
    }
  };

  const copyInviteLink = (token) => {
    const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(token);
    setInviteSuccess('Invite link copied to clipboard!');
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const getInviteStatus = (invite) => {
    if (invite.accepted_at) {
      return { status: 'accepted', color: 'success', icon: <CheckCircleIcon />, label: 'Accepted' };
    } else if (new Date(invite.expires_at) < new Date()) {
      return { status: 'expired', color: 'error', icon: <WarningIcon />, label: 'Expired' };
    } else {
      return { status: 'pending', color: 'warning', icon: <ScheduleIcon />, label: 'Pending' };
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'error';
      case 'admin': return 'warning';
      case 'manager': return 'info';
      default: return 'default';
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLogoUploading(true);
    setLogoMsg('');
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `org-${organization.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage.from('organization-logos').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Failed to get public URL');
      
      const logoUrlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;
      
      // Save to org
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: logoUrlWithCacheBust })
        .eq('id', organization.id);
      if (updateError) throw updateError;
      
      setLogoUrl(logoUrlWithCacheBust);
      setLogoMsg('Logo updated successfully!');
      
      // Refresh organization context
      if (reloadOrganization) {
        await reloadOrganization();
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      setLogoMsg('Error uploading logo: ' + err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={700} color="primary" sx={{ mb: 1 }}>
            Settings
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Manage your account, organization, and preferences
          </Typography>
        </Box>

        <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            sx={{ 
              borderBottom: '1px solid #e2e8f0',
              px: 3,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 64
              }
            }} 
            variant="scrollable" 
            scrollButtons="auto"
          >
            {tabsConfig.map((tab, index) => (
              <Tab 
                key={tab.id} 
                label={tab.label} 
                icon={tab.icon} 
                iconPosition="start" 
              />
            ))}
          </Tabs>
          
          {/* Profile Tab */}
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h4" gutterBottom>
              Profile Settings
            </Typography>
            
            <ThemeSelector />
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
                Profile Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={profileData.full_name}
                    onChange={(e) => {
                      setProfileData({ ...profileData, full_name: e.target.value });
                    }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profileData.email}
                    disabled
                    variant="outlined"
                    helperText="Contact support to change your email"
                  />
                </Grid>

              </Grid>
              {profileChanged && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleProfileSave}
                    disabled={profileLoading}
                    startIcon={profileLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    Save Changes
                  </Button>
                </Box>
              )}
            </Paper>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={1}>
            <Stack spacing={3}>
              <Box component="form" onSubmit={handlePasswordSave}>
                <Typography variant="h5" gutterBottom>Change Password</Typography>
                <Stack spacing={2}>
                  <TextField
                    type="password"
                    label="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    type="password"
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                  />
                  <Button type="submit" variant="contained" color="primary">
                    Update Password
                  </Button>
                </Stack>
              </Box>
              
              <Divider />
              
              <Box>
                <Typography variant="h5" gutterBottom>Security Preferences</Typography>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={securitySettings.loginHistory} 
                        onChange={(e) => handleSecurityChange('loginHistory', e.target.checked)} 
                      />
                    }
                    label="Track Login History"
                  />
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={securitySettings.twoFactorEnabled} 
                        onChange={(e) => handleSecurityChange('twoFactorEnabled', e.target.checked)} 
                      />
                    }
                    label="Two-Factor Authentication"
                  />
                  <Box>
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
                  {securityChanged && (
                    <Button 
                      variant="contained" 
                      onClick={handleSecuritySave}
                      startIcon={<SaveIcon />}
                    >
                      Save Security Settings
                    </Button>
                  )}
                </Stack>
              </Box>
            </Stack>
          </TabPanel>

          {/* Appearance Tab */}
          <TabPanel value={activeTab} index={2}>
            <Stack spacing={3}>
              <Typography variant="h5" gutterBottom>Appearance Settings</Typography>
              
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={mode}
                  label="Theme"
                  onChange={(e) => handleThemeChange(e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
              
              <Box>
                <Typography variant="h6" mb={2}>Accent Color</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </IconButton>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Your accent color is used for highlights, buttons, and tabs.
                </Typography>
              </Box>

              {isOrgAdmin && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>Organization Logo</Typography>
                  {logoUrl && (
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={logoUrl} 
                        alt="Organization Logo" 
                        style={{ 
                          maxHeight: 64, 
                          maxWidth: 128, 
                          borderRadius: 8, 
                          border: '1px solid #eee' 
                        }} 
                      />
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    component="label"
                    disabled={logoUploading}
                    sx={{ mb: 1 }}
                  >
                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                    <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
                  </Button>
                  {logoMsg && (
                    <Alert severity={logoMsg.includes('Error') ? 'error' : 'success'} sx={{ mt: 1 }}>
                      {logoMsg}
                    </Alert>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Recommended: PNG, JPG, or SVG. Max 1MB.
                  </Typography>
                </Box>
              )}
            </Stack>
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={activeTab} index={3}>
            <Stack spacing={3}>
              <Typography variant="h5" gutterBottom>Notification Preferences</Typography>
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={notifications.email} 
                    onChange={() => handleNotifChange('email')} 
                    color="primary" 
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={notifications.inApp} 
                    onChange={() => handleNotifChange('inApp')} 
                    color="primary" 
                  />
                }
                label="In-App Notifications"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={notifications.sms} 
                    onChange={() => handleNotifChange('sms')} 
                    color="primary" 
                  />
                }
                label="SMS Notifications"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={notifications.dailySummary} 
                    onChange={() => handleNotifChange('dailySummary')} 
                    color="primary" 
                  />
                }
                label="Daily Summary"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={notifications.alerts} 
                    onChange={() => handleNotifChange('alerts')} 
                    color="primary" 
                  />
                }
                label="System Alerts"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={notifications.reports} 
                    onChange={() => handleNotifChange('reports')} 
                    color="primary" 
                  />
                }
                label="Report Notifications"
              />
              
              {notificationsChanged && (
                <Button 
                  variant="contained" 
                  onClick={handleNotificationsSave}
                  startIcon={<SaveIcon />}
                >
                  Save Notification Settings
                </Button>
              )}
            </Stack>
          </TabPanel>

          {/* Billing Tab */}
          <TabPanel value={activeTab} index={4}>
            <Typography variant="h4" gutterBottom>
              Billing Settings
            </Typography>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Subscription & Billing
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Manage your subscription, billing information, and payment methods.
              </Typography>
              <Button variant="outlined" sx={{ mt: 2 }}>
                View Billing Details
              </Button>
            </Paper>
          </TabPanel>

          {/* Team Tab (Admin/Owner only) */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <TabPanel value={activeTab} index={5}>
              <UserManagement />
            </TabPanel>
          )}

          {/* Invites Tab (Admin/Owner only) */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <TabPanel value={activeTab} index={6}>
              <Stack spacing={3}>
                <Typography variant="h4" gutterBottom>
                  User Invites
                </Typography>
                
                {inviteError && (
                  <Alert severity="error" onClose={() => setInviteError('')}>
                    {inviteError}
                  </Alert>
                )}

                {inviteSuccess && (
                  <Alert severity="success" onClose={() => setInviteSuccess('')}>
                    {inviteSuccess}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Pending Invites ({invites.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date()).length})
                  </Typography>
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={fetchInvites}
                      sx={{ mr: 2 }}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setInviteDialog(true)}
                    >
                      Invite User
                    </Button>
                  </Box>
                </Box>

                {invites.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No invites found. Create your first invite to get started.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {invites.map((invite) => {
                      const status = getInviteStatus(invite);
                      return (
                        <Paper key={invite.id} sx={{ p: 2, mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle1">
                                  {invite.email}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  label={invite.role}
                                  color={getRoleColor(invite.role)}
                                  size="small"
                                />
                                <Chip
                                  icon={status.icon}
                                  label={status.label}
                                  color={status.color}
                                  size="small"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  Expires: {new Date(invite.expires_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {status.status === 'pending' && (
                                <>
                                  <Tooltip title="Copy Invite Link">
                                    <IconButton
                                      size="small"
                                      onClick={() => copyInviteLink(invite.token)}
                                      color={copiedToken === invite.token ? 'success' : 'primary'}
                                    >
                                      <ContentCopyIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete Invite">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteInvite(invite.id)}
                                      sx={{ color: 'error.main' }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </Stack>
            </TabPanel>
          )}

          {/* Assets Tab (Admin/Owner only) */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <TabPanel value={activeTab} index={7}>
              <Box sx={{ maxWidth: 800 }}>
                <Typography variant="h4" gutterBottom>
                  Asset Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure what type of assets your organization tracks and customize the app branding.
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>New!</strong> Use our comprehensive Asset Configuration Manager for advanced setup 
                    including custom terminology, feature toggles, and barcode formats.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/asset-configuration')}
                    startIcon={<SettingsIcon />}
                  >
                    Open Advanced Configuration
                  </Button>
                </Alert>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Asset Type
                        </Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Asset Type</InputLabel>
                          <Select
                            value={assetConfig.assetType || 'cylinder'}
                            label="Asset Type"
                            onChange={(e) => setAssetConfig(prev => ({ ...prev, assetType: e.target.value }))}
                          >
                            <MenuItem value="cylinder">Gas Cylinders</MenuItem>
                            <MenuItem value="bottle">Water Bottles</MenuItem>
                            <MenuItem value="extinguisher">Fire Extinguishers</MenuItem>
                            <MenuItem value="equipment">Equipment</MenuItem>
                            <MenuItem value="medical">Medical Devices</MenuItem>
                            <MenuItem value="tool">Tools</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <TextField
                          fullWidth
                          label="Display Name (Singular)"
                          value={assetConfig.assetDisplayName || ''}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, assetDisplayName: e.target.value }))}
                          sx={{ mb: 2 }}
                          placeholder="e.g., Gas Cylinder"
                        />
                        
                        <TextField
                          fullWidth
                          label="Display Name (Plural)"
                          value={assetConfig.assetDisplayNamePlural || ''}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, assetDisplayNamePlural: e.target.value }))}
                          placeholder="e.g., Gas Cylinders"
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          App Branding
                        </Typography>
                        
                        <TextField
                          fullWidth
                          label="App Name"
                          value={assetConfig.appName || ''}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, appName: e.target.value }))}
                          sx={{ mb: 2 }}
                          placeholder="e.g., Scanified"
                        />
                        
                        <TextField
                          fullWidth
                          label="Primary Color"
                          type="color"
                          value={assetConfig.primaryColor || '#2563eb'}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          sx={{ mb: 2 }}
                        />
                        
                        <TextField
                          fullWidth
                          label="Secondary Color"
                          type="color"
                          value={assetConfig.secondaryColor || '#1e40af'}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          sx={{ mb: 2 }}
                        />
                        
                        <TextField
                          fullWidth
                          label="App Icon URL"
                          value={assetConfig.appIcon || ''}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, appIcon: e.target.value }))}
                          sx={{ mb: 2 }}
                          placeholder="e.g., /landing-icon.png"
                          helperText="URL path to your app icon image (recommended: 64x64px)"
                        />
                        
                        <FormControlLabel
                          control={
                            <Switch
                              checked={assetConfig.showAppIcon !== false}
                              onChange={(e) => setAssetConfig(prev => ({ ...prev, showAppIcon: e.target.checked }))}
                            />
                          }
                          label="Show app icon in header"
                          sx={{ mb: 1 }}
                        />
                        
                        {assetConfig.appIcon && assetConfig.showAppIcon !== false && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Icon Preview:
                            </Typography>
                            <img 
                              src={assetConfig.appIcon}
                              alt="App Icon Preview"
                              style={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: 8,
                                objectFit: 'cover',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    {assetConfigChanged && (
                      <Button
                        variant="contained"
                        onClick={handleSaveAssetConfig}
                        disabled={assetConfigLoading}
                        startIcon={assetConfigLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                      >
                        Save Asset Configuration
                      </Button>
                    )}
                    {assetConfigMsg && (
                      <Alert severity={assetConfigMsg.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
                        {assetConfigMsg}
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          )}

          {/* Barcodes Tab (Admin/Owner only) */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <TabPanel value={activeTab} index={8}>
              <Box sx={{ maxWidth: 800 }}>
                <Typography variant="h4" gutterBottom>
                  Barcode Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure barcode formats and validation patterns for your organization.
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Barcode Format
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                              <InputLabel>Barcode Type</InputLabel>
                              <Select
                                value={barcodeConfig.barcodeType || 'custom'}
                                onChange={(e) => handleBarcodeTypeChange(e.target.value)}
                                label="Barcode Type"
                              >
                                {Object.entries(barcodeTypes).map(([key, type]) => (
                                  <MenuItem key={key} value={key}>
                                    <Box>
                                      <Typography variant="body1">{type.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {type.description} - Example: {type.example}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          {barcodeConfig.barcodeType === 'custom' && (
                            <>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Barcode Pattern (Regex)"
                                  value={barcodeConfig.barcodePattern}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, barcodePattern: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="^[A-Z0-9]{6,12}$"
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Barcode Description"
                                  value={barcodeConfig.barcodeDescription}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, barcodeDescription: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="6-12 alphanumeric characters"
                                />
                              </Grid>
                            </>
                          )}
                          {barcodeConfig.barcodeType !== 'custom' && (
                            <Grid item xs={12}>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                  <strong>Selected:</strong> {barcodeTypes[barcodeConfig.barcodeType]?.name}<br/>
                                  <strong>Format:</strong> {barcodeTypes[barcodeConfig.barcodeType]?.description}<br/>
                                  <strong>Example:</strong> {barcodeTypes[barcodeConfig.barcodeType]?.example}
                                </Typography>
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Order Number Format
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                              <InputLabel>Order Number Type</InputLabel>
                              <Select
                                value={barcodeConfig.orderNumberType || 'custom'}
                                onChange={(e) => handleOrderNumberTypeChange(e.target.value)}
                                label="Order Number Type"
                              >
                                {Object.entries(orderNumberTypes).map(([key, type]) => (
                                  <MenuItem key={key} value={key}>
                                    <Box>
                                      <Typography variant="body1">{type.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {type.description} - Example: {type.example}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          {barcodeConfig.orderNumberType === 'custom' && (
                            <>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Order Number Prefix"
                                  value={barcodeConfig.orderNumberPrefix}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, orderNumberPrefix: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="ORD"
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Order Number Pattern (Regex)"
                                  value={barcodeConfig.orderNumberPattern}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, orderNumberPattern: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="^ORD[0-9]{6}$"
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Order Number Description"
                                  value={barcodeConfig.orderNumberDescription}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, orderNumberDescription: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="ORD followed by 6 digits"
                                />
                              </Grid>
                            </>
                          )}
                          {barcodeConfig.orderNumberType !== 'custom' && (
                            <Grid item xs={12}>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                  <strong>Selected:</strong> {orderNumberTypes[barcodeConfig.orderNumberType]?.name}<br/>
                                  <strong>Format:</strong> {orderNumberTypes[barcodeConfig.orderNumberType]?.description}<br/>
                                  <strong>Example:</strong> {orderNumberTypes[barcodeConfig.orderNumberType]?.example}
                                </Typography>
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Serial Number Format
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                              <InputLabel>Serial Number Type</InputLabel>
                              <Select
                                value={barcodeConfig.serialNumberType || 'custom'}
                                onChange={(e) => handleSerialNumberTypeChange(e.target.value)}
                                label="Serial Number Type"
                              >
                                {Object.entries(serialNumberTypes).map(([key, type]) => (
                                  <MenuItem key={key} value={key}>
                                    <Box>
                                      <Typography variant="body1">{type.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {type.description} - Example: {type.example}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          {barcodeConfig.serialNumberType === 'custom' && (
                            <>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Serial Number Pattern (Regex)"
                                  value={barcodeConfig.serialNumberPattern}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, serialNumberPattern: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="^[A-Z]{2}[0-9]{8}$"
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Serial Number Description"
                                  value={barcodeConfig.serialNumberDescription}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, serialNumberDescription: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="2 letters followed by 8 digits"
                                />
                              </Grid>
                            </>
                          )}
                          {barcodeConfig.serialNumberType !== 'custom' && (
                            <Grid item xs={12}>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                  <strong>Selected:</strong> {serialNumberTypes[barcodeConfig.serialNumberType]?.name}<br/>
                                  <strong>Format:</strong> {serialNumberTypes[barcodeConfig.serialNumberType]?.description}<br/>
                                  <strong>Example:</strong> {serialNumberTypes[barcodeConfig.serialNumberType]?.example}
                                </Typography>
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>How it works:</strong> Select predefined barcode types for easy setup, or choose "Custom Pattern" for advanced regex configuration. 
                        The mobile app will validate all scanned codes against these formats and reject invalid scans.
                      </Typography>
                    </Alert>
                    
                    {barcodeConfigChanged && (
                      <Button
                        variant="contained"
                        onClick={handleSaveBarcodeConfig}
                        disabled={barcodeConfigLoading}
                        startIcon={barcodeConfigLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                      >
                        Save Barcode Configuration
                      </Button>
                    )}
                    {barcodeConfigMsg && (
                      <Alert severity={barcodeConfigMsg.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
                        {barcodeConfigMsg}
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          )}

          {/* Create Invite Dialog */}
          <Dialog
            open={inviteDialog}
            onClose={() => setInviteDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Typography variant="h6">
                Invite New User
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                    required
                    helperText="The user will receive an invite link at this email address"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={newInvite.role}
                      onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                      label="Role"
                    >
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="manager">Manager</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInviteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateInvite}
                disabled={inviteLoading || !newInvite.email || !newInvite.role}
                startIcon={inviteLoading ? <CircularProgress size={20} /> : <AddIcon />}
              >
                Send Invite
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbars */}
          <Snackbar open={profileSnackbar} autoHideDuration={3000} onClose={() => setProfileSnackbar(false)}>
            <Alert onClose={() => setProfileSnackbar(false)} severity={profileMsg.includes('successfully') ? 'success' : 'error'} sx={{ width: '100%' }}>
              {profileMsg}
            </Alert>
          </Snackbar>
          
          <Snackbar open={passwordSnackbar} autoHideDuration={3000} onClose={() => setPasswordSnackbar(false)}>
            <Alert onClose={() => setPasswordSnackbar(false)} severity={passwordMsg.includes('successfully') ? 'success' : 'error'} sx={{ width: '100%' }}>
              {passwordMsg}
            </Alert>
          </Snackbar>
          
          <Snackbar open={notifSnackbar} autoHideDuration={3000} onClose={() => setNotifSnackbar(false)}>
            <Alert onClose={() => setNotifSnackbar(false)} severity="success" sx={{ width: '100%' }}>
              {notifMsg}
            </Alert>
          </Snackbar>
        </Card>
      </Box>
    </Box>
  );
} 