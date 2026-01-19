import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  PhoneIphone as PhoneIcon,
  CloudSync as CloudSyncIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Assessment as ReportsIcon,
  Notifications as NotificationsIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AssetTypeDemo from '../components/AssetTypeDemo';

// Demo data
const demoAssets = [
  { id: 'CYL-001', name: 'Oxygen Cylinder', status: 'Available', location: 'Warehouse A', lastScanned: '2 hours ago' },
  { id: 'CYL-002', name: 'Nitrogen Cylinder', status: 'In Use', location: 'Customer Site', lastScanned: '1 day ago' },
  { id: 'CYL-003', name: 'Argon Cylinder', status: 'Maintenance', location: 'Service Center', lastScanned: '3 days ago' },
  { id: 'CYL-004', name: 'CO2 Cylinder', status: 'Available', location: 'Warehouse B', lastScanned: '5 hours ago' },
  { id: 'CYL-005', name: 'Helium Cylinder', status: 'In Transit', location: 'Delivery Truck', lastScanned: '30 minutes ago' }
];

const demoCustomers = [
  { id: 'CUST-001', name: 'Industrial Supply Co.', assets: 45, status: 'Active' },
  { id: 'CUST-002', name: 'Medical Center', assets: 12, status: 'Active' },
  { id: 'CUST-003', name: 'Manufacturing Plant', assets: 78, status: 'Active' },
  { id: 'CUST-004', name: 'Research Lab', assets: 8, status: 'Active' }
];

const demoStats = {
  totalAssets: 143,
  availableAssets: 89,
  inUseAssets: 34,
  maintenanceAssets: 12,
  transitAssets: 8,
  totalCustomers: 24,
  activeDeliveries: 5,
  pendingReturns: 3
};

export default function Demo() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showAssetDialog, setShowAssetDialog] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const startScanning = () => {
    setScanning(true);
    setShowScanDialog(true);
    // Simulate scanning process
    setTimeout(() => {
      const codes = ['CYL-001', 'CYL-002', 'CYL-003', 'CYL-004', 'CYL-005'];
      const randomCode = codes[Math.floor(Math.random() * codes.length)];
      setScannedCode(randomCode);
      setScanning(false);
    }, 2000);
  };

  const handleAssetClick = (asset) => {
    setSelectedAsset(asset);
    setShowAssetDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'success';
      case 'In Use': return 'primary';
      case 'Maintenance': return 'warning';
      case 'In Transit': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '2px solid #000000' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => navigate('/')} sx={{ color: '#000000' }}>
                <BackIcon />
              </IconButton>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#000000' }}>
                Scanified Demo
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => navigate('/create-organization')}
              sx={{ 
                fontWeight: 600,
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: '2px solid #000000',
                '&:hover': {
                  backgroundColor: '#1F2937',
                  borderColor: '#1F2937'
                }
              }}
            >
              Start Free Trial
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Demo Overview */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 2, color: '#000000' }}>
            Interactive Demo
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 600, mx: 'auto', color: '#6B7280' }}>
            Experience how Scanified transforms asset management. Try the features below to see the platform in action.
          </Typography>
        </Box>

        {/* Demo Tabs */}
        <Paper sx={{ mb: 4, border: '2px solid #000000', borderRadius: '8px' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            sx={{ 
              borderBottom: '2px solid #000000',
              '& .MuiTab-root': {
                color: '#6B7280',
                fontWeight: 600,
                '&.Mui-selected': {
                  color: '#000000',
                  fontWeight: 700
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#000000',
                height: '3px'
              }
            }}
          >
            <Tab label="Dashboard" icon={<DashboardIcon />} iconPosition="start" />
            <Tab label="Asset Management" icon={<InventoryIcon />} iconPosition="start" />
            <Tab label="Customer Portal" icon={<PeopleIcon />} iconPosition="start" />
            <Tab label="Mobile Scanning" icon={<PhoneIcon />} iconPosition="start" />
            <Tab label="Reports" icon={<ReportsIcon />} iconPosition="start" />
            <Tab label="Multi-Industry" icon={<SettingsIcon />} iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Dashboard Tab */}
            {activeTab === 0 && (
              <Box>
                <Typography variant="h5" gutterBottom sx={{ color: '#000000', fontWeight: 700 }}>Dashboard Overview</Typography>
                <Typography sx={{ mb: 3, color: '#6B7280' }}>
                  Real-time overview of your asset management operations
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Card sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      border: '2px solid #000000',
                      borderRadius: '8px'
                    }}>
                      <Typography variant="h4" sx={{ color: '#000000', fontWeight: 700 }}>
                        {demoStats.totalAssets}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        Total Assets
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      border: '2px solid #000000',
                      borderRadius: '8px'
                    }}>
                      <Typography variant="h4" sx={{ color: '#000000', fontWeight: 700 }}>
                        {demoStats.availableAssets}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        Available
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      border: '2px solid #000000',
                      borderRadius: '8px'
                    }}>
                      <Typography variant="h4" sx={{ color: '#000000', fontWeight: 700 }}>
                        {demoStats.activeDeliveries}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        Active Deliveries
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      border: '2px solid #000000',
                      borderRadius: '8px'
                    }}>
                      <Typography variant="h4" sx={{ color: '#000000', fontWeight: 700 }}>
                        {demoStats.totalCustomers}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        Customers
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#000000', fontWeight: 700 }}>Recent Activity</Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <QrCodeScannerIcon sx={{ color: '#000000' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="CYL-005 scanned at Customer Site"
                        secondary="2 minutes ago"
                        primaryTypographyProps={{ sx: { color: '#000000' } }}
                        secondaryTypographyProps={{ sx: { color: '#6B7280' } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ShippingIcon sx={{ color: '#000000' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Delivery completed to Industrial Supply Co."
                        secondary="15 minutes ago"
                        primaryTypographyProps={{ sx: { color: '#000000' } }}
                        secondaryTypographyProps={{ sx: { color: '#6B7280' } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <NotificationsIcon sx={{ color: '#000000' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Maintenance alert for CYL-003"
                        secondary="1 hour ago"
                        primaryTypographyProps={{ sx: { color: '#000000' } }}
                        secondaryTypographyProps={{ sx: { color: '#6B7280' } }}
                      />
                    </ListItem>
                  </List>
                </Box>
              </Box>
            )}

            {/* Asset Management Tab */}
            {activeTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ color: '#000000', fontWeight: 700 }}>Asset Management</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => alert('Add new asset functionality would be available in the full version')}
                    sx={{
                      backgroundColor: '#000000',
                      color: '#FFFFFF',
                      border: '2px solid #000000',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: '#1F2937',
                        borderColor: '#1F2937'
                      }
                    }}
                  >
                    Add Asset
                  </Button>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <TextField
                            placeholder="Search assets..."
                            size="small"
                            InputProps={{
                              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                            sx={{ flexGrow: 1 }}
                          />
                          <Button variant="outlined" startIcon={<FilterIcon />}>
                            Filter
                          </Button>
                        </Box>
                        
                        <List>
                          {demoAssets.map((asset) => (
                            <ListItem
                              key={asset.id}
                              button
                              onClick={() => handleAssetClick(asset)}
                              sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                      {asset.name}
                                    </Typography>
                                    <Chip 
                                      label={asset.status} 
                                      size="small" 
                                      color={getStatusColor(asset.status)}
                                    />
                                  </Box>
                                }
                                secondary={`${asset.id} • ${asset.location} • Last scanned: ${asset.lastScanned}`}
                              />
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                        <Stack spacing={2}>
                          <Button
                            variant="outlined"
                            startIcon={<QrCodeScannerIcon />}
                            onClick={startScanning}
                            fullWidth
                          >
                            Scan Asset
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<ShippingIcon />}
                            fullWidth
                          >
                            Schedule Delivery
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            fullWidth
                          >
                            Export Data
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Customer Portal Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h5" gutterBottom>Customer Management</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Manage customer relationships and track their asset usage
                </Typography>
                
                <Grid container spacing={3}>
                  {demoCustomers.map((customer) => (
                    <Grid item xs={12} md={6} key={customer.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                              <Typography variant="h6" fontWeight={600}>
                                {customer.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {customer.id}
                              </Typography>
                            </Box>
                            <Chip label={customer.status} color="success" size="small" />
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Box>
                              <Typography variant="h6" color="primary.main">
                                {customer.assets}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Assets
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Button variant="outlined" size="small" fullWidth>
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Mobile Scanning Tab */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h5" gutterBottom>Mobile Scanning Demo</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Experience the mobile scanning functionality
                </Typography>
                
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ textAlign: 'center', p: 4 }}>
                      <PhoneIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Mobile Scanner
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 3 }}>
                        Use your smartphone to scan barcodes and QR codes
                      </Typography>
                      
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={scanning ? <StopIcon /> : <PlayIcon />}
                        onClick={startScanning}
                        disabled={scanning}
                        sx={{ mb: 2 }}
                      >
                        {scanning ? 'Scanning...' : 'Start Scanning'}
                      </Button>
                      
                      {scannedCode && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          Scanned: {scannedCode}
                        </Alert>
                      )}
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Scanning Features</Typography>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Works with any smartphone camera"
                              secondary="No expensive hardware required"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Offline scanning capability"
                              secondary="Sync when connection is restored"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Multiple barcode formats"
                              secondary="QR codes, Code 128, Code 39, and more"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Instant asset lookup"
                              secondary="Get asset details immediately after scan"
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Reports Tab */}
            {activeTab === 4 && (
              <Box>
                <Typography variant="h5" gutterBottom>Reports & Analytics</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Generate insights and reports from your asset data
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Asset Status Report</Typography>
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Available</Typography>
                            <Typography variant="body2" fontWeight={600}>{demoStats.availableAssets}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">In Use</Typography>
                            <Typography variant="body2" fontWeight={600}>{demoStats.inUseAssets}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Maintenance</Typography>
                            <Typography variant="body2" fontWeight={600}>{demoStats.maintenanceAssets}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">In Transit</Typography>
                            <Typography variant="body2" fontWeight={600}>{demoStats.transitAssets}</Typography>
                          </Box>
                        </Box>
                        <Button variant="outlined" size="small" sx={{ mt: 2 }} fullWidth>
                          Download Report
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Customer Activity</Typography>
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Active Customers</Typography>
                            <Typography variant="body2" fontWeight={600}>{demoStats.totalCustomers}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Active Deliveries</Typography>
                            <Typography variant="body2" fontWeight={600}>{demoStats.activeDeliveries}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Pending Returns</Typography>
                            <Typography variant="body2" fontWeight={600}>{demoStats.pendingReturns}</Typography>
                          </Box>
                        </Box>
                        <Button variant="outlined" size="small" sx={{ mt: 2 }} fullWidth>
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Quick Reports</Typography>
                        <Stack spacing={1} sx={{ mt: 2 }}>
                          <Button variant="text" size="small" startIcon={<DownloadIcon />}>
                            Asset Movement Report
                          </Button>
                          <Button variant="text" size="small" startIcon={<DownloadIcon />}>
                            Customer Usage Report
                          </Button>
                          <Button variant="text" size="small" startIcon={<DownloadIcon />}>
                            Maintenance Schedule
                          </Button>
                          <Button variant="text" size="small" startIcon={<DownloadIcon />}>
                            Delivery Tracking Report
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Multi-Industry Tab */}
            {activeTab === 5 && (
              <Box>
                <Typography variant="h5" gutterBottom>Multi-Industry Platform</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  See how the same platform adapts to different industries and asset types
                </Typography>
                
                <AssetTypeDemo />
              </Box>
            )}
          </Box>
        </Paper>

        {/* Call to Action */}
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Start your free trial and experience the full power of Scanified
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{ px: 4, py: 1.5 }}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/contact')}
              sx={{ px: 4, py: 1.5 }}
            >
              Contact Sales
            </Button>
          </Stack>
        </Box>
      </Container>

      {/* Scan Dialog */}
      <Dialog open={showScanDialog} onClose={() => setShowScanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mobile Scanner</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {scanning ? (
              <Box>
                <Box sx={{ 
                  width: 200, 
                  height: 200, 
                  border: '2px dashed #000000', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  position: 'relative'
                }}>
                  <QrCodeScannerIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    border: '2px solid #000000',
                    borderRadius: 2,
                    animation: 'pulse 1s infinite'
                  }} />
                </Box>
                <Typography>Scanning for barcode...</Typography>
              </Box>
            ) : scannedCode ? (
              <Box>
                <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Asset Found!</Typography>
                <Typography variant="body1" color="text.secondary">
                  Scanned: {scannedCode}
                </Typography>
              </Box>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScanDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Asset Details Dialog */}
      <Dialog open={showAssetDialog} onClose={() => setShowAssetDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Asset Details</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" gutterBottom>{selectedAsset.name}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ID: {selectedAsset.id}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Location: {selectedAsset.location}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status: {selectedAsset.status}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Scanned: {selectedAsset.lastScanned}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssetDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 