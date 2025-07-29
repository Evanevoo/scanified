import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  Divider,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  InputAdornment
} from '@mui/material';
import {
  QrCodeScanner as ScanIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  LocalShipping as DeliveryIcon,
  Assignment as AssignmentIcon,
  PhotoCamera as PhotoIcon,
  Create as SignatureIcon,
  LocationOn as LocationIcon,
  History as HistoryIcon,
  CloudSync as SyncIcon,
  Bluetooth as BluetoothIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useDebounce, useOptimizedFetch } from '../utils/performance';
import { FadeIn, SlideIn, SmoothButton, LoadingOverlay } from '../components/SmoothLoading';
import { Html5QrcodeScanner } from 'html5-qrcode';

const scanModes = [
  { value: 'delivery', label: 'Delivery', icon: <DeliveryIcon />, color: 'primary' },
  { value: 'pickup', label: 'Pickup', icon: <InventoryIcon />, color: 'secondary' },
  { value: 'audit', label: 'Audit', icon: <AssignmentIcon />, color: 'info' },
  { value: 'maintenance', label: 'Maintenance', icon: <EditIcon />, color: 'warning' },
  { value: 'locate', label: 'Locate', icon: <LocationIcon />, color: 'success' }
];

const scanStatuses = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'in_progress', label: 'In Progress', color: 'info' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'error', label: 'Error', color: 'error' }
];

export default function WebScanning() {
  const { profile } = useAuth();
  const [activeMode, setActiveMode] = useState('delivery');
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [currentScan, setCurrentScan] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [scanStats, setScanStats] = useState({
    totalScans: 0,
    successfulScans: 0,
    errorScans: 0,
    avgScanTime: 0
  });
  const [customerInfo, setCustomerInfo] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [proofOfDelivery, setProofOfDelivery] = useState({
    signature: null,
    photo: null,
    notes: '',
    timestamp: null,
    gpsLocation: null
  });
  const [bulkScanMode, setBulkScanMode] = useState(false);
  const [scanValidation, setScanValidation] = useState({
    enabled: true,
    pattern: /^\d{9}$/,
    errorMessage: 'Barcode must be exactly 9 digits'
  });
  const [recentScans, setRecentScans] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEntry, setManualEntry] = useState('');
  const [scanDialog, setScanDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetDialog, setAssetDialog] = useState(false);

  const scannerRef = useRef(null);
  const scanTimeRef = useRef(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Initialize scanner
  useEffect(() => {
    if (scannerActive && !scannerRef.current) {
      initializeScanner();
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [scannerActive]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineScans();
    }
  }, [isOnline, offlineQueue]);

  // Get GPS location
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          () => resolve(null)
        );
      } else {
        resolve(null);
      }
    });
  }, []);

  const initializeScanner = useCallback(() => {
    try {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          aspectRatio: 1.777778,
          supportedScanTypes: [
            Html5QrcodeScanType.SCAN_TYPE_CAMERA
          ]
        },
        false
      );

      scanner.render(
        (decodedText) => handleScanSuccess(decodedText),
        (error) => console.debug('Scan error:', error)
      );

      scannerRef.current = scanner;
    } catch (error) {
      console.error('Failed to initialize scanner:', error);
    }
  }, []);

  const handleScanSuccess = useCallback(async (scannedText) => {
    const startTime = Date.now();
    scanTimeRef.current = startTime;

    // Validate barcode
    if (scanValidation.enabled && !scanValidation.pattern.test(scannedText)) {
      addScanResult({
        barcode: scannedText,
        status: 'error',
        error: scanValidation.errorMessage,
        timestamp: new Date(),
        scanTime: 0
      });
      return;
    }

    // Get GPS location
    const location = await getCurrentLocation();

    // Process scan based on mode
    try {
      const scanResult = await processScan(scannedText, activeMode, location);
      const scanTime = Date.now() - startTime;

      addScanResult({
        ...scanResult,
        scanTime,
        timestamp: new Date(),
        gpsLocation: location
      });

      // Update stats
      setScanStats(prev => ({
        totalScans: prev.totalScans + 1,
        successfulScans: scanResult.status === 'success' ? prev.successfulScans + 1 : prev.successfulScans,
        errorScans: scanResult.status === 'error' ? prev.errorScans + 1 : prev.errorScans,
        avgScanTime: ((prev.avgScanTime * prev.totalScans) + scanTime) / (prev.totalScans + 1)
      }));

      // Play success sound/vibration
      if (scanResult.status === 'success') {
        playSuccessSound();
      } else {
        playErrorSound();
      }

    } catch (error) {
      const scanTime = Date.now() - startTime;
      addScanResult({
        barcode: scannedText,
        status: 'error',
        error: error.message,
        timestamp: new Date(),
        scanTime,
        gpsLocation: location
      });
    }
  }, [activeMode, scanValidation]);

  const processScan = useCallback(async (barcode, mode, location) => {
    // Fetch asset information
    const { data: asset, error: assetError } = await supabase
      .from('bottles')
      .select('*')
      .eq('barcode_number', barcode)
      .eq('organization_id', profile.organization_id)
      .single();

    if (assetError || !asset) {
      throw new Error('Asset not found');
    }

    // Process based on scan mode
    let updateData = {};
    let message = '';

    switch (mode) {
      case 'delivery':
        updateData = {
          status: 'delivered',
          location: customerInfo?.name || 'Customer Location',
          assigned_customer: customerInfo?.id || null,
          last_scanned: new Date().toISOString()
        };
        message = `Delivered to ${customerInfo?.name || 'customer'}`;
        break;

      case 'pickup':
        updateData = {
          status: 'picked_up',
          location: 'In Transit',
          assigned_customer: null,
          last_scanned: new Date().toISOString()
        };
        message = 'Picked up from customer';
        break;

      case 'audit':
        updateData = {
          last_audited: new Date().toISOString(),
          audit_location: location ? `${location.latitude},${location.longitude}` : null,
          last_scanned: new Date().toISOString()
        };
        message = 'Audit scan completed';
        break;

      case 'maintenance':
        updateData = {
          status: 'maintenance',
          last_maintenance: new Date().toISOString(),
          last_scanned: new Date().toISOString()
        };
        message = 'Marked for maintenance';
        break;

      case 'locate':
        // Just update last scanned time for locate
        updateData = {
          last_scanned: new Date().toISOString()
        };
        message = `Located at ${asset.location || 'Unknown location'}`;
        break;

      default:
        throw new Error('Invalid scan mode');
    }

    // Update asset in database
    if (isOnline) {
      const { error: updateError } = await supabase
        .from('bottles')
        .update(updateData)
        .eq('id', asset.id);

      if (updateError) {
        throw new Error('Failed to update asset');
      }

      // Create scan record
      const { error: scanError } = await supabase
        .from('bottle_scans')
        .insert({
          bottle_barcode: barcode,
          scan_type: mode,
          customer_id: customerInfo?.id,
          location: location ? `${location.latitude},${location.longitude}` : null,
          notes: proofOfDelivery.notes,
          user_id: profile.id,
          organization_id: profile.organization_id
        });

      if (scanError) {
        console.warn('Failed to create scan record:', scanError);
      }
    } else {
      // Queue for offline sync
      setOfflineQueue(prev => [...prev, {
        barcode,
        mode,
        updateData,
        timestamp: new Date().toISOString(),
        customerInfo,
        location,
        notes: proofOfDelivery.notes
      }]);
    }

    return {
      barcode,
      asset,
      status: 'success',
      message,
      mode,
      customerInfo,
      location
    };
  }, [profile, customerInfo, proofOfDelivery, isOnline]);

  const addScanResult = useCallback((result) => {
    setScannedItems(prev => [result, ...prev.slice(0, 99)]); // Keep last 100 scans
    setRecentScans(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 for quick view
    
    // Update progress
    setScanProgress(prev => Math.min(prev + 1, 100));
  }, []);

  const syncOfflineScans = useCallback(async () => {
    if (!isOnline || offlineQueue.length === 0) return;

    try {
      for (const queuedScan of offlineQueue) {
        // Update asset
        const { error: updateError } = await supabase
          .from('bottles')
          .update(queuedScan.updateData)
          .eq('barcode_number', queuedScan.barcode)
          .eq('organization_id', profile.organization_id);

        if (updateError) {
          console.error('Failed to sync scan:', updateError);
          continue;
        }

        // Create scan record
        const { error: scanError } = await supabase
          .from('bottle_scans')
          .insert({
            bottle_barcode: queuedScan.barcode,
            scan_type: queuedScan.mode,
            customer_id: queuedScan.customerInfo?.id,
            location: queuedScan.location ? `${queuedScan.location.latitude},${queuedScan.location.longitude}` : null,
            notes: queuedScan.notes,
            user_id: profile.id,
            organization_id: profile.organization_id,
            created_at: queuedScan.timestamp
          });

        if (scanError) {
          console.error('Failed to create scan record:', scanError);
        }
      }

      // Clear offline queue
      setOfflineQueue([]);
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, [isOnline, offlineQueue, profile]);

  const playSuccessSound = useCallback(() => {
    // Create success sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }, []);

  const playErrorSound = useCallback(() => {
    // Create error sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }, []);

  const handleManualEntry = useCallback(async () => {
    if (!manualEntry.trim()) return;
    
    await handleScanSuccess(manualEntry.trim());
    setManualEntry('');
  }, [manualEntry, handleScanSuccess]);

  const clearScans = useCallback(() => {
    setScannedItems([]);
    setRecentScans([]);
    setScanProgress(0);
    setScanStats({
      totalScans: 0,
      successfulScans: 0,
      errorScans: 0,
      avgScanTime: 0
    });
  }, []);

  const exportScans = useCallback(() => {
    const csvContent = [
      ['Barcode', 'Status', 'Mode', 'Message', 'Timestamp', 'Scan Time (ms)'],
      ...scannedItems.map(item => [
        item.barcode,
        item.status,
        item.mode,
        item.message || item.error || '',
        item.timestamp.toISOString(),
        item.scanTime
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scannedItems]);

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <FadeIn>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" color={`${color}.main`} fontWeight="bold">
                {value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </FadeIn>
  );

  const ScanResultRow = ({ scan, index }) => (
    <SlideIn delay={index * 50}>
      <TableRow hover>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace">
            {scan.barcode}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={scan.status}
            color={scan.status === 'success' ? 'success' : 'error'}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Chip
            label={scanModes.find(m => m.value === scan.mode)?.label || scan.mode}
            variant="outlined"
            size="small"
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {scan.message || scan.error}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption">
            {scan.timestamp.toLocaleTimeString()}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption">
            {scan.scanTime}ms
          </Typography>
        </TableCell>
        <TableCell>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedAsset(scan);
              setAssetDialog(true);
            }}
          >
            <SearchIcon />
          </IconButton>
        </TableCell>
      </TableRow>
    </SlideIn>
  );

  return (
    <Box p={3}>
      {/* Header */}
      <FadeIn>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Web Scanning Terminal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Professional barcode scanning with real-time tracking
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <Chip
              icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
              label={isOnline ? 'Online' : 'Offline'}
              color={isOnline ? 'success' : 'warning'}
            />
            {offlineQueue.length > 0 && (
              <Badge badgeContent={offlineQueue.length} color="warning">
                <SyncIcon />
              </Badge>
            )}
            <SmoothButton
              variant="outlined"
              onClick={clearScans}
              disabled={scannedItems.length === 0}
            >
              Clear All
            </SmoothButton>
            <SmoothButton
              variant="outlined"
              onClick={exportScans}
              disabled={scannedItems.length === 0}
            >
              Export CSV
            </SmoothButton>
          </Box>
        </Box>
      </FadeIn>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Scans"
            value={scanStats.totalScans}
            icon={<ScanIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Successful"
            value={scanStats.successfulScans}
            icon={<CheckCircleIcon />}
            color="success"
            subtitle={`${scanStats.totalScans > 0 ? ((scanStats.successfulScans / scanStats.totalScans) * 100).toFixed(1) : 0}% success rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Errors"
            value={scanStats.errorScans}
            icon={<ErrorIcon />}
            color="error"
            subtitle={`${scanStats.totalScans > 0 ? ((scanStats.errorScans / scanStats.totalScans) * 100).toFixed(1) : 0}% error rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Speed"
            value={`${scanStats.avgScanTime.toFixed(0)}ms`}
            icon={<SpeedIcon />}
            color="info"
            subtitle="Per scan"
          />
        </Grid>
      </Grid>

      {/* Scan Mode Selection */}
      <FadeIn delay={200}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Scan Mode
            </Typography>
            <Grid container spacing={2}>
              {scanModes.map((mode) => (
                <Grid item xs={12} sm={6} md={2.4} key={mode.value}>
                  <SmoothButton
                    fullWidth
                    variant={activeMode === mode.value ? 'contained' : 'outlined'}
                    color={mode.color}
                    startIcon={mode.icon}
                    onClick={() => setActiveMode(mode.value)}
                  >
                    {mode.label}
                  </SmoothButton>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Scanner Interface */}
      <FadeIn delay={300}>
        <Grid container spacing={3}>
          {/* Scanner */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Scanner
                  </Typography>
                  <SmoothButton
                    variant={scannerActive ? 'contained' : 'outlined'}
                    color={scannerActive ? 'error' : 'primary'}
                    startIcon={scannerActive ? <CloseIcon /> : <ScanIcon />}
                    onClick={() => setScannerActive(!scannerActive)}
                  >
                    {scannerActive ? 'Stop' : 'Start'} Scanner
                  </SmoothButton>
                </Box>
                
                {scannerActive ? (
                  <Box>
                    <div id="qr-reader" style={{ width: '100%' }} />
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Position barcode within the scanning area. Scanner will automatically detect and process barcodes.
                    </Alert>
                  </Box>
                ) : (
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center" 
                    height={200}
                    bgcolor="grey.100"
                    borderRadius={1}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Click "Start Scanner" to begin scanning
                    </Typography>
                  </Box>
                )}

                {/* Manual Entry */}
                <Box mt={2}>
                  <TextField
                    fullWidth
                    label="Manual Entry"
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <SmoothButton
                            size="small"
                            onClick={handleManualEntry}
                            disabled={!manualEntry.trim()}
                          >
                            Scan
                          </SmoothButton>
                        </InputAdornment>
                      )
                    }}
                    placeholder="Enter barcode manually"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Scans */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Scans
                </Typography>
                {recentScans.length === 0 ? (
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center" 
                    height={200}
                    bgcolor="grey.50"
                    borderRadius={1}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No scans yet. Start scanning to see results here.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {recentScans.map((scan, index) => (
                      <Box
                        key={index}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        p={1}
                        borderBottom={index < recentScans.length - 1 ? '1px solid #f0f0f0' : 'none'}
                      >
                        <Box>
                          <Typography variant="body2" fontFamily="monospace">
                            {scan.barcode}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {scan.message || scan.error}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={scan.status}
                            color={scan.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                          <Typography variant="caption">
                            {scan.scanTime}ms
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </FadeIn>

      {/* Scan Results Table */}
      <FadeIn delay={400}>
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                All Scan Results ({scannedItems.length})
              </Typography>
              <TextField
                size="small"
                placeholder="Search scans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Barcode</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Speed</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scannedItems
                    .filter(scan => 
                      !debouncedSearch || 
                      scan.barcode.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                      (scan.message || scan.error || '').toLowerCase().includes(debouncedSearch.toLowerCase())
                    )
                    .map((scan, index) => (
                      <ScanResultRow key={index} scan={scan} index={index} />
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Asset Details Dialog */}
      <Dialog
        open={assetDialog}
        onClose={() => setAssetDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Asset Details</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedAsset.barcode}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Typography variant="body1">{selectedAsset.status}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Scan Mode</Typography>
                  <Typography variant="body1">{selectedAsset.mode}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Message</Typography>
                  <Typography variant="body1">{selectedAsset.message || selectedAsset.error}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Scan Time</Typography>
                  <Typography variant="body1">{selectedAsset.scanTime}ms</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body1">{selectedAsset.timestamp.toLocaleString()}</Typography>
                </Grid>
                {selectedAsset.gpsLocation && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">GPS Location</Typography>
                    <Typography variant="body1">
                      {selectedAsset.gpsLocation.latitude.toFixed(6)}, {selectedAsset.gpsLocation.longitude.toFixed(6)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssetDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 