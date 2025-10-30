import logger from '../utils/logger';
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase/client';
import { 
  Box, Paper, Typography, Button, Alert, Snackbar, CircularProgress, Divider, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, 
  MenuItem, Select, FormControl, InputLabel, Chip, Checkbox, Autocomplete, Tooltip, Fab, 
  Zoom, Card, CardContent, CardHeader, Grid, Tabs, Tab, Badge, LinearProgress,
  Stepper, Step, StepLabel, StepContent, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon, Switch, FormControlLabel, Stack,
  ButtonGroup, SpeedDial, SpeedDialAction, SpeedDialIcon
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  History as HistoryIcon,
  Close as CloseIcon,
  CheckCircleOutline,
  DeleteOutline,
  InfoOutlined,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Compare as CompareIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  FastForward as FastForwardIcon,
  SkipNext as SkipNextIcon,
  Approval as ApprovalIcon,
  RuleFolder as RuleFolderIcon,
  BugReport as BugReportIcon,
  Security as SecurityIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  PersonAdd as PersonAddIcon,
  SwapHoriz as SwapIcon,
  Transform as TransformIcon,
  Merge as MergeIcon,
  Unarchive as UnarchiveIcon,
  Link as LinkIcon,
  CallSplit as SplitIcon,
  Archive as ArchiveIcon,
  Assessment as AssessmentIcon,
  QrCodeScanner as QrCodeScannerIcon,
  PlayArrow as PlayIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import ImportApprovalDetail from './ImportApprovalDetail';
import QuantityDiscrepancyDetector from '../components/QuantityDiscrepancyDetector';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Enhanced status definitions for verification states
const VERIFICATION_STATES = {
  PENDING: { 
    label: 'Pending Verification', 
    color: 'warning', 
    icon: <ScheduleIcon />,
    description: 'Awaiting review and verification'
  },
  IN_PROGRESS: { 
    label: 'In Progress', 
    color: 'info', 
    icon: <PlayArrowIcon />,
    description: 'Currently being processed'
  },
  VERIFIED: { 
    label: 'Verified', 
    color: 'success', 
    icon: <CheckCircleIcon />,
    description: 'Successfully verified and approved'
  },
  EXCEPTION: { 
    label: 'Exception', 
    color: 'error', 
    icon: <ErrorIcon />,
    description: 'Requires attention - exceptions found'
  },
  INVESTIGATION: { 
    label: 'Under Investigation', 
    color: 'secondary', 
    icon: <BugReportIcon />,
    description: 'Marked for detailed investigation'
  },
  SCANNED_ONLY: { 
    label: 'Scanned Only', 
    color: 'info', 
    icon: <QrCodeScannerIcon />,
    description: 'Order has been scanned but not invoiced yet'
  },
  REJECTED: { 
    label: 'Rejected', 
    color: 'error', 
    icon: <ErrorIcon />,
    description: 'Rejected and requires correction'
  }
};

// Enhanced verification actions for approval workflow
const VERIFICATION_ACTIONS = {
  RECORD_ACTIONS: [
    { id: 'verify', label: 'Verify This Record', icon: <CheckCircleIcon />, color: 'success' },
    { id: 'delete', label: 'Delete This Record', icon: <DeleteOutline />, color: 'error' },
    { id: 'change_date', label: 'Change Record Date and Time', icon: <ScheduleIcon />, color: 'primary' },
    { id: 'change_customer', label: 'Change Customer', icon: <PersonAddIcon />, color: 'primary' },
    { id: 'change_po', label: 'Change P.O Number', icon: <AssignmentIcon />, color: 'primary' },
    { id: 'change_location', label: 'Change Location', icon: <InventoryIcon />, color: 'primary' },
    { id: 'create_correction', label: 'Create or Delete Correction Sales Order', icon: <EditIcon />, color: 'secondary' },
    { id: 'investigate', label: 'Mark for Investigation', icon: <BugReportIcon />, color: 'warning' },
  ],
  ASSET_ACTIONS: [
    { id: 'reclassify', label: 'Reclassify Assets', icon: <TransformIcon />, color: 'primary' },
    { id: 'change_properties', label: 'Change Asset Properties', icon: <SettingsIcon />, color: 'primary' },
    { id: 'attach_not_scanned', label: 'Attach Not-Scanned Assets', icon: <LinkIcon />, color: 'secondary' },
    { id: 'attach_barcode', label: 'Attach by Barcode or by Serial #', icon: <SearchIcon />, color: 'secondary' },
    { id: 'replace_asset', label: 'Replace Incorrect Asset', icon: <SwapIcon />, color: 'warning' },
    { id: 'switch_delivery', label: 'Switch Deliver / Return', icon: <SwapIcon />, color: 'info' },
    { id: 'detach_assets', label: 'Detach Assets', icon: <UnarchiveIcon />, color: 'error' },
    { id: 'move_order', label: 'Move to Another Sales Order', icon: <ShippingIcon />, color: 'primary' },
  ],
  BULK_ACTIONS: [
    { id: 'bulk_verify', label: 'Bulk Verify Selected', icon: <CheckCircleIcon />, color: 'success' },
    { id: 'bulk_reject', label: 'Bulk Reject Selected', icon: <ErrorIcon />, color: 'error' },
    { id: 'bulk_investigate', label: 'Bulk Mark for Investigation', icon: <BugReportIcon />, color: 'warning' },
    { id: 'bulk_export', label: 'Export Selected', icon: <ExportIcon />, color: 'primary' },
  ]
};

// Enhanced verification workflow steps
const VERIFICATION_STEPS = [
  {
    id: 'import',
    label: 'Data Import',
    description: 'Raw data imported from external system',
    icon: <UnarchiveIcon />
  },
  {
    id: 'validation',
    label: 'Data Validation',
    description: 'Validate data integrity and format',
    icon: <SecurityIcon />
  },
  {
    id: 'matching',
    label: 'Asset Matching',
    description: 'Match imported assets with existing inventory',
    icon: <CompareIcon />
  },
  {
    id: 'verification',
    label: 'Manual Verification',
    description: 'Manual review and approval process',
    icon: <ApprovalIcon />
  },
  {
    id: 'quantity_analysis',
    label: 'Quantity Analysis',
    description: 'Analyze shipped vs returned quantity discrepancies',
    icon: <AssessmentIcon />
  },
  {
    id: 'processing',
    label: 'Final Processing',
    description: 'Apply approved changes to system',
    icon: <FastForwardIcon />
  }
];

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString();
}

function PreviewJson({ data }) {
  return (
    <pre style={{ 
      maxHeight: 200, 
      overflow: 'auto', 
      background: '#fafbfc', 
      borderRadius: 6, 
      padding: 8, 
      fontSize: 13,
      border: '1px solid #e0e0e0'
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// Enhanced data parsing with better error handling
function parseDataField(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed;
    } catch {
      logger.log('JSON parse error for data:', data);
      return { _raw: data, _error: 'Malformed JSON' };
    }
  }
  return data;
}

// Function to merge scanned records with imported invoices for the same order
function mergeScannedWithImported(importedInvoices, scannedRecords) {
  const merged = [];
  const processedScannedIds = new Set();
  
  // Process each imported invoice
  for (const invoice of importedInvoices) {
    const invoiceData = parseDataField(invoice.data);
    const invoiceOrderNum = getOrderNumber(invoiceData);
    
    // Find matching scanned records for this order
    const matchingScanned = scannedRecords.filter(scan => {
      const scanData = parseDataField(scan.data);
      const scanOrderNum = getOrderNumber(scanData);
      return scanOrderNum === invoiceOrderNum;
    });
    
    if (matchingScanned.length > 0) {
      // Merge the invoice with scanned data
      const mergedInvoice = {
        ...invoice,
        has_scanned_data: true,
        scanned_records: matchingScanned,
        is_scanned_only: false
      };
      merged.push(mergedInvoice);
      
      // Mark these scanned records as processed
      matchingScanned.forEach(scan => processedScannedIds.add(scan.id));
      
      logger.log(`🔗 Merged order ${invoiceOrderNum}: invoice + ${matchingScanned.length} scanned records`);
    } else {
      // No matching scans, keep as regular import
      merged.push(invoice);
    }
  }
  
  // Add remaining scanned records that don't have matching imports
  const remainingScanned = scannedRecords.filter(scan => !processedScannedIds.has(scan.id));
  merged.push(...remainingScanned);
  
  logger.log(`📊 Merge result: ${merged.length} total records (${importedInvoices.length} imports, ${remainingScanned.length} scanned-only)`);
  
  return merged;
}

// Enhanced status determination with professional workflow logic
function determineVerificationStatus(record) {
  // Handle scanned-only records (orders that have been scanned but not invoiced yet)
  if (record.is_scanned_only) {
    return 'SCANNED_ONLY';
  }
  
  const data = parseDataField(record.data);
  
  // Check for critical errors
  if (data._error) return 'EXCEPTION';
  
  // Check for customer info in multiple places
  let hasCustomerInfo = false;
  
  // Check direct properties
  if (data.customer_name || data.CustomerName || data.Customer || data.customer_id || data.CustomerListID) {
    hasCustomerInfo = true;
  }
  
  // Check in rows array
  if (!hasCustomerInfo && data.rows && data.rows.length > 0) {
    hasCustomerInfo = data.rows.some(row => 
      row.customer_name || row.CustomerName || row.Customer || row.customer_id || row.CustomerListID
    );
  }
  
  // Check in line_items array
  if (!hasCustomerInfo && data.line_items && data.line_items.length > 0) {
    hasCustomerInfo = data.line_items.some(item => 
      item.customer_name || item.CustomerName || item.Customer || item.customer_id || item.CustomerListID
    );
  }
  
  if (!hasCustomerInfo) return 'EXCEPTION';
  
  // Check for warnings
  if (data.warnings && data.warnings.length > 0) return 'INVESTIGATION';
  
  // Check verification state
  if (record.verified) return 'VERIFIED';
  if (record.processing) return 'IN_PROGRESS';
  
  return 'PENDING';
}

export default function ImportApprovals() {
  const { user, organization } = useAuth();
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditDialog, setAuditDialog] = useState({ open: false, logs: [], title: '' });
  const navigate = useNavigate();
  
  // Enhanced state management  
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'timeline'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [verificationDialog, setVerificationDialog] = useState({ open: false, record: null, step: 0 });
  const [bulkActionDialog, setBulkActionDialog] = useState({ open: false, action: null });
  const [filterDialog, setFilterDialog] = useState({ open: false });
  const [settingsDialog, setSettingsDialog] = useState({ open: false });
  const [workflowDialog, setWorkflowDialog] = useState({ open: false, record: null });
  const [quantityAnalysisDialog, setQuantityAnalysisDialog] = useState({ 
    open: false, 
    orderNumber: null, 
    customerId: null, 
    organizationId: null 
  });
  const [confirmationDialog, setConfirmationDialog] = useState({ 
    open: false, 
    action: null, 
    record: null, 
    type: null 
  });
  
  // Existing state
  const [customerNameToId, setCustomerNameToId] = useState({});
  const customerLookupDone = useRef(false);
  const [productCodeToGroup, setProductCodeToGroup] = useState({});
  const [scannedCounts, setScannedCounts] = useState({});
  const [allScannedRows, setAllScannedRows] = useState([]);
  const [scannedOrders, setScannedOrders] = useState([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('all');
  const [invoiceSort, setInvoiceSort] = useState({ field: 'order', dir: 'asc' });
  const [receiptSort, setReceiptSort] = useState({ field: 'order', dir: 'asc' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [dateDialog, setDateDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [gasTypes, setGasTypes] = useState([]);
  const [verifyWarning, setVerifyWarning] = useState({ open: false, row: null, mismatch: false });
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [productCodeToAssetInfo, setProductCodeToAssetInfo] = useState({});
  const [rentalWarningDialog, setRentalWarningDialog] = useState({ open: false, warnings: [], onConfirm: null });

  // Enhanced verification statistics
  const [verificationStats, setVerificationStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    exceptions: 0,
    investigating: 0,
    processing: 0
  });

  // Automatic scanning state
  const [autoScanning, setAutoScanning] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanSpeed, setScanSpeed] = useState(1000); // milliseconds between scans
  const [scannedItems, setScannedItems] = useState([]);
  const [scanStats, setScanStats] = useState({
    totalScans: 0,
    successfulScans: 0,
    errorScans: 0,
    avgScanTime: 0
  });
  const [scanDialog, setScanDialog] = useState(false);
  const scannerRef = useRef(null);
  const scanTimeRef = useRef(null);

  // Define handleSelectAll early to avoid initialization errors
  const handleSelectAll = () => {
    const selectableInvoices = filteredInvoices.filter(invoice => 
      !(typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'))
    );
    
    setSelectedRecords(
      selectedRecords.length === selectableInvoices.length 
        ? [] 
        : selectableInvoices.map(invoice => invoice.id)
    );
  };

  const handleSelectRecord = (id) => {
    setSelectedRecords(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchData();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Initialize component with optimized loading
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Load critical data first
        await Promise.all([
          fetchData(),
          fetchCustomers(),
          fetchScannedCounts(),
          fetchCylinders(),  // Load product code to group mapping
          fetchBottles()     // Load product code to asset info mapping
        ]);
        
        // Load secondary data in background
        Promise.all([
          fetchAllScanned(),
          fetchScannedOrders(),
          fetchGasTypes(),
          fetchBottles(),
          fetchLocations()
        ]).catch(console.error);
        
      } catch (error) {
        logger.error('Error initializing data:', error);
        setError('Failed to load data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
  }, []);

  // Scanner cleanup effect
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  // Enhanced data fetching with statistics
  const fetchData = async () => {
    try {
      // First fetch the main data
      await Promise.all([
        fetchPendingInvoices(),
        fetchPendingReceipts()
      ]);
      
      // Then fetch verification stats (which will also set pendingInvoices)
      await fetchVerificationStats();
      
      // Finally fetch scanned-only orders
      await fetchScannedOnlyOrders();
    } catch (error) {
      setError('Failed to fetch data: ' + error.message);
    }
  };

  // Filter records based on search, status, and location
  const filterRecords = (records) => {
    return records.filter(record => {
      const data = parseDataField(record.data);
      
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const orderNum = getOrderNumber(data).toLowerCase();
        const customerName = getCustomerInfo(data).toLowerCase();
        const items = getLineItems(data);
        const productCodes = items.map(item => (item.product_code || '').toLowerCase()).join(' ');
        
        if (!orderNum.includes(searchLower) && 
            !customerName.includes(searchLower) && 
            !productCodes.includes(searchLower)) {
          return false;
        }
      }
      
      // Status filter - skip rejected records by default
      if (statusFilter !== 'all') {
        // Skip rejected records unless explicitly showing them
        if (record.status === 'rejected') return false;
        
        const recordStatus = determineVerificationStatus(record);
        if (statusFilter === 'pending' && recordStatus !== 'PENDING') return false;
        if (statusFilter === 'verified' && recordStatus !== 'VERIFIED') return false;
        if (statusFilter === 'exception' && recordStatus !== 'EXCEPTION') return false;
        if (statusFilter === 'investigation' && recordStatus !== 'INVESTIGATION') return false;
        if (statusFilter === 'scanned_only' && recordStatus !== 'SCANNED_ONLY') return false;
      } else {
        // Even when showing "all", hide rejected records by default
        if (record.status === 'rejected') return false;
      }
      
      // Location filter
      if (locationFilter !== 'All') {
        const recordLocation = data.location || data.summary?.location || 'Unknown';
        if (recordLocation !== locationFilter) return false;
      }
      
      return true;
    });
  };

  // Get filtered records
  const filteredInvoices = filterRecords(pendingInvoices);
  const filteredReceipts = filterRecords(pendingReceipts);
  
  // Debug: Log the data to see what we're working with
  logger.log('Pending invoices:', pendingInvoices);
  logger.log('Filtered invoices:', filteredInvoices);

  // Get unique locations from all records
  const getUniqueLocations = () => {
    const locations = new Set(['All']);
    logger.log('🔍 Debug locations - pendingInvoices:', pendingInvoices.length, 'pendingReceipts:', pendingReceipts.length);
    logger.log('🔍 Debug locations - allLocations from database:', allLocations.length);
    
    // Always use locations from database first (same as Locations page)
    allLocations.forEach(location => {
      locations.add(location.name);
    });
    
    // Also add any unique locations found in imported data
    [...pendingInvoices, ...pendingReceipts].forEach((record, index) => {
      const data = parseDataField(record.data);
      const location = data.location || data.summary?.location || data.location_name || data.Location;
      
      if (location && location !== 'Unknown') {
        locations.add(location);
      }
      
      if (index < 3) { // Debug first 3 records
        logger.log(`🔍 Record ${index}:`, {
          id: record.id,
          location: location,
          dataKeys: Object.keys(data),
          hasLocation: !!data.location,
          hasSummaryLocation: !!(data.summary && data.summary.location),
          hasLocationName: !!data.location_name,
          hasLocationCap: !!data.Location
        });
      }
    });
    
    logger.log('🔍 Final locations:', Array.from(locations));
    return Array.from(locations);
  };

  // Enhanced data fetching functions
  async function fetchPendingInvoices() {
    try {
      logger.log('🔍 Processing existing imported invoices for auto-approval...');
      logger.log('🔍 Organization ID:', organization?.id);
      
      if (!organization?.id) {
        logger.log('⚠️ No organization ID found, skipping invoice processing');
        return;
      }
      
      const { data, error } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .neq('status', 'rejected'); // EXCLUDE REJECTED RECORDS
      
      if (error) throw error;
      
      logger.log('🔍 Found invoices for organization:', data?.length || 0);
      if (data && data.length > 0) {
        logger.log('🔍 First invoice organization_id:', data[0].organization_id);
        logger.log('🔍 Current organization_id:', organization.id);
      }
      
      // Split grouped imports into individual records (professional workflow)
      const individualRecords = [];
      (data || []).forEach(importRecord => {
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        individualRecords.push(...splitRecords);
      });
      
      logger.log('Split invoices into individual records:', individualRecords.length);
      
      // Check for auto-approval opportunities
      const autoApprovedRecords = [];
      const remainingRecords = [];
      
      for (const record of individualRecords) {
        const wasAutoApproved = await autoApproveIfQuantitiesMatch(record);
        if (wasAutoApproved) {
          autoApprovedRecords.push(record);
        } else {
          remainingRecords.push(record);
        }
      }
      
      if (autoApprovedRecords.length > 0) {
        logger.log(`✅ Auto-approved ${autoApprovedRecords.length} records with matching quantities`);
        setSnackbar(`Auto-approved ${autoApprovedRecords.length} records with matching quantities`);
      }
      
      // Don't set pendingInvoices here - let fetchVerificationStats handle it
      logger.log('📊 fetchPendingInvoices completed, remaining records:', remainingRecords.length);
    } catch (error) {
      logger.error('Error fetching pending invoices:', error);
      setError('Failed to fetch pending invoices');
    }
  }

  async function fetchPendingReceipts() {
    try {
      logger.log('🔍 Processing existing imported receipts for auto-approval...');
      logger.log('🔍 Organization ID:', organization?.id);
      
      if (!organization?.id) {
        logger.log('⚠️ No organization ID found, skipping receipt processing');
        return;
      }
      
      const { data, error } = await supabase
        .from('imported_sales_receipts')
        .select('*')
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      
      logger.log('🔍 Found receipts for organization:', data?.length || 0);
      if (data && data.length > 0) {
        logger.log('🔍 First receipt organization_id:', data[0].organization_id);
        logger.log('🔍 Current organization_id:', organization.id);
      }
      
      // Split grouped imports into individual records (professional workflow)
      const individualRecords = [];
      (data || []).forEach(importRecord => {
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        individualRecords.push(...splitRecords);
      });
      
      logger.log('Split receipts into individual records:', individualRecords.length);
      setPendingReceipts(individualRecords);
    } catch (error) {
      logger.error('Error fetching pending receipts:', error);
      setError('Failed to fetch pending receipts');
    }
  }

  async function fetchVerificationStats() {
    try {
      setLoading(true);
      logger.log('🚀 Starting data fetch...');
      logger.log('🔍 Organization:', organization);
      
      if (!organization || !organization.id) {
        logger.error('❌ No organization found');
        setError('No organization found. Please log in again.');
        setLoading(false);
        return;
      }
      
      const startTime = Date.now();
      
      const { data: invoices, error: invoiceError } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .neq('status', 'rejected'); // EXCLUDE REJECTED
      const { data: receipts, error: receiptError } = await supabase
        .from('imported_sales_receipts')
        .select('*')
        .eq('organization_id', organization.id)
        .neq('status', 'rejected'); // EXCLUDE REJECTED
      
      if (invoiceError) {
        logger.error('❌ Invoice query error:', invoiceError);
        throw invoiceError;
      }
      
      if (receiptError) {
        logger.error('❌ Receipt query error:', receiptError);
        throw receiptError;
      }
      
      logger.log('⏱️ Database queries completed in:', Date.now() - startTime, 'ms');
      
      logger.log('🔍 Organization filter:', {
        organizationId: organization.id,
        invoicesFound: invoices?.length || 0,
        receiptsFound: receipts?.length || 0
      });
      
      // Split grouped imports into individual records (same as in fetchPendingInvoices/fetchPendingReceipts)
      const individualInvoices = [];
      (invoices || []).forEach(importRecord => {
        logger.log('🔍 Processing invoice record:', {
          id: importRecord.id,
          filename: importRecord.filename,
          dataKeys: Object.keys(importRecord.data || {})
        });
        
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        logger.log('📊 Split into individual records:', splitRecords.length);
        individualInvoices.push(...splitRecords);
      });
      
      const individualReceipts = [];
      (receipts || []).forEach(importRecord => {
        logger.log('🔍 Processing receipt record:', {
          id: importRecord.id,
          filename: importRecord.filename,
          dataKeys: Object.keys(importRecord.data || {})
        });
        
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        logger.log('📊 Split into individual records:', splitRecords.length);
        individualReceipts.push(...splitRecords);
      });
      
      logger.log('🔍 Individual records:', {
        invoices: invoices?.length || 0,
        receipts: receipts?.length || 0,
        individualInvoices: individualInvoices.length,
        individualReceipts: individualReceipts.length,
        invoiceStatuses: invoices?.map(i => i.status) || [],
        receiptStatuses: receipts?.map(r => r.status) || []
      });
      
      // Debug: Show first few individual records
      logger.log('🔍 First 3 individual invoices:', individualInvoices.slice(0, 3).map(inv => ({
        id: inv.id,
        displayId: inv.displayId,
        customerName: inv.data.customer_name,
        productCode: inv.data.product_code,
        orderNumber: inv.data.order_number
      })));
      
      // Get scanned-only records from both bottle_scans and scans tables
      logger.log('⏱️ Fetching scanned data...');
      const scanStartTime = Date.now();
      
      const { data: scannedRows, error: scannedError } = await supabase
        .from('bottle_scans')
        .select('*')
        .not('order_number', 'is', null)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to prevent slow queries
      
      // Also get scans from the mobile app scans table (exclude rejected ones)
      const { data: mobileScans, error: mobileError } = await supabase
        .from('scans')
        .select('*')
        .not('order_number', 'is', null)
        .eq('organization_id', organization.id)
        .neq('status', 'rejected') // EXCLUDE REJECTED
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to prevent slow queries
      
      if (scannedError) {
        logger.error('❌ Scanned rows query error:', scannedError);
        throw scannedError;
      }
      
      if (mobileError) {
        logger.error('❌ Mobile scans query error:', mobileError);
        throw mobileError;
      }
      
      logger.log('⏱️ Scanned data queries completed in:', Date.now() - scanStartTime, 'ms');
      
      // Combine both scan sources
      const allScannedRows = [...(scannedRows || []), ...(mobileScans || [])];
      
      logger.log('🔍 Data fetch results:', {
        scannedRows: scannedRows?.length || 0,
        mobileScans: mobileScans?.length || 0,
        allScannedRows: allScannedRows.length
      });
      
      const { data: importedInvoices } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('organization_id', organization.id);
        
      logger.log('🔍 Imported invoices:', importedInvoices?.length || 0);
      
      // Extract order numbers from imported invoices
      const importedOrderNumbers = new Set();
      importedInvoices.forEach(invoice => {
        const data = parseDataField(invoice.data);
        const rows = data.rows || data.line_items || [];
        rows.forEach(row => {
          if (row.order_number || row.invoice_number || row.reference_number) {
            importedOrderNumbers.add((row.order_number || row.invoice_number || row.reference_number).toString().trim());
          }
        });
      });

      // Group scanned rows by order number - include ALL scanned records
      const orderGroups = {};
      allScannedRows.forEach(scan => {
        const orderNum = scan.order_number?.toString().trim();
        if (orderNum) {
          if (!orderGroups[orderNum]) {
            orderGroups[orderNum] = [];
          }
          orderGroups[orderNum].push(scan);
        }
      });
      
      logger.log('🔍 Order groups created:', Object.keys(orderGroups).length);
      logger.log('🔍 Order numbers:', Object.keys(orderGroups));

      // Convert to the same format as imported invoices for consistency
      logger.log('⏱️ Processing scanned records...');
      const processStartTime = Date.now();
      
      const scannedOnlyRecords = Object.entries(orderGroups).map(([orderNumber, scans]) => {
        const firstScan = scans[0];
        const customerName = firstScan.customer_name || firstScan.customer || 'Unknown Customer';
        const hasMatchingImport = importedOrderNumbers.has(orderNumber);
        
        logger.log('🔍 Creating scanned record:', { 
          orderNumber, 
          customerName, 
          hasMatchingImport, 
          scanCount: scans.length,
          importedOrderNumbers: Array.from(importedOrderNumbers)
        });
        
        return {
          id: `scanned_${orderNumber}`,
          data: {
            rows: scans.map(scan => ({
              order_number: orderNumber,
              customer_name: customerName,
              product_code: scan.product_code || scan.bottle_barcode || scan.barcode_number || 'Unknown',
              qty_out: scan.action === 'out' || scan.scan_type === 'delivery' || scan.mode === 'delivery' || scan.mode === 'SHIP' ? 1 : 0,
              qty_in: scan.action === 'in' || scan.scan_type === 'pickup' || scan.mode === 'pickup' || scan.mode === 'RETURN' ? 1 : 0,
              date: scan.scan_date || scan.created_at || new Date().toISOString().split('T')[0],
              location: scan.location || 'Unknown',
              // Add mobile-specific fields for better display
              barcode: scan.barcode_number || scan.bottle_barcode,
              description: scan.description || 'Unknown',
              gas_type: scan.gas_type || 'Unknown'
            })),
            summary: {
              total_rows: scans.length,
              uploaded_by: firstScan.user_id || 'scanner',
              uploaded_at: firstScan.created_at || new Date().toISOString()
            }
          },
          uploaded_by: firstScan.user_id || 'scanner',
          status: hasMatchingImport ? 'pending' : 'scanned_only',
          created_at: firstScan.created_at || new Date().toISOString(),
          is_scanned_only: !hasMatchingImport,
          has_matching_import: hasMatchingImport
        };
      });
      
      logger.log('⏱️ Scanned records processing completed in:', Date.now() - processStartTime, 'ms');
      logger.log('📊 Final scanned records count:', scannedOnlyRecords.length);
      
      const allRecords = [...individualInvoices, ...individualReceipts, ...scannedOnlyRecords];
      logger.log('📊 All records count:', allRecords.length);
      
      logger.log('🔍 Final allRecords:', {
        individualInvoices: individualInvoices.length,
        individualReceipts: individualReceipts.length,
        scannedOnlyRecords: scannedOnlyRecords.length,
        total: allRecords.length
      });
      
      // Debug: Show first few final records
      logger.log('🔍 First 3 final records:', allRecords.slice(0, 3).map(record => ({
        id: record.id,
        displayId: record.displayId,
        customerName: record.data?.customer_name,
        productCode: record.data?.product_code,
        orderNumber: record.data?.order_number
      })));
      
      setPendingInvoices(allRecords);
      
      // Calculate stats from the actual data being displayed
      const displayStats = {
        total: allRecords.length,
        pending: 0,
        verified: 0,
        exceptions: 0,
        investigating: 0,
        processing: 0,
        scanned_only: 0,
        quantityDiscrepancies: 0
      };
      
      allRecords.forEach(record => {
        const status = determineVerificationStatus(record);
        switch (status) {
          case 'PENDING': displayStats.pending++; break;
          case 'VERIFIED': displayStats.verified++; break;
          case 'EXCEPTION': displayStats.exceptions++; break;
          case 'INVESTIGATION': displayStats.investigating++; break;
          case 'IN_PROGRESS': displayStats.processing++; break;
          case 'SCANNED_ONLY': displayStats.scanned_only++; break;
        }
        
        // Check for quantity discrepancies
        const data = parseDataField(record.data);
        const lineItems = data.rows || data.line_items || data.LineItems || [];
        const hasQuantityDiscrepancy = lineItems.some(item => {
          const shippedQty = item.shipped || item.Shipped || 0;
          const returnedQty = item.returned || item.Returned || 0;
          return shippedQty > 0 && shippedQty === returnedQty;
        });
        
        if (hasQuantityDiscrepancy) {
          displayStats.quantityDiscrepancies++;
        }
      });
      
      logger.log('⏱️ Total data fetch completed in:', Date.now() - startTime, 'ms');
      logger.log('📊 Final stats calculated:', displayStats);
      logger.log('📊 Setting verification stats...');
      setVerificationStats(displayStats);
      logger.log('📊 Verification stats set successfully');
      logger.log('📊 Pending invoices set to:', allRecords.length, 'records');
      setLoading(false);
      
    } catch (error) {
      logger.error('Error fetching verification stats:', error);
      setError('Failed to fetch data: ' + error.message);
      
      // Fallback: try to show basic data even if main function fails
      try {
        logger.log('🔄 Attempting fallback data fetch...');
        const { data: fallbackInvoices } = await supabase
          .from('imported_invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .limit(50);
        
        if (fallbackInvoices && fallbackInvoices.length > 0) {
          logger.log('✅ Fallback data found:', fallbackInvoices.length, 'records');
          setPendingInvoices(fallbackInvoices);
          setVerificationStats({
            total: fallbackInvoices.length,
            pending: fallbackInvoices.length,
            verified: 0,
            exceptions: 0,
            investigating: 0,
            processing: 0,
            scanned_only: 0,
            quantityDiscrepancies: 0
          });
        }
      } catch (fallbackError) {
        logger.error('❌ Fallback also failed:', fallbackError);
      }
      
      setLoading(false);
    }
  }

  // Fetch all cylinders for group lookup
  async function fetchCylinders() {
    const { data: cylinders } = await supabase.from('bottles').select('product_code, gas_type, size');
    const map = {};
    (cylinders || []).forEach(c => {
      if (c.product_code) {
        // Use gas_type as the group name, or combine gas_type and size
        map[c.product_code.trim()] = c.gas_type || '';
      }
    });
    setProductCodeToGroup(map);
  }

  // Fetch all customers once for lookup
  async function fetchCustomers() {
    if (customerLookupDone.current) return;
    try {
      const { data: customers, error } = await supabase.from('customers').select('CustomerListID, name');
      if (error) throw error;
      const map = {};
      (customers || []).forEach(c => {
        if (c.name) map[c.name.toLowerCase()] = c.CustomerListID;
      });
      setCustomerNameToId(map);
      customerLookupDone.current = true;
    } catch (error) {
      logger.error('Error fetching customers:', error);
    }
  }

  // Fetch scanned bottle counts for each invoice/order number
  async function fetchScannedCounts() {
    try {
      const { data: scannedRows, error } = await supabase.from('bottle_scans').select('order_number');
      if (error) throw error;
      const counts = {};
      (scannedRows || []).forEach(row => {
        if (row.order_number) {
          counts[row.order_number] = (counts[row.order_number] || 0) + 1;
        }
      });
      setScannedCounts(counts);
    } catch (error) {
      logger.error('Error fetching scanned counts:', error);
    }
  }

  // Batch fetch all relevant bottles for all pending invoices
  async function fetchAllScanned() {
    try {
      // Get from bottle_scans table
      const { data: scannedRows, error: scanError } = await supabase.from('bottle_scans').select('*');
      if (scanError) throw scanError;
      
      // Also get from scans table (legacy/mobile scans) - EXCLUDE REJECTED
      const { data: mobileScans, error: mobileError } = await supabase
        .from('scans')
        .select('*')
        .not('status', 'eq', 'rejected');
      
      if (mobileError) logger.error('Error fetching mobile scans:', mobileError);
      
      // Combine both sources
      const allScans = [...(scannedRows || []), ...(mobileScans || [])];
      logger.log('📊 Loaded scans:', { bottleScans: scannedRows?.length || 0, mobileScans: mobileScans?.length || 0, total: allScans.length });
      
      setAllScannedRows(allScans);
    } catch (error) {
      logger.error('Error fetching all scanned rows:', error);
    }
  }

  // Fetch scanned orders (cylinder_scans)
  async function fetchScannedOrders() {
    try {
      const { data: orders, error } = await supabase.from('sales_orders').select('*');
      if (error) throw error;
      setScannedOrders(orders || []);
    } catch (error) {
      logger.error('Error fetching scanned orders:', error);
    }
  }

  // Fetch scanned orders that don't have corresponding invoices yet
  async function fetchScannedOnlyOrders() {
    try {
      // Get all scanned orders from bottle_scans table
      const { data: scannedRows, error: scanError } = await supabase
        .from('bottle_scans')
        .select('*')
        .not('order_number', 'is', null);
      
      logger.log('🔍 Fetched bottle_scans:', scannedRows?.length || 0, 'records');
      
      if (scanError) throw scanError;

      // Also get scans from the mobile app scans table (exclude rejected ones)
      const { data: mobileScans, error: mobileError } = await supabase
        .from('scans')
        .select('*')
        .not('order_number', 'is', null)
        .not('status', 'eq', 'rejected'); // EXCLUDE REJECTED SCANS
      
      if (mobileError) throw mobileError;
      
      logger.log('🔍 Fetched mobile scans:', mobileScans?.length || 0, 'records');
      
      // Debug: Check if any scans have status 'rejected'
      const { data: rejectedScans } = await supabase
        .from('scans')
        .select('order_number, status, rejected_at')
        .eq('status', 'rejected');
      logger.log('Rejected scans in database:', rejectedScans);

      // Combine both scan sources
      const allScannedRows = [...(scannedRows || []), ...(mobileScans || [])];

      // Get all order numbers that have been imported
      const { data: importedInvoices, error: invError } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('organization_id', organization.id);
      
      if (invError) throw invError;

      // Extract order numbers from imported invoices
      const importedOrderNumbers = new Set();
      importedInvoices.forEach(invoice => {
        const data = parseDataField(invoice.data);
        const rows = data.rows || data.line_items || [];
        rows.forEach(row => {
          if (row.order_number || row.invoice_number || row.reference_number) {
            importedOrderNumbers.add((row.order_number || row.invoice_number || row.reference_number).toString().trim());
          }
        });
      });

      logger.log('📋 Imported order numbers:', Array.from(importedOrderNumbers));

      // Group scanned rows by order number - EXCLUDE REJECTED
      const orderGroups = {};
      allScannedRows.forEach(scan => {
        // Skip rejected scans (both from scans and bottle_scans tables)
        if (scan.status === 'rejected') return;
        
        const orderNum = scan.order_number?.toString().trim();
        if (orderNum) {
          if (!orderGroups[orderNum]) {
            orderGroups[orderNum] = [];
          }
          orderGroups[orderNum].push(scan);
        }
      });

      logger.log('📦 All scanned order groups:', Object.keys(orderGroups));
      logger.log('📋 Imported order numbers:', Array.from(importedOrderNumbers));

      // Convert to the same format as imported invoices for consistency
      // Only create scanned-only records for orders that DON'T have matching imports
      const scannedOnlyRecords = Object.entries(orderGroups)
        .filter(([orderNumber]) => !importedOrderNumbers.has(orderNumber))
        .map(([orderNumber, scans]) => {
          // Get customer info from the first scan
          const firstScan = scans[0];
          const customerName = firstScan.customer_name || firstScan.customer || 'Unknown Customer';
          
          // Create a mock data structure that matches imported invoices format
          return {
            id: `scanned_${orderNumber}`,
            data: {
              rows: scans.map(scan => ({
                order_number: orderNumber,
                customer_name: customerName,
                product_code: scan.product_code || scan.bottle_barcode || scan.barcode_number || 'Unknown',
                qty_out: scan.action === 'out' || scan.scan_type === 'delivery' || scan.mode === 'delivery' || scan.mode === 'SHIP' ? 1 : 0,
                qty_in: scan.action === 'in' || scan.scan_type === 'pickup' || scan.mode === 'pickup' || scan.mode === 'RETURN' ? 1 : 0,
                date: scan.scan_date || scan.created_at || new Date().toISOString().split('T')[0],
                location: scan.location || 'Unknown',
                // Add mobile-specific fields for better display
                barcode: scan.barcode_number || scan.bottle_barcode,
                description: scan.description || 'Unknown',
                gas_type: scan.gas_type || 'Unknown'
              })),
              summary: {
                total_rows: scans.length,
                uploaded_by: firstScan.user_id || 'scanner',
                uploaded_at: firstScan.created_at || new Date().toISOString()
              }
            },
            uploaded_by: firstScan.user_id || 'scanner',
            status: 'scanned_only',
            created_at: firstScan.created_at || new Date().toISOString(),
            is_scanned_only: true
          };
        });

      // Check for auto-approval opportunities in scanned-only records
      const autoApprovedScannedRecords = [];
      const remainingScannedRecords = [];
      
      for (const record of scannedOnlyRecords) {
        const wasAutoApproved = await autoApproveIfQuantitiesMatch(record);
        if (wasAutoApproved) {
          autoApprovedScannedRecords.push(record);
        } else {
          remainingScannedRecords.push(record);
        }
      }
      
      if (autoApprovedScannedRecords.length > 0) {
        logger.log(`✅ Auto-approved ${autoApprovedScannedRecords.length} scanned-only records with matching quantities`);
        setSnackbar(`Auto-approved ${autoApprovedScannedRecords.length} scanned-only records with matching quantities`);
      }

      // Don't set pendingInvoices here - let fetchVerificationStats handle it
      logger.log('📊 fetchScannedOnlyOrders completed, remaining scanned records:', remainingScannedRecords.length);

    } catch (error) {
      logger.error('Error fetching scanned-only orders:', error);
    }
  }

  // Fetch gas types for dropdown
  async function fetchGasTypes() {
    try {
      const { data: gasTypes, error } = await supabase.from('gas_types').select('*');
      if (error) throw error;
      setGasTypes(gasTypes || []);
    } catch (error) {
      logger.error('Error fetching gas types:', error);
    }
  }

  // Fetch locations from database (same as Locations page)
  async function fetchLocations() {
    try {
      const { data: locations, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setAllLocations(locations || []);
      logger.log('🔍 Fetched locations:', locations?.length || 0);
    } catch (error) {
      logger.error('Error fetching locations:', error);
    }
  }

  // Fetch all bottles for product code lookup
  async function fetchBottles() {
    try {
      const { data: bottles, error } = await supabase.from('bottles').select('*');
      if (error) throw error;
      const assetMap = {};
      (bottles || []).forEach(bottle => {
        // Create entry by product code
        if (bottle.product_code) {
          assetMap[bottle.product_code] = {
            description: bottle.description || '',
            type: bottle.gas_type || bottle.type || '',  // Use gas_type as type
            size: bottle.size || '',
            group: bottle.gas_type || '',  // Use gas_type as group
            category: bottle.size || '',    // Use size as category
            barcode: bottle.barcode_number || '',
            serial_number: bottle.serial_number || ''
          };
        }
        
        // Also create entry by barcode for direct lookup
        if (bottle.barcode_number) {
          assetMap[bottle.barcode_number] = {
            description: bottle.description || '',
            type: bottle.gas_type || bottle.type || '',
            size: bottle.size || '',
            group: bottle.gas_type || '',
            category: bottle.size || '',
            barcode: bottle.barcode_number || '',
            serial_number: bottle.serial_number || '',
            product_code: bottle.product_code || ''
          };
        }
      });
      setProductCodeToAssetInfo(assetMap);
    } catch (error) {
      logger.error('Error fetching bottles:', error);
    }
  }

  // Run location fix once when component mounts
  // useEffect(() => {
  //   fixImportLocations();
  // }, []); // Empty dependency array means it runs only once

  // Function to fix location values in import tables - REMOVED (table doesn't exist)
  // const fixImportLocations = async () => {
  //   try {
  //     const { error } = await supabase
  //       .from('import_approvals')
  //       .update({ location: 'SASKATOON' })
  //       .is('location', null);
  //     
  //     if (error) throw error;
  //     
  //     setSnackbar('Import locations fixed successfully');
  //     fetchData();
  //   } catch (error) {
  //     setError('Failed to fix import locations: ' + error.message);
  //   }
  // };

  // Helper to get scanned order by order/invoice number
  function getScannedOrder(orderNum) {
    return scannedOrders.find(
      o => (o.order_number || '').toString().trim() === (orderNum || '').toString().trim()
    );
  }

  // Automatic scanning functions
  const initializeScanner = () => {
    try {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 30, // High FPS for fast scanning
          qrbox: { width: 400, height: 200 },
          aspectRatio: 1.777778,
          supportedScanTypes: [
            Html5QrcodeScanType.SCAN_TYPE_CAMERA
          ],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true
        },
        false
      );

      scanner.render(
        (decodedText) => handleScanSuccess(decodedText),
        (error) => logger.debug('Scan error:', error)
      );

      scannerRef.current = scanner;
      setScannerActive(true);
    } catch (error) {
      logger.error('Failed to initialize scanner:', error);
      setError('Failed to initialize scanner: ' + error.message);
    }
  };

  const handleScanSuccess = async (scannedText) => {
    const startTime = Date.now();
    scanTimeRef.current = startTime;

    try {
      // Validate barcode format (9 digits for gas cylinders)
      if (!/^\d{9}$/.test(scannedText)) {
        addScanResult({
          barcode: scannedText,
          status: 'error',
          error: 'Invalid barcode format - must be exactly 9 digits',
          timestamp: new Date(),
          scanTime: 0
        });
        return;
      }

      // Check if already scanned
      if (scannedItems.some(item => item.barcode === scannedText)) {
        addScanResult({
          barcode: scannedText,
          status: 'error',
          error: 'Barcode already scanned',
          timestamp: new Date(),
          scanTime: 0
        });
        return;
      }

      // Process the scan
      const scanResult = await processScannedBarcode(scannedText);
      const scanTime = Date.now() - startTime;

      addScanResult({
        ...scanResult,
        scanTime,
        timestamp: new Date()
      });

      // Update stats
      setScanStats(prev => ({
        totalScans: prev.totalScans + 1,
        successfulScans: scanResult.status === 'success' ? prev.successfulScans + 1 : prev.successfulScans,
        errorScans: scanResult.status === 'error' ? prev.errorScans + 1 : prev.errorScans,
        avgScanTime: ((prev.avgScanTime * prev.totalScans) + scanTime) / (prev.totalScans + 1)
      }));

      // Auto-refresh data after successful scan
      if (scanResult.status === 'success') {
        setTimeout(() => fetchData(), 500);
      }

    } catch (error) {
      const scanTime = Date.now() - startTime;
      addScanResult({
        barcode: scannedText,
        status: 'error',
        error: error.message,
        timestamp: new Date(),
        scanTime
      });
    }
  };

  const processScannedBarcode = async (barcode) => {
    try {
      // Look up bottle information
      const { data: bottles, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('bottle_barcode', barcode);

      if (error) throw error;

      if (!bottles || bottles.length === 0) {
        return {
          status: 'error',
          error: 'Bottle not found in database',
          barcode
        };
      }

      const bottle = bottles[0];

      // Create scan record
      const { error: scanError } = await supabase
        .from('bottle_scans')
        .insert({
          bottle_barcode: barcode,
          product_code: bottle.product_code,
          scan_type: 'delivery',
          scan_date: new Date().toISOString(),
          location: bottle.location || 'Unknown',
          user_id: (await supabase.auth.getUser()).data.user?.id,
          created_at: new Date().toISOString()
        });

      if (scanError) throw scanError;

      return {
        status: 'success',
        barcode,
        product_code: bottle.product_code,
        description: bottle.description,
        location: bottle.location
      };

    } catch (error) {
      logger.error('Error processing scanned barcode:', error);
      return {
        status: 'error',
        error: error.message,
        barcode
      };
    }
  };

  const addScanResult = (result) => {
    setScannedItems(prev => [result, ...prev.slice(0, 49)]); // Keep last 50 scans
  };

  const startAutoScanning = () => {
    setAutoScanning(true);
    setScanDialog(true);
    initializeScanner();
  };

  const stopAutoScanning = () => {
    setAutoScanning(false);
    setScannerActive(false);
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanDialog(false);
  };

  const toggleScanning = () => {
    if (autoScanning) {
      stopAutoScanning();
    } else {
      startAutoScanning();
    }
  };

  const adjustScanSpeed = (speed) => {
    setScanSpeed(speed);
    if (scannerRef.current) {
      // Reinitialize scanner with new speed
      stopAutoScanning();
      setTimeout(() => startAutoScanning(), 100);
    }
  };

  // Real approval logic for invoices
  async function processInvoice(invoiceData) {
    try {
      // Parse the data structure - invoiceData is the row.data from imported_invoices
      const parsedData = parseDataField(invoiceData);
      const rows = parsedData.rows || parsedData.line_items || [];
      
      if (!rows || rows.length === 0) {
        return { success: false, error: 'No data found in import' };
      }

      // Get customer info from the first row
      const firstRow = rows[0];
      const customerId = firstRow.customer_id;
      const customerName = firstRow.customer_name;

      // Get invoice number from first row
      const invoiceNumber = firstRow.invoice_number || firstRow.reference_number || firstRow.order_number;
      if (!invoiceNumber) {
        return { success: false, error: 'No invoice number found' };
      }

      // Check if scanning has been done for this invoice
      const { data: scannedData } = await supabase
        .from('cylinder_scans')
        .select('*')
        .eq('order_number', invoiceNumber)
        .or(`invoice_number.eq.${invoiceNumber}`);

      if (!scannedData || scannedData.length === 0) {
        return { success: false, error: 'No scanning has been done for this invoice. Please scan the bottles before verification.' };
      }

      // Get or create customer with enhanced duplicate prevention
      let customer = null;
      
      // Get current user's organization for proper filtering
      if (!organization?.id) {
        return { success: false, error: 'User not assigned to an organization' };
      }
      
      // First, try to find customer by ID within the organization
      if (customerId) {
        const { data: existing } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('CustomerListID', customerId)
          .eq('organization_id', organization.id);
        
        if (existing && existing.length > 0) {
          customer = existing[0];
        }
      }
      
      // If not found by ID, try to find by name within the organization
      if (!customer && customerName) {
        const { data: existing } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .ilike('name', customerName)
          .eq('organization_id', organization.id);
        
        if (existing && existing.length > 0) {
          customer = existing[0];
        } else {
          // Create new customer with proper duplicate handling
          try {
            const newCustomerId = customerId || `80000448-${Date.now()}S`;
            const { data: created, error: createError } = await supabase
              .from('customers')
              .insert({
                name: customerName,
                CustomerListID: newCustomerId,
                organization_id: userProfile.organization_id,
                barcode: `*%${newCustomerId.toLowerCase().replace(/\s+/g, '')}*`,
                customer_barcode: `*%${newCustomerId.toLowerCase().replace(/\s+/g, '')}*`
              })
              .select('CustomerListID, name')
              .single();
            
            if (createError) {
              if (createError.code === '23505') {
                // Duplicate key error - customer already exists, try to find it
                const { data: existingCustomer } = await supabase
                  .from('customers')
                  .select('CustomerListID, name')
                  .eq('CustomerListID', newCustomerId)
                  .eq('organization_id', userProfile.organization_id)
                  .single();
                
                if (existingCustomer) {
                  customer = existingCustomer;
                } else {
                  return { success: false, error: 'Customer already exists in another organization' };
                }
              } else {
                return { success: false, error: `Error creating customer: ${createError.message}` };
              }
            } else {
              customer = created;
            }
          } catch (err) {
            return { success: false, error: `Error creating customer: ${err.message}` };
          }
        }
      }
      if (!customer) return { success: false, error: 'No customer found or created' };

      // Create invoice
      const { data: inv, error: invErr } = await supabase.from('invoices').insert({
        details: invoiceNumber,
        customer_id: customer.CustomerListID,
        invoice_date: firstRow.date || new Date().toISOString().split('T')[0],
        amount: 0
      }).select('id').single();
      if (invErr) return { success: false, error: invErr.message };

      // Create line items
      for (const row of rows) {
        const { error: lineItemError } = await supabase.from('invoice_line_items').insert({
          invoice_id: inv.id,
          product_code: row.product_code,
          qty_out: row.qty_out || 0,
          qty_in: row.qty_in || 0,
          description: row.description || row.product_code,
          rate: row.rate || 0,
          amount: row.amount || 0,
          serial_number: row.serial_number || row.product_code
        });
        if (lineItemError) {
          logger.error('Error creating line item:', lineItemError);
        }
      }

      const warnings = [];
      for (const scan of scannedData) {
        if (scan.cylinder_barcode) {
          // Check for existing open rental
          const { data: existingRental } = await supabase
            .from('rentals')
            .select('customer_id, rental_start_date')
            .eq('bottle_barcode', scan.cylinder_barcode)
            .is('rental_end_date', null)
            .single();

          if (existingRental && existingRental.customer_id !== customer.CustomerListID) {
            warnings.push({
              bottle: scan.cylinder_barcode,
              existingCustomer: existingRental.customer_id,
              newCustomer: customer.CustomerListID,
              message: `Bottle ${scan.cylinder_barcode} is currently rented to customer ${existingRental.customer_id} and will be reassigned to ${customer.CustomerListID}`
            });
          }

          // Update bottle assignment
          const { error: bottleError } = await supabase
            .from('bottles')
            .update({ 
              assigned_customer: customer.CustomerListID,
              last_location_update: new Date().toISOString()
            })
            .eq('barcode_number', scan.cylinder_barcode);
          
          if (bottleError) {
            logger.error('Error assigning bottle to customer:', bottleError);
          }

          // Create rental record for delivered bottles (qty_out > 0)
          if (scan.qty && scan.qty > 0) {
            // Get tax rate for the location
            let taxRate = 0;
            let taxCode = 'GST+PST';
            const rentalLocation = scan.location || 'SASKATOON';
            
            try {
              const { data: locationData } = await supabase
                .from('locations')
                .select('total_tax_rate')
                .eq('id', rentalLocation.toLowerCase())
                .single();
              
              if (locationData) {
                taxRate = locationData.total_tax_rate;
              }
            } catch (e) {
              logger.warn('Could not fetch tax rate for location:', rentalLocation);
            }

            const { error: rentalError } = await supabase
              .from('rentals')
              .insert({
                bottle_barcode: scan.cylinder_barcode,
                customer_id: customer.CustomerListID,
                rental_start_date: new Date().toISOString().split('T')[0],
                rental_end_date: null,
                rental_type: 'monthly',
                rental_amount: 0,
                location: rentalLocation,
                tax_code: taxCode,
                tax_rate: taxRate
              });
            
            if (rentalError) {
              logger.error('Error creating rental record:', rentalError);
            }
          }

          // End rental for returned bottles (qty_in > 0)
          if (scan.qty && scan.qty < 0) {
            const { error: rentalUpdateError } = await supabase
              .from('rentals')
              .update({ 
                rental_end_date: new Date().toISOString().split('T')[0]
              })
              .eq('bottle_barcode', scan.cylinder_barcode)
              .is('rental_end_date', null);
            
            if (rentalUpdateError) {
              logger.error('Error ending rental record:', rentalUpdateError);
            }

            // Remove customer assignment and mark as empty for returned bottles
            const { error: bottleUnassignError } = await supabase
              .from('bottles')
              .update({ 
                assigned_customer: null,
                status: 'empty',
                last_location_update: new Date().toISOString()
              })
              .eq('barcode_number', scan.cylinder_barcode);
            
            if (bottleUnassignError) {
              logger.error('Error unassigning bottle from customer:', bottleUnassignError);
            }
          }
        }
      }

      return { success: true, warnings: warnings };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Real approval logic for receipts
  async function processReceipt(receiptData) {
    try {
      // Parse the data structure - receiptData is the row.data from imported_sales_receipts
      const parsedData = parseDataField(receiptData);
      const rows = parsedData.rows || parsedData.line_items || [];
      
      if (!rows || rows.length === 0) {
        return { success: false, error: 'No data found in import' };
      }

      // Get customer info from the first row
      const firstRow = rows[0];
      const customerId = firstRow.customer_id;
      const customerName = firstRow.customer_name;

      // Get receipt number from first row
      const receiptNumber = firstRow.sales_receipt_number || firstRow.reference_number || firstRow.order_number;
      if (!receiptNumber) {
        return { success: false, error: 'No receipt number found' };
      }

      // Check if scanning has been done for this receipt
      const { data: scannedData } = await supabase
        .from('cylinder_scans')
        .select('*')
        .eq('order_number', receiptNumber)
        .or(`invoice_number.eq.${receiptNumber}`);

      if (!scannedData || scannedData.length === 0) {
        return { success: false, error: 'No scanning has been done for this receipt. Please scan the bottles before verification.' };
      }

      // Get or create customer with enhanced duplicate prevention
      let customer = null;
      
      // Get current user's organization for proper filtering
      if (!organization?.id) {
        return { success: false, error: 'User not assigned to an organization' };
      }
      
      // First, try to find customer by ID within the organization
      if (customerId) {
        const { data: existing } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('CustomerListID', customerId)
          .eq('organization_id', organization.id);
        
        if (existing && existing.length > 0) {
          customer = existing[0];
        }
      }
      
      // If not found by ID, try to find by name within the organization
      if (!customer && customerName) {
        const { data: existing } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .ilike('name', customerName)
          .eq('organization_id', organization.id);
        
        if (existing && existing.length > 0) {
          customer = existing[0];
        } else {
          // Create new customer with proper duplicate handling
          try {
            const newCustomerId = customerId || `80000448-${Date.now()}S`;
            const { data: created, error: createError } = await supabase
              .from('customers')
              .insert({
                name: customerName,
                CustomerListID: newCustomerId,
                organization_id: userProfile.organization_id,
                barcode: `*%${newCustomerId.toLowerCase().replace(/\s+/g, '')}*`,
                customer_barcode: `*%${newCustomerId.toLowerCase().replace(/\s+/g, '')}*`
              })
              .select('CustomerListID, name')
              .single();
            
            if (createError) {
              if (createError.code === '23505') {
                // Duplicate key error - customer already exists, try to find it
                const { data: existingCustomer } = await supabase
                  .from('customers')
                  .select('CustomerListID, name')
                  .eq('CustomerListID', newCustomerId)
                  .eq('organization_id', userProfile.organization_id)
                  .single();
                
                if (existingCustomer) {
                  customer = existingCustomer;
                } else {
                  return { success: false, error: 'Customer already exists in another organization' };
                }
              } else {
                return { success: false, error: `Error creating customer: ${createError.message}` };
              }
            } else {
              customer = created;
            }
          } catch (err) {
            return { success: false, error: `Error creating customer: ${err.message}` };
          }
        }
      }
      if (!customer) return { success: false, error: 'No customer found or created' };

      // Create receipt (using invoices table)
      const { data: receipt, error: receiptErr } = await supabase.from('invoices').insert({
        details: receiptNumber,
        customer_id: customer.CustomerListID,
        invoice_date: firstRow.date || new Date().toISOString().split('T')[0],
        amount: 0
      }).select('id').single();
      if (receiptErr) return { success: false, error: receiptErr.message };

      // Create line items
      for (const row of rows) {
        const { error: lineItemError } = await supabase.from('invoice_line_items').insert({
          invoice_id: receipt.id,
          product_code: row.product_code,
          qty_out: row.qty_out || 0,
          qty_in: row.qty_in || 0,
          description: row.description || row.product_code,
          rate: row.rate || 0,
          amount: row.amount || 0,
          serial_number: row.serial_number || row.product_code
        });
        if (lineItemError) {
          logger.error('Error creating line item:', lineItemError);
        }
      }

      const warnings = [];
      for (const scan of scannedData) {
        if (scan.cylinder_barcode) {
          // Check for existing open rental
          const { data: existingRental } = await supabase
            .from('rentals')
            .select('customer_id, rental_start_date')
            .eq('bottle_barcode', scan.cylinder_barcode)
            .is('rental_end_date', null)
            .single();

          if (existingRental && existingRental.customer_id !== customer.CustomerListID) {
            warnings.push({
              bottle: scan.cylinder_barcode,
              existingCustomer: existingRental.customer_id,
              newCustomer: customer.CustomerListID,
              message: `Bottle ${scan.cylinder_barcode} is currently rented to customer ${existingRental.customer_id} and will be reassigned to ${customer.CustomerListID}`
            });
          }

          // Update bottle assignment
          const { error: bottleError } = await supabase
            .from('bottles')
            .update({ 
              assigned_customer: customer.CustomerListID,
              last_location_update: new Date().toISOString()
            })
            .eq('barcode_number', scan.cylinder_barcode);
          
          if (bottleError) {
            logger.error('Error assigning bottle to customer:', bottleError);
          }

          // Create rental record for delivered bottles (qty_out > 0)
          if (scan.qty && scan.qty > 0) {
            // Get tax rate for the location
            let taxRate = 0;
            let taxCode = 'GST+PST';
            const rentalLocation = scan.location || 'SASKATOON';
            
            try {
              const { data: locationData } = await supabase
                .from('locations')
                .select('total_tax_rate')
                .eq('id', rentalLocation.toLowerCase())
                .single();
              
              if (locationData) {
                taxRate = locationData.total_tax_rate;
              }
            } catch (e) {
              logger.warn('Could not fetch tax rate for location:', rentalLocation);
            }

            const { error: rentalError } = await supabase
              .from('rentals')
              .insert({
                bottle_barcode: scan.cylinder_barcode,
                customer_id: customer.CustomerListID,
                rental_start_date: new Date().toISOString().split('T')[0],
                rental_end_date: null,
                rental_type: 'monthly',
                rental_amount: 0,
                location: rentalLocation,
                tax_code: taxCode,
                tax_rate: taxRate
              });
            
            if (rentalError) {
              logger.error('Error creating rental record:', rentalError);
            }
          }

          // End rental for returned bottles (qty_in > 0)
          if (scan.qty && scan.qty < 0) {
            const { error: rentalUpdateError } = await supabase
              .from('rentals')
              .update({ 
                rental_end_date: new Date().toISOString().split('T')[0]
              })
              .eq('bottle_barcode', scan.cylinder_barcode)
              .is('rental_end_date', null);
            
            if (rentalUpdateError) {
              logger.error('Error ending rental record:', rentalUpdateError);
            }

            // Remove customer assignment and mark as empty for returned bottles
            const { error: bottleUnassignError } = await supabase
              .from('bottles')
              .update({ 
                assigned_customer: null,
                status: 'empty',
                last_location_update: new Date().toISOString()
              })
              .eq('barcode_number', scan.cylinder_barcode);
            
            if (bottleUnassignError) {
              logger.error('Error unassigning bottle from customer:', bottleUnassignError);
            }
          }
        }
      }

      return { success: true, warnings: warnings };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Enhanced utility functions for professional display
  function getProductInfo(lineItem) {
    if (!lineItem) return {};
    
    // For scanned items, use barcode as the key to look up product info
    const barcode =
      lineItem.barcode ||
      lineItem.barcode_number ||
      lineItem.bottle_barcode ||
      lineItem.cylinder_barcode ||
      lineItem.BottleBarcode ||
      lineItem.Barcode ||
      '';
    const productCode = lineItem.product_code || lineItem.ProductCode || lineItem.Item || barcode || '';
    
    // Try to find asset info by barcode first, then by product code
    let assetInfo = {};
    
    // Look up by barcode if available
    if (barcode) {
      // Find bottle by barcode
      const bottleData = Object.values(productCodeToAssetInfo).find(info => 
        info.barcode === barcode || info.serial_number === barcode
      );
      if (bottleData) {
        assetInfo = bottleData;
      }
    }
    
    // Fallback to product code lookup
    if (!assetInfo.category && productCode) {
      assetInfo = productCodeToAssetInfo[productCode] || {};
    }
    
    return {
      productCode: productCode || barcode,
      category: assetInfo.category || lineItem.category || '',
      group: assetInfo.group || lineItem.group || '',
      type: assetInfo.type || lineItem.type || '',
      description: lineItem.description || assetInfo.description || productCode,
      billingCode: lineItem.billing_code || lineItem.BillingCode || productCode
    };
  }

  function getShippedQuantity(lineItem) {
    return parseInt(lineItem.qty_out || lineItem.QtyOut || lineItem.shipped || 0, 10);
  }

  function getReturnedQuantity(lineItem) {
    return parseInt(lineItem.qty_in || lineItem.QtyIn || lineItem.returned || 0, 10);
  }

  function getHighlightInfo(lineItem, productInfo) {
    // Check for discrepancies or issues that need highlighting
    const shipped = getShippedQuantity(lineItem);
    const returned = getReturnedQuantity(lineItem);
    
    // Red highlighting for exceptions
    if (shipped > 0 && returned > 0) {
      return { color: 'error', text: 'Both shipped and returned' };
    }
    
    // Check for missing product info
    if (!productInfo.category || !productInfo.group || !productInfo.type) {
      return { color: 'warning', text: 'Missing product info' };
    }
    
    // Green for normal items
    if (shipped > 0 || returned > 0) {
      return { color: 'success', text: 'OK' };
    }
    
    return { color: 'default', text: '-' };
  }

  // Enhanced function to get detailed line items with product information
  function getDetailedLineItems(data) {
    const lineItems = getLineItems(data);
    
    return lineItems.map(item => {
      const productInfo = getProductInfo(item);
      const shipped = getShippedQuantity(item);
      const returned = getReturnedQuantity(item);
      const highlight = getHighlightInfo(item, productInfo);
      
      return {
        ...item,
        productInfo,
        shipped,
        returned,
        highlight
      };
    });
  }

  function getCustomerInfo(data) {
    if (!data) return 'Unknown';
    
    // Try direct properties first (now set by splitImportIntoIndividualRecords)
    if (data.customer_name || data.CustomerName || data.Customer) {
      return data.customer_name || data.CustomerName || data.Customer;
    }
    
    // Try to get from rows array (fallback)
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0];
      if (firstRow.customer_name || firstRow.CustomerName || firstRow.Customer) {
        return firstRow.customer_name || firstRow.CustomerName || firstRow.Customer;
      }
    }
    
    // Try to get from line_items array
    if (data.line_items && data.line_items.length > 0) {
      const firstItem = data.line_items[0];
      if (firstItem.customer_name || firstItem.CustomerName || firstItem.Customer) {
        return firstItem.customer_name || firstItem.CustomerName || firstItem.Customer;
      }
    }
    
    // Try to get from summary
    if (data.summary && data.summary.customer_name) {
      return data.summary.customer_name;
    }
    
    return 'Unknown';
  }

  function getCustomerId(data) {
    if (!data) return null;
    
    // Try direct properties first
    if (data.customer_id || data.CustomerID || data.CustomerId || data.CustomerListID) {
      return data.customer_id || data.CustomerID || data.CustomerId || data.CustomerListID;
    }
    
    // Try to get from rows array
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0];
      if (firstRow.customer_id || firstRow.CustomerID || firstRow.CustomerId || firstRow.CustomerListID) {
        return firstRow.customer_id || firstRow.CustomerID || firstRow.CustomerId || firstRow.CustomerListID;
      }
    }
    
    // Try to get from line_items array
    if (data.line_items && data.line_items.length > 0) {
      const firstItem = data.line_items[0];
      if (firstItem.customer_id || firstItem.CustomerID || firstItem.CustomerId || firstItem.CustomerListID) {
        return firstItem.customer_id || firstItem.CustomerID || firstItem.CustomerId || firstItem.CustomerListID;
      }
    }
    
    return null;
  }

  function getLineItems(data) {
    if (!data) return [];
    
    logger.log('getLineItems called with:', data);
    
    // Try rows array first (THIS IS THE MAIN CASE for your imports)
    if (data.rows && Array.isArray(data.rows)) {
      logger.log('Found rows array with length:', data.rows.length);
      return data.rows;
    }
    
    // Try direct properties
    if (data.line_items && Array.isArray(data.line_items)) {
      return data.line_items;
    }
    
    if (data.LineItems && Array.isArray(data.LineItems)) {
      return data.LineItems;
    }
    
    if (data.items && Array.isArray(data.items)) {
      return data.items;
    }
    
    logger.log('No line items found, returning empty array');
    return [];
  }

  function getSalesOrderNumber(data, lineItems) {
    if (!data) return '';
    return data.sales_order_number || data.SalesOrderNumber || data.order_number || '';
  }

  function getScannedOrder(orderNum) {
    return scannedOrders.find(order => order.sales_order_number === orderNum);
  }

  function getStatus(invShip, scanShip, invReturn, scanReturn, scanned) {
    if (scanned && scanned > 0) {
      return 'Scanned';
    } else if (invShip > 0 || invReturn > 0) {
      return 'Pending Scan';
    } else {
      return 'No Items';
    }
  }

  function getUnmatchedScanStatus() { 
    return 'Unmatched Scan'; 
  }

  function getTrackedQty(lineItem) {
    return lineItem.tracked_qty || lineItem.TrackedQty || lineItem.quantity || 0;
  }

  function getTrackedReturnQty(lineItem) {
    return lineItem.tracked_return_qty || lineItem.TrackedReturnQty || lineItem.return_quantity || 0;
  }

  function inferStatus(group) {
    if (!group || group.length === 0) return 'No Data';
    
    const data = parseDataField(group[0].data);
    const lineItems = getLineItems(data);
    
    if (lineItems.length === 0) return 'No Items';
    
    const hasScanned = group.some(item => {
      const orderNum = getSalesOrderNumber(parseDataField(item.data), lineItems);
      return scannedCounts[orderNum] > 0;
    });
    
    return hasScanned ? 'Partially Scanned' : 'Pending Scan';
  }

  // Enhanced verification workflow component
  const VerificationWorkflow = ({ record, onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [stepData, setStepData] = useState({});
    const [processing, setProcessing] = useState(false);
    
    const handleStepComplete = (step, data) => {
      setStepData(prev => ({ ...prev, [step]: data }));
      if (step < VERIFICATION_STEPS.length - 1) {
        setCurrentStep(step + 1);
      } else {
        onComplete(stepData);
      }
    };
    
    return (
      <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <ApprovalIcon />
            <Typography variant="h6">Verification Workflow</Typography>
            <Chip 
              label={VERIFICATION_STATES[determineVerificationStatus(record)].label}
              color={VERIFICATION_STATES[determineVerificationStatus(record)].color}
              size="small"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={currentStep} orientation="vertical">
            {VERIFICATION_STEPS.map((step, index) => (
              <Step key={step.id}>
                <StepLabel 
                  icon={step.icon}
                  optional={
                    <Typography variant="caption">
                      {step.description}
                    </Typography>
                  }
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  {renderStepContent(step, index, record, handleStepComplete)}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => handleStepComplete(currentStep, stepData)}
            disabled={processing}
          >
            {currentStep === VERIFICATION_STEPS.length - 1 ? 'Complete' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Auto-verification function that assigns assets to customers
  const handleAutoVerify = async (record, onComplete, stepIndex) => {
    try {
      const data = parseDataField(record.data);
      const orderNumber = getOrderNumber(data);
      const customerName = getCustomerInfo(data);
      const customerId = data.customer_id || data.CustomerListID;
      
      logger.log('🔍 Auto-verifying order:', { orderNumber, customerName, customerId });
      
      // Get all scanned data for this order
      const { data: scannedData, error: scannedError } = await supabase
        .from('bottle_scans')
        .select('*')
        .eq('order_number', orderNumber)
        .eq('organization_id', organization.id);
      
      if (scannedError) {
        logger.error('❌ Error fetching scanned data:', scannedError);
        return;
      }
      
      logger.log('📦 Found scanned data:', scannedData?.length || 0);
      
      // Process each scanned item
      for (const scan of scannedData || []) {
        const barcode = scan.bottle_barcode || scan.barcode_number;
        const mode = scan.mode;
        
        logger.log('🔍 Processing scan:', { barcode, mode, customerName });
        
        if (mode === 'SHIP' || mode === 'out') {
          // SHIP: Assign to customer (rental)
          await assignAssetToCustomer(barcode, customerName, customerId, orderNumber);
        } else if (mode === 'RETURN' || mode === 'in') {
          // RETURN: Move to in-house/available
          await returnAssetToInventory(barcode, orderNumber);
        }
      }
      
      // Update the record status to verified
      await supabase
        .from('imported_invoices')
        .update({ status: 'verified' })
        .eq('id', record.id);
      
      logger.log('✅ Auto-verification completed');
      setSnackbar('✅ Order verified and assets assigned successfully!');
      onComplete(stepIndex, { verified: true, assetsAssigned: true });
      
      // Refresh the data to remove verified records from the list
      await fetchData();
      
    } catch (error) {
      logger.error('❌ Auto-verification failed:', error);
      onComplete(stepIndex, { verified: false, error: error.message });
    }
  };
  
  // Assign asset to customer (rental)
  const assignAssetToCustomer = async (barcode, customerName, customerId, orderNumber) => {
    try {
      // Find the bottle
      const { data: bottle, error: bottleError } = await supabase
        .from('bottles')
        .select('*')
        .eq('barcode_number', barcode)
        .eq('organization_id', organization.id)
        .single();
      
      if (bottleError || !bottle) {
        logger.error('❌ Bottle not found:', barcode);
        return;
      }
      
      // Update bottle status to RENTED
      const { error: updateError } = await supabase
        .from('bottles')
        .update({
          status: 'RENTED',
          assigned_customer: customerName,
          customer_id: customerId,
          rental_start_date: new Date().toISOString().split('T')[0],
          rental_order_number: orderNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', bottle.id);
      
      if (updateError) {
        logger.error('❌ Error updating bottle:', updateError);
        return;
      }
      
      // Create rental record
      const { error: rentalError } = await supabase
        .from('rentals')
        .insert({
          bottle_id: bottle.id,
          customer_name: customerName,
          customer_id: customerId,
          order_number: orderNumber,
          rental_start_date: new Date().toISOString().split('T')[0],
          status: 'ACTIVE',
          organization_id: organization.id,
          created_at: new Date().toISOString()
        });
      
      if (rentalError) {
        logger.error('❌ Error creating rental record:', rentalError);
        return;
      }
      
      logger.log('✅ Asset assigned to customer:', { barcode, customerName });
      
    } catch (error) {
      logger.error('❌ Error assigning asset:', error);
    }
  };
  
  // Return asset to inventory (in-house/available)
  const returnAssetToInventory = async (barcode, orderNumber) => {
    try {
      // Find the bottle
      const { data: bottle, error: bottleError } = await supabase
        .from('bottles')
        .select('*')
        .eq('barcode_number', barcode)
        .eq('organization_id', organization.id)
        .single();
      
      if (bottleError || !bottle) {
        logger.error('❌ Bottle not found:', barcode);
        return;
      }
      
      // Update bottle status to AVAILABLE
      const { error: updateError } = await supabase
        .from('bottles')
        .update({
          status: 'AVAILABLE',
          assigned_customer: null,
          customer_id: null,
          rental_start_date: null,
          rental_order_number: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', bottle.id);
      
      if (updateError) {
        logger.error('❌ Error updating bottle:', updateError);
        return;
      }
      
      // Update rental record if exists
      const { error: rentalError } = await supabase
        .from('rentals')
        .update({
          rental_end_date: new Date().toISOString().split('T')[0],
          status: 'RETURNED',
          return_order_number: orderNumber,
          updated_at: new Date().toISOString()
        })
        .eq('bottle_id', bottle.id)
        .is('rental_end_date', null);
      
      if (rentalError) {
        logger.error('❌ Error updating rental record:', rentalError);
        return;
      }
      
      logger.log('✅ Asset returned to inventory:', { barcode });
      
    } catch (error) {
      logger.error('❌ Error returning asset:', error);
    }
  };

  const renderStepContent = (step, index, record, onComplete) => {
    switch (step.id) {
      case 'import':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Data imported from external system
            </Typography>
            <PreviewJson data={parseDataField(record.data)} />
            <Button onClick={() => onComplete(index, { imported: true })}>
              Confirm Import
            </Button>
          </Box>
        );
      case 'validation':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Validating data integrity and format
            </Typography>
            <LinearProgress />
            <Button onClick={() => onComplete(index, { validated: true })}>
              Validation Complete
            </Button>
          </Box>
        );
      case 'matching':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Matching assets with existing inventory
            </Typography>
            <Button onClick={() => onComplete(index, { matched: true })}>
              Matching Complete
            </Button>
          </Box>
        );
      case 'verification':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Auto-verification will assign assets to customers and update inventory
            </Typography>
            <ButtonGroup>
              <Button 
                startIcon={<CheckCircleIcon />}
                onClick={() => handleAutoVerify(record, onComplete, index)}
                variant="contained"
                color="success"
              >
                Auto-Verify & Assign Assets
              </Button>
              <Button 
                startIcon={<ErrorIcon />}
                onClick={() => onComplete(index, { verified: false })}
                variant="outlined"
                color="error"
              >
                Reject
              </Button>
            </ButtonGroup>
          </Box>
        );
      case 'quantity_analysis':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Analyzing quantity discrepancies between shipped and returned items
            </Typography>
            <QuantityDiscrepancyDetector 
              orderNumber={getOrderNumber(parseDataField(record.data))}
              customerId={getCustomerInfo(parseDataField(record.data))?.id}
              organizationId={record.organization_id}
            />
            <Button onClick={() => onComplete(index, { analyzed: true })}>
              Analysis Complete
            </Button>
          </Box>
        );
      case 'processing':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Applying approved changes to system
            </Typography>
            <LinearProgress />
            <Button onClick={() => onComplete(index, { processed: true })}>
              Processing Complete
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  // Enhanced statistics dashboard
  const StatisticsCard = ({ title, value, color, icon, percentage }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" color={color}>
              {value}
            </Typography>
            {percentage && (
              <Typography variant="body2" color="textSecondary">
                {percentage}% of total
              </Typography>
            )}
          </Box>
          <Box color={color}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Enhanced Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Import Verification Center
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialog({ open: true })}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {/* Statistics Dashboard */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={6}>
          <StatisticsCard
            title="Total Records"
            value={verificationStats.total}
            color="primary.main"
            icon={<AssignmentIcon fontSize="large" />}
            percentage={100}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <StatisticsCard
            title="Pending"
            value={verificationStats.pending}
            color="warning.main"
            icon={<ScheduleIcon fontSize="large" />}
            percentage={verificationStats.total ? Math.round((verificationStats.pending / verificationStats.total) * 100) : 0}
          />
        </Grid>
      </Grid>

      {/* Enhanced Filters and Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <TextField
            placeholder="Search Records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <SearchIcon />
            }}
            sx={{
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                height: 40, // Match the height of other controls
              }
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
              <MenuItem value="exception">Exceptions</MenuItem>
              <MenuItem value="investigation">Investigating</MenuItem>
              <MenuItem value="in_progress">Processing</MenuItem>
              <MenuItem value="scanned_only">Scanned Only</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Location</InputLabel>
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              label="Location"
            >
              {getUniqueLocations().map(location => (
                <MenuItem key={location} value={location}>{location}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <ButtonGroup size="small">
            <Button
              variant={viewMode === 'list' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </Button>
          </ButtonGroup>
          <Button
            size="small"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterDialog({ open: true })}
          >
            Advanced Filters
          </Button>
        </Box>
      </Paper>

      {/* Import Records Header */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Import Records
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pendingInvoices.length} pending import{pendingInvoices.length !== 1 ? 's' : ''} requiring review
            </Typography>
          </Box>
          <Badge badgeContent={pendingInvoices.length} color="primary">
            <Button variant="outlined" disabled>
              Total Records
            </Button>
          </Badge>
        </Box>
      </Paper>

      {/* Bulk Actions Bar */}
      {selectedRecords.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'action.selected' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2">
              {selectedRecords.length} record(s) selected
            </Typography>
            <Divider orientation="vertical" flexItem />
            {VERIFICATION_ACTIONS.BULK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                startIcon={action.icon}
                color={action.color}
                onClick={() => setBulkActionDialog({ open: true, action })}
                size="small"
              >
                {action.label}
              </Button>
            ))}
            <Button
              onClick={() => setSelectedRecords([])}
              size="small"
            >
              Clear Selection
            </Button>
          </Box>
        </Paper>
      )}

      {/* Main Content Area */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        renderMainContent()
      )}

      {/* Verification Workflow Dialog */}
      {verificationDialog.open && (
        <VerificationWorkflow
          record={verificationDialog.record}
          onClose={() => setVerificationDialog({ open: false, record: null })}
          onComplete={(data) => {
            logger.log('Verification completed:', data);
            setVerificationDialog({ open: false, record: null });
            fetchData();
          }}
        />
      )}

      {/* Quantity Analysis Dialog */}
      {quantityAnalysisDialog.open && (
        <Dialog 
          open={quantityAnalysisDialog.open} 
          onClose={() => setQuantityAnalysisDialog({ 
            open: false, 
            orderNumber: null, 
            customerId: null, 
            organizationId: null 
          })}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <AssessmentIcon />
              <Typography variant="h6">
                Quantity Analysis - Order {quantityAnalysisDialog.orderNumber}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <QuantityDiscrepancyDetector
              orderNumber={quantityAnalysisDialog.orderNumber}
              customerId={quantityAnalysisDialog.customerId}
              organizationId={quantityAnalysisDialog.organizationId}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQuantityAnalysisDialog({ 
              open: false, 
              orderNumber: null, 
              customerId: null, 
              organizationId: null 
            })}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {VERIFICATION_ACTIONS.BULK_ACTIONS.map((action) => (
          <SpeedDialAction
            key={action.id}
            icon={action.icon}
            tooltipTitle={action.label}
            onClick={() => setBulkActionDialog({ open: true, action })}
          />
        ))}
      </SpeedDial>

      {/* Advanced Filters Dialog */}
      <Dialog 
        open={filterDialog.open} 
        onClose={() => setFilterDialog({ open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Advanced Filters</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="verified">Verified</MenuItem>
                    <MenuItem value="exception">Exception</MenuItem>
                    <MenuItem value="investigation">Investigation</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    label="Location"
                  >
                    {getUniqueLocations().map(location => (
                      <MenuItem key={location} value={location}>{location}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Search Orders, Customers, Product Codes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter order number, customer name, or product code..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSearch('');
            setStatusFilter('all');
            setLocationFilter('All');
          }}>
            Clear All
          </Button>
          <Button onClick={() => setFilterDialog({ open: false })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => setFilterDialog({ open: false })}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog 
        open={bulkActionDialog.open} 
        onClose={() => setBulkActionDialog({ open: false, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {bulkActionDialog.action?.label || 'Bulk Action'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to {bulkActionDialog.action?.label?.toLowerCase()} {selectedRecords.length} selected record(s)?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionDialog({ open: false, action: null })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color={bulkActionDialog.action?.color || 'primary'}
            onClick={async () => {
              try {
                setLoading(true);
                const actionId = bulkActionDialog.action?.id;
                const recordCount = selectedRecords.length;
                
                if (actionId === 'bulk_verify') {
                  const recordsToVerify = filteredInvoices.filter(invoice => 
                    selectedRecords.includes(invoice.id) && 
                    !(typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'))
                  );
                  await handleBulkVerify(recordsToVerify);
                } else if (actionId === 'bulk_reject') {
                  const recordsToReject = filteredInvoices.filter(invoice => 
                    selectedRecords.includes(invoice.id)
                  );
                  logger.log('Selected records:', selectedRecords);
                  logger.log('Filtered invoices:', filteredInvoices);
                  logger.log('Records to reject:', recordsToReject);
                  await handleBulkReject(recordsToReject);
                } else if (actionId === 'bulk_investigate') {
                  const recordsToInvestigate = filteredInvoices.filter(invoice => 
                    selectedRecords.includes(invoice.id) && 
                    !(typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'))
                  );
                  await handleBulkInvestigate(recordsToInvestigate);
                } else if (actionId === 'bulk_export') {
                  const recordsToExport = filteredInvoices.filter(invoice => 
                    selectedRecords.includes(invoice.id) && 
                    !(typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'))
                  );
                  await handleBulkExport(recordsToExport);
                } else {
                  logger.log('Unknown bulk action:', actionId);
                }
                
                setBulkActionDialog({ open: false, action: null });
                setSelectedRecords([]);
                setSnackbar(`${bulkActionDialog.action?.label} applied to ${recordCount} records`);
                
                // Refresh the data
                await fetchPendingInvoices();
                
              } catch (error) {
                logger.error('Bulk action failed:', error);
                logger.error('Error details:', {
                  message: error.message,
                  code: error.code,
                  details: error.details,
                  hint: error.hint,
                  action: bulkActionDialog.action?.id,
                  recordCount: selectedRecords.length
                });
                setSnackbar(`Failed to ${bulkActionDialog.action?.label?.toLowerCase()}: ${error.message}`);
              } finally {
                setLoading(false);
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Approve/Reject */}
      <Dialog 
        open={confirmationDialog.open} 
        onClose={() => setConfirmationDialog({ open: false, action: null, record: null, type: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {confirmationDialog.action === 'approve' ? 'Approve Record' : 'Reject Record'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to {confirmationDialog.action} this record?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action {confirmationDialog.action === 'reject' ? 'will mark the record as rejected and hide it from the pending list.' : 'will approve the record and assign bottles to customers.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationDialog({ open: false, action: null, record: null, type: null })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color={confirmationDialog.action === 'reject' ? 'error' : 'success'}
            onClick={async () => {
              try {
                setLoading(true);
                if (confirmationDialog.action === 'approve') {
                  await confirmApprove(confirmationDialog.type, confirmationDialog.record);
                } else if (confirmationDialog.action === 'reject') {
                  await confirmReject(confirmationDialog.type, confirmationDialog.record);
                }
                setConfirmationDialog({ open: false, action: null, record: null, type: null });
              } catch (error) {
                logger.error(`${confirmationDialog.action} failed:`, error);
                setSnackbar(`Failed to ${confirmationDialog.action} record: ${error.message}`);
              } finally {
                setLoading(false);
              }
            }}
          >
            {confirmationDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog 
        open={settingsDialog.open} 
        onClose={() => setSettingsDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Approval Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="Auto Refresh"
            />
            <FormControl fullWidth>
              <InputLabel>Refresh Interval</InputLabel>
              <Select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                label="Refresh Interval"
                disabled={!autoRefresh}
              >
                <MenuItem value={10000}>10 seconds</MenuItem>
                <MenuItem value={30000}>30 seconds</MenuItem>
                <MenuItem value={60000}>1 minute</MenuItem>
                <MenuItem value={300000}>5 minutes</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog({ open: false })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => setSettingsDialog({ open: false })}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          zIndex: 9999,
          marginTop: '80px' // Account for header/sidebar
        }}
      />
    </Box>
  );

  function renderMainContent() {
    return viewMode === 'grid' ? renderInvoicesGrid() : 
           viewMode === 'timeline' ? renderInvoicesTimeline() : 
           viewMode === 'list' ? renderInvoicesTab() :
           renderInvoicesTab(); // fallback
  }

  function renderInvoicesTab() {
    return (
      <Box sx={{ mt: 2 }}>
        {filteredInvoices.map(invoice => {
          const data = parseDataField(invoice.data);
          const orderNum = getOrderNumber(data);
          const customerInfo = getCustomerInfo(data);
          const recordDate = getRecordDate(data);
          
          // Get detailed items for this invoice
          const detailedItems = getDetailedLineItems(data);
          
          return (
            <Card 
              key={invoice.displayId || invoice.id}
              sx={{ 
                mb: 3,
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': { 
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Checkbox
                      checked={selectedRecords.includes(invoice.id)}
                      onChange={() => handleSelectRecord(invoice.id)}
                    />
                    <Chip
                      label={VERIFICATION_STATES[determineVerificationStatus(invoice)].label}
                      color={VERIFICATION_STATES[determineVerificationStatus(invoice)].color}
                      size="small"
                      icon={VERIFICATION_STATES[determineVerificationStatus(invoice)].icon}
                    />
                    <Box>
                      <Typography variant="h6" color="primary" fontWeight={600}>
                        {orderNum}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="primary"
                        sx={{ 
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          '&:hover': { 
                            color: 'primary.dark',
                            textDecoration: 'underline'
                          }
                        }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        const customerName = getCustomerInfo(data);
                        const customerId = getCustomerId(data);
                        logger.log('Customer click - Name:', customerName, 'ID:', customerId, 'Data:', data);
                        if (customerId) {
                          navigate(`/customer/${customerId}`);
                        } else {
                          // Try to find customer by name first
                          navigate(`/customers?search=${encodeURIComponent(customerName)}`);
                        }
                      }}
                      >
                        {customerInfo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {recordDate}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => navigate(`/import-approval/${invoice.originalId || invoice.id}/detail?customer=${encodeURIComponent(invoice.data.customer_name || '')}&order=${encodeURIComponent(invoice.data.order_number || invoice.data.reference_number || '')}`)}
                    >
                      View Scans
                    </Button>
                    {(() => {
                      const allMatch = detailedItems.every(item => {
                        const scannedOut = getScannedQty(orderNum, item.productInfo.productCode, 'out');
                        const scannedIn = getScannedQty(orderNum, item.productInfo.productCode, 'in');
                        return scannedOut === item.shipped && scannedIn === item.returned;
                      });
                      const hasScans = detailedItems.some(item => {
                        const scannedOut = getScannedQty(orderNum, item.productInfo.productCode, 'out');
                        const scannedIn = getScannedQty(orderNum, item.productInfo.productCode, 'in');
                        return scannedOut > 0 || scannedIn > 0;
                      });
                      
                      return allMatch && hasScans ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<ApprovalIcon />}
                          onClick={() => handleAutoVerify(invoice, () => {
                            logger.log('Auto-verification completed from main table');
                            setSnackbar('✅ Order verified and assets assigned successfully!');
                            fetchData();
                          }, 0)}
                        >
                          Auto-Verify
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<ApprovalIcon />}
                          onClick={() => handleApprove('invoice', invoice)}
                        >
                          Verify
                        </Button>
                      );
                    })()}
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<ErrorIcon />}
                      onClick={() => handleReject('invoice', invoice)}
                    >
                      Reject
                    </Button>
                  </Box>
                </Box>
                
                {/* Items */}
                <Box sx={{ mt: 2 }}>
                  {detailedItems.map((item, itemIndex) => {
                    const scannedOut = getScannedQty(orderNum, item.productInfo.productCode, 'out', invoice);
                    const scannedIn = getScannedQty(orderNum, item.productInfo.productCode, 'in', invoice);
                    const shipped = item.shipped;
                    const returned = item.returned;
                    const shippedMismatch = shipped !== scannedOut;
                    const returnedMismatch = returned !== scannedIn;
                    
                    return (
                      <Paper 
                        key={itemIndex}
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          border: '1px solid #f0f0f0',
                          borderRadius: 1,
                          backgroundColor: '#fafafa',
                          '&:hover': {
                            backgroundColor: '#f5f5f5',
                            borderColor: '#e0e0e0'
                          }
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={2}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Category
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {item.productInfo.category || '-'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Group
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {item.productInfo.group || '-'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Type
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {item.productInfo.type || '-'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Product Code
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color="primary">
                              {item.productInfo.productCode}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                              <Box sx={{ textAlign: 'center', minWidth: '60px' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  SHP
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  <Typography variant="body2" color="text.primary" fontWeight={600}>
                                    Trk: {scannedOut}
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    color={invoice.is_scanned_only ? 'text.secondary' : (shippedMismatch ? 'error.main' : 'text.primary')}
                                    fontWeight={600}
                                  >
                                    Inv: {invoice.is_scanned_only ? '?' : item.shipped}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ textAlign: 'center', minWidth: '60px' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  RTN
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  <Typography variant="body2" color="text.primary" fontWeight={600}>
                                    Trk: {scannedIn}
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    color={invoice.is_scanned_only ? 'text.secondary' : (returnedMismatch ? 'error.main' : 'text.primary')}
                                    fontWeight={600}
                                  >
                                    Inv: {invoice.is_scanned_only ? '?' : item.returned}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  }





  // Grid and Timeline view functions
  function renderInvoicesGrid() {
    logger.log('renderInvoicesGrid called with filteredInvoices:', filteredInvoices);
    
    return (
      <Grid container spacing={3}>
        {filteredInvoices.map((invoice) => {
          const data = parseDataField(invoice.data);
          const detailedItems = getDetailedLineItems(data);
          const orderNum = getOrderNumber(data);
          const customerInfo = getCustomerInfo(data);
          const customerId = getCustomerId(data);
          const recordDate = getRecordDate(data);
          const status = determineVerificationStatus(invoice);
          
          logger.log('Processing invoice:', { 
            id: invoice.id, 
            orderNum, 
            customerInfo, 
            customerId, 
            organizationId: invoice.organization_id,
            detailedItemsLength: detailedItems.length 
          });
          
          return (
            <Grid item xs={12} sm={6} md={4} key={invoice.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': { elevation: 4 }
                }}
                onClick={() => navigate(`/import-approval/${invoice.originalId || invoice.id}/detail?customer=${encodeURIComponent(invoice.data.customer_name || '')}&order=${encodeURIComponent(invoice.data.order_number || invoice.data.reference_number || '')}`)}
              >
                <CardHeader
                  title={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h6" component="span">
                        {orderNum}
                      </Typography>
                      <Chip
                        label={VERIFICATION_STATES[status].label}
                        color={VERIFICATION_STATES[status].color}
                        size="small"
                        icon={VERIFICATION_STATES[status].icon}
                      />
                    </Box>
                  }
                  subheader={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { 
                          color: 'primary.main',
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        logger.log('Grid customer click - Info:', customerInfo, 'ID:', customerId, 'Data:', data);
                        if (customerId) {
                          navigate(`/customer/${customerId}`);
                        } else {
                          navigate(`/customers?search=${encodeURIComponent(customerInfo)}`);
                        }
                      }}
                    >
                      {customerInfo}
                    </Typography>
                  }
                  action={
                    <Checkbox
                      checked={selectedRecords.includes(invoice.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectRecord(invoice.id);
                      }}
                      color={typeof invoice.id === 'string' && invoice.id.startsWith('scanned_') ? 'warning' : 'primary'}
                      title={typeof invoice.id === 'string' && invoice.id.startsWith('scanned_') ? 'Scanned-only record - individual actions only' : ''}
                    />
                  }
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Date: {recordDate}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {detailedItems.length} line item(s)
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {detailedItems.slice(0, 3).map((item, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" display="block" fontWeight={600}>
                          {item.productInfo.productCode || item.barcode || '-'}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Cat: {item.productInfo.category || '-'} | 
                          Grp: {item.productInfo.group || '-'} | 
                          Type: {item.productInfo.type || '-'}
                        </Typography>
                        <Typography variant="caption" color="primary">
                          SHP: {item.shipped} | RTN: {item.returned}
                        </Typography>
                      </Box>
                    ))}
                    {detailedItems.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{detailedItems.length - 3} more items...
                      </Typography>
                    )}
                  </Box>
                  
                  {/* Quantity Display */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Debug: About to render QuantityDiscrepancyDetector
                    </Typography>
                    <QuantityDiscrepancyDetector 
                      orderNumber={orderNum}
                      customerId={customerId}
                      organizationId={invoice.organization_id}
                    />
                  </Box>
                  
                  {/* Action Buttons */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                    {invoice.is_scanned_only ? (
                      // Special actions for scanned-only records
                      <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/import-approval/${invoice.id}/detail?customer=${encodeURIComponent(invoice.data.customer_name || '')}&order=${encodeURIComponent(invoice.data.order_number || invoice.data.reference_number || '')}`);
                          }}
                        >
                          View Scans
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<UnarchiveIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/import');
                          }}
                        >
                          Upload Invoice
                        </Button>
                      </Box>
                    ) : (
                      // Regular actions for imported records
                      <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/import-approval/${invoice.id}/detail?customer=${encodeURIComponent(invoice.data.customer_name || '')}&order=${encodeURIComponent(invoice.data.order_number || invoice.data.reference_number || '')}`);
                          }}
                        >
                          Details
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<ApprovalIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setVerificationDialog({ open: true, record: invoice });
                          }}
                        >
                          Verify
                        </Button>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  }

  function renderInvoicesTimeline() {
    const sortedInvoices = [...filteredInvoices].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    return (
      <Box>
        {sortedInvoices.map((invoice, index) => {
          const data = parseDataField(invoice.data);
          const orderNum = getOrderNumber(data);
          const customerInfo = getCustomerInfo(data);
          const recordDate = getRecordDate(data);
          const status = determineVerificationStatus(invoice);
          
          return (
            <Box key={invoice.displayId || invoice.id} sx={{ display: 'flex', mb: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: VERIFICATION_STATES[status].color === 'success' ? 'success.main' : 
                             VERIFICATION_STATES[status].color === 'error' ? 'error.main' :
                             VERIFICATION_STATES[status].color === 'warning' ? 'warning.main' : 'info.main',
                    mt: 1
                  }}
                />
                {index < sortedInvoices.length - 1 && (
                  <Box
                    sx={{
                      width: 2,
                      flexGrow: 1,
                      bgcolor: 'divider',
                      minHeight: 60
                    }}
                  />
                )}
              </Box>
              <Paper sx={{ flexGrow: 1, p: 2 }}>
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Typography variant="h6">{orderNum}</Typography>
                  <Chip
                    label={VERIFICATION_STATES[status].label}
                    color={VERIFICATION_STATES[status].color}
                    size="small"
                    icon={VERIFICATION_STATES[status].icon}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(invoice.created_at).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Customer: {customerInfo}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {recordDate}
                </Typography>
                
                {/* Add QuantityDiscrepancyDetector to timeline view */}
                <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #e0e0e0' }}>
                  <QuantityDiscrepancyDetector 
                    orderNumber={orderNum}
                    customerId={getCustomerId(data)}
                    organizationId={invoice.organization_id}
                  />
                </Box>
                
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  {invoice.is_scanned_only ? (
                    // Special actions for scanned-only records
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/import-approval/${invoice.originalId || invoice.id}/detail?customer=${encodeURIComponent(invoice.data.customer_name || '')}&order=${encodeURIComponent(invoice.data.order_number || invoice.data.reference_number || '')}`)}
                      >
                        View Scans
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<UnarchiveIcon />}
                        onClick={() => navigate('/import')}
                      >
                        Upload Invoice
                      </Button>
                    </>
                  ) : (
                    // Regular actions for imported records
                    <>
                      <Button
                        size="small"
                        onClick={() => navigate(`/import-approval/${invoice.originalId || invoice.id}/detail?customer=${encodeURIComponent(invoice.data.customer_name || '')}&order=${encodeURIComponent(invoice.data.order_number || invoice.data.reference_number || '')}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<ApprovalIcon />}
                        onClick={() => handleApprove('invoice', invoice)}
                      >
                        Verify
                      </Button>
                    </>
                  )}
                  <Checkbox
                    size="small"
                    checked={selectedRecords.includes(invoice.id)}
                    onChange={() => handleSelectRecord(invoice.id)}
                    disabled={typeof invoice.id === 'string' && invoice.id.startsWith('scanned_')}
                    title={typeof invoice.id === 'string' && invoice.id.startsWith('scanned_') ? 'Scanned-only records cannot be bulk processed' : ''}
                  />
                </Box>
              </Paper>
            </Box>
          );
        })}
      </Box>
    );
  }

  function renderReceiptsGrid() {
    return (
      <Grid container spacing={2}>
        {filteredReceipts.map((receipt) => {
          const data = parseDataField(receipt.data);
          const detailedItems = getDetailedLineItems(data);
          const orderNum = getOrderNumber(data);
          const customerInfo = getCustomerInfo(data);
          const recordDate = getRecordDate(data);
          const status = determineVerificationStatus(receipt);
          
          return (
            <Grid item xs={12} sm={6} md={4} key={receipt.displayId || receipt.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': { elevation: 4 }
                }}
                onClick={() => navigate(`/import-approval/${receipt.id}/detail?customer=${encodeURIComponent(receipt.data.customer_name || '')}&order=${encodeURIComponent(receipt.data.order_number || receipt.data.reference_number || '')}`)}
              >
                <CardHeader
                  title={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h6" component="span">
                        {orderNum}
                      </Typography>
                      <Chip
                        label={VERIFICATION_STATES[status].label}
                        color={VERIFICATION_STATES[status].color}
                        size="small"
                        icon={VERIFICATION_STATES[status].icon}
                      />
                    </Box>
                  }
                  subheader={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { 
                          color: 'primary.main',
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const customerId = getCustomerId(data);
                        if (customerId) {
                          navigate(`/customer/${customerId}`);
                        } else {
                          navigate(`/customers?search=${encodeURIComponent(customerInfo)}`);
                        }
                      }}
                    >
                      {customerInfo}
                    </Typography>
                  }
                  action={
                    <Checkbox
                      checked={selectedRecords.includes(receipt.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectRecord(receipt.id);
                      }}
                    />
                  }
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Date: {recordDate}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {detailedItems.length} line item(s)
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {detailedItems.slice(0, 3).map((item, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" display="block" fontWeight={600}>
                          {item.productInfo.productCode || item.barcode || '-'}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Cat: {item.productInfo.category || '-'} | 
                          Grp: {item.productInfo.group || '-'} | 
                          Type: {item.productInfo.type || '-'}
                        </Typography>
                        <Typography variant="caption" color="primary">
                          SHP: {item.shipped} | RTN: {item.returned}
                        </Typography>
                      </Box>
                    ))}
                    {detailedItems.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{detailedItems.length - 3} more items...
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  }

  function renderReceiptsTimeline() {
    const sortedReceipts = [...filteredReceipts].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    return (
      <Box>
        {sortedReceipts.map((receipt, index) => {
          const data = parseDataField(receipt.data);
          const orderNum = getOrderNumber(data);
          const customerInfo = getCustomerInfo(data);
          const recordDate = getRecordDate(data);
          const status = determineVerificationStatus(receipt);
          
          return (
            <Box key={receipt.displayId || receipt.id} sx={{ display: 'flex', mb: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: VERIFICATION_STATES[status].color === 'success' ? 'success.main' : 
                             VERIFICATION_STATES[status].color === 'error' ? 'error.main' :
                             VERIFICATION_STATES[status].color === 'warning' ? 'warning.main' : 'info.main',
                    mt: 1
                  }}
                />
                {index < sortedReceipts.length - 1 && (
                  <Box
                    sx={{
                      width: 2,
                      flexGrow: 1,
                      bgcolor: 'divider',
                      minHeight: 60
                    }}
                  />
                )}
              </Box>
              <Paper sx={{ flexGrow: 1, p: 2 }}>
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Typography variant="h6">{orderNum}</Typography>
                  <Chip
                    label={VERIFICATION_STATES[status].label}
                    color={VERIFICATION_STATES[status].color}
                    size="small"
                    icon={VERIFICATION_STATES[status].icon}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(receipt.created_at).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Customer: <Typography 
                    component="span"
                    sx={{ 
                      cursor: 'pointer',
                      color: 'primary.main',
                      '&:hover': { 
                        textDecoration: 'underline'
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const customerId = getCustomerId(data);
                      logger.log('Receipt customer click - Info:', customerInfo, 'ID:', customerId, 'Data:', data);
                      if (customerId) {
                        navigate(`/customer/${customerId}`);
                      } else {
                        navigate(`/customers?search=${encodeURIComponent(customerInfo)}`);
                      }
                    }}
                  >
                    {customerInfo}
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {recordDate}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => navigate(`/import-approval/${receipt.id}/detail?customer=${encodeURIComponent(receipt.data.customer_name || '')}&order=${encodeURIComponent(receipt.data.order_number || receipt.data.reference_number || '')}`)}
                  >
                    View Details
                  </Button>
                  <Checkbox
                    size="small"
                    checked={selectedRecords.includes(receipt.id)}
                    onChange={() => handleSelectRecord(receipt.id)}
                  />
                </Box>
              </Paper>
            </Box>
          );
        })}
      </Box>
    );
  }

  // Enhanced action handlers
  function requestApprove(type, row) {
    setConfirmationDialog({
      open: true,
      action: 'approve',
      record: row,
      type: type
    });
  }

  function requestReject(type, row) {
    setConfirmationDialog({
      open: true,
      action: 'reject',
      record: row,
      type: type
    });
  }

  async function confirmApprove(type, row) {
    try {
      const tableName = type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts';
      const { error } = await supabase
        .from(tableName)
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString(),
          verified: true
        })
        .eq('id', row.id);
      
      if (error) throw error;
      
      // Assign bottles to customers after approval
      await assignBottlesToCustomer(row);
      
      setSnackbar('Record approved successfully and bottles assigned to customers');
      await fetchData();
    } catch (error) {
      setError('Failed to approve record: ' + error.message);
    }
  }

  async function confirmReject(type, row) {
    try {
      // Handle scanned-only records
      if (typeof row.id === 'string' && row.id.startsWith('scanned_')) {
        const orderNumber = row.id.replace('scanned_', '');
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        // Mark all scans for this order as rejected in scans table
        const { error: scanError } = await supabase
          .from('scans')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: currentUser.id
          })
          .eq('order_number', orderNumber);
        
        if (scanError) throw scanError;
        
        // Delete bottle_scans for this order (since it has no status column)
        const { error: bottleScanError } = await supabase
          .from('bottle_scans')
          .delete()
          .eq('order_number', orderNumber);
        
        if (bottleScanError) {
          logger.error('Error deleting bottle_scans:', bottleScanError);
        }
        
        setSnackbar('Scanned records rejected successfully');
        await fetchData();
        return;
      }
      
      // Handle regular imported records
      const tableName = type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts';
      const { error } = await supabase
        .from(tableName)
        .update({ 
          status: 'rejected', 
          rejected_at: new Date().toISOString(),
          verified: false
        })
        .eq('id', row.id);
      
      if (error) throw error;
      
      setSnackbar('Record rejected successfully');
      await fetchData();
    } catch (error) {
      setError('Failed to reject record: ' + error.message);
    }
  }

  async function handleApprove(type, row) {
    requestApprove(type, row);
  }

  async function handleReject(type, row) {
    requestReject(type, row);
  }

  async function handleDelete(type, row) {
    try {
      const tableName = type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', row.id);
      
      if (error) throw error;
      
      setSnackbar('Record deleted successfully');
      await fetchData();
    } catch (error) {
      setError('Failed to delete record: ' + error.message);
    }
  }

  // Check if scanned quantities match invoice quantities for auto-approval
  async function checkQuantityMatch(record) {
    try {
      const data = parseDataField(record.data);
      const rows = data.rows || data.line_items || [];
      const orderNumber = data.order_number || data.reference_number || data.invoice_number;
      
      if (!orderNumber) {
        logger.log('No order number found for quantity check');
        return false;
      }

      // Get scanned quantities for this order
      const { data: scannedData, error: scannedError } = await supabase
        .from('scans')
        .select('*')
        .eq('order_number', orderNumber);

      if (scannedError) {
        logger.error('Error fetching scanned data:', scannedError);
        return false;
      }

      // Group scanned data by product code
      const scannedQuantities = {};
      (scannedData || []).forEach(scan => {
        const productCode = scan.product_code || scan.barcode_number || scan.bottle_barcode;
        if (!scannedQuantities[productCode]) {
          scannedQuantities[productCode] = { shipped: 0, returned: 0 };
        }
        
        if (scan.action === 'out') {
          scannedQuantities[productCode].shipped++;
        } else if (scan.action === 'in') {
          scannedQuantities[productCode].returned++;
        }
      });

      // Check if invoice quantities match scanned quantities
      let allQuantitiesMatch = true;
      
      for (const row of rows) {
        const productCode = row.product_code || row.barcode_number || row.bottle_barcode;
        const invoiceShipped = parseInt(row.qty_out || row.shipped || row.quantity || 0);
        const invoiceReturned = parseInt(row.qty_in || row.returned || row.return_qty || 0);
        
        const scannedQty = scannedQuantities[productCode] || { shipped: 0, returned: 0 };
        
        if (invoiceShipped !== scannedQty.shipped || invoiceReturned !== scannedQty.returned) {
          logger.log(`Quantity mismatch for ${productCode}: Invoice(${invoiceShipped}/${invoiceReturned}) vs Scanned(${scannedQty.shipped}/${scannedQty.returned})`);
          allQuantitiesMatch = false;
          break;
        }
      }

      return allQuantitiesMatch;
    } catch (error) {
      logger.error('Error checking quantity match:', error);
      return false;
    }
  }

  // Auto-approve record if quantities match
  async function autoApproveIfQuantitiesMatch(record) {
    try {
      const quantitiesMatch = await checkQuantityMatch(record);
      
      if (quantitiesMatch) {
        logger.log(`✅ Auto-approving existing record ${record.id} - quantities match`);
        
        // Update record status to approved
        const tableName = record.is_scanned_only ? 'imported_invoices' : 'imported_invoices';
        const { error } = await supabase
          .from(tableName)
          .update({ 
            status: 'approved', 
            approved_at: new Date().toISOString(),
            verified: true,
            auto_approved: true,
            auto_approval_reason: 'Quantities match between invoice and scanned data'
          })
          .eq('id', record.id);
        
        if (error) {
          logger.error('Error auto-approving record:', error);
          return false;
        }
        
        // Assign bottles to customers
        await assignBottlesToCustomer(record);
        
        return true;
      } else {
        logger.log(`❌ Not auto-approving existing record ${record.id} - quantities don't match`);
        return false;
      }
    } catch (error) {
      logger.error('Error in auto-approval:', error);
      return false;
    }
  }

  // Assign bottles to customers after approval
  async function assignBottlesToCustomer(record) {
    try {
      const data = parseDataField(record.data);
      const rows = data.rows || data.line_items || [];
      
      for (const row of rows) {
        if (row.product_code || row.bottle_barcode || row.barcode) {
          // Find the bottle by barcode or product code
          const bottleQuery = row.bottle_barcode || row.barcode
            ? { barcode_number: row.bottle_barcode || row.barcode }
            : { product_code: row.product_code };
          
          const { data: bottles, error: bottleError } = await supabase
            .from('bottles')
            .select('*')
            .match(bottleQuery)
            .limit(1);
          
          if (bottleError) {
            logger.error('Error finding bottle:', bottleError);
            continue;
          }
          
          if (bottles && bottles.length > 0) {
            const bottle = bottles[0];
            const customerName = row.customer_name || data.customer_name;
            
            // Update bottle with customer assignment
            const { error: updateError } = await supabase
              .from('bottles')
              .update({
                assigned_customer: customerName,
                customer_name: customerName,
                status: 'RENTED',
                rental_start_date: new Date().toISOString().split('T')[0], // DATE format
                updated_at: new Date().toISOString()
              })
              .eq('id', bottle.id);
            
            if (updateError) {
              logger.error('Error updating bottle:', updateError);
            } else {
              logger.log(`✅ Assigned bottle ${bottle.barcode_number} to customer ${customerName}`);
              
              // Create rental record if it doesn't exist
              await createRentalRecord(bottle, customerName, row);
            }
          } else {
            logger.warn(`⚠️ Bottle not found for barcode: ${row.bottle_barcode || row.barcode || row.product_code}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error assigning bottles to customer:', error);
    }
  }

  // Create rental record for assigned bottle
  async function createRentalRecord(bottle, customerName, row) {
    try {
      // Check if rental record already exists
      const { data: existingRental } = await supabase
        .from('rentals')
        .select('id')
        .eq('bottle_barcode', bottle.barcode_number)
        .is('rental_end_date', null)
        .limit(1);

      if (existingRental && existingRental.length > 0) {
        logger.log(`Rental record already exists for bottle ${bottle.barcode_number}`);
        return;
      }

      // Create new rental record
      const { error: rentalError } = await supabase
        .from('rentals')
        .insert({
          bottle_id: bottle.id,
          bottle_barcode: bottle.barcode_number,
          customer_id: customerName,
          customer_name: customerName,
          rental_start_date: new Date().toISOString().split('T')[0],
          rental_end_date: null,
          rental_amount: 10, // Default rental amount
          rental_type: 'monthly',
          tax_code: 'GST+PST',
          tax_rate: 0.11,
          location: bottle.location || 'SASKATOON',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (rentalError) {
        logger.error('Error creating rental record:', rentalError);
      } else {
        logger.log(`✅ Created rental record for bottle ${bottle.barcode_number}`);
      }
    } catch (error) {
      logger.error('Error creating rental record:', error);
    }
  }

  // Bulk verify records
  async function handleBulkVerify(records) {
    // Get current user ID
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Update each record individually to avoid upsert issues
    for (const record of records) {
      // Check if this is a scanned-only record that shouldn't be processed
      if (typeof record.id === 'string' && record.id.startsWith('scanned_')) {
        logger.log('Skipping scanned-only record:', record.id);
        continue;
      }
      
      // Extract numeric part from ID (e.g., "scanned_55555" -> 55555)
      let recordId;
      if (typeof record.id === 'string') {
        const numericPart = record.id.match(/\d+/);
        recordId = numericPart ? parseInt(numericPart[0], 10) : record.id;
      } else {
        recordId = record.id;
      }
      
      if (isNaN(recordId)) {
        logger.error('Cannot convert ID to number:', record.id);
        throw new Error(`Invalid ID format: ${record.id}`);
      }
      
      const { error } = await supabase
        .from('imported_invoices')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: currentUser.id
        })
        .eq('id', recordId);

      if (error) throw error;
    }

    // Assign bottles to customers for each approved record
    for (const record of records) {
      await assignBottlesToCustomer(record);
    }
    
    // Refresh the data to remove verified records from the list
    await fetchData();
  }

  // Bulk reject records
  async function handleBulkReject(records) {
    logger.log('Starting bulk reject for records:', records);
    
    // Get current user ID
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    logger.log('Current user ID:', currentUser.id);

    // Update each record individually to avoid upsert issues
    for (const record of records) {
      logger.log('Processing record:', record);
      logger.log('Record ID:', record.id, 'Type:', typeof record.id);
      
      // Check if this is a scanned-only record that needs special handling
      if (typeof record.id === 'string' && record.id.startsWith('scanned_')) {
        logger.log('Processing scanned-only record:', record.id);
        
        // Extract order number from scanned_ prefix
        const orderNumber = record.id.replace('scanned_', '');
        
        // Mark all scans for this order as rejected
        logger.log('Attempting to reject scans for order:', orderNumber);
        const { data: updateData, error: scanError } = await supabase
          .from('scans')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: currentUser.id
          })
          .eq('order_number', orderNumber)
          .select();
        
        if (scanError) {
          logger.error('Error rejecting scans for order:', orderNumber, scanError);
          // Continue with other records even if this one fails
        } else {
          logger.log('Successfully marked scans as rejected for order:', orderNumber, 'Updated records:', updateData);
        }
        continue;
      }
      
      // Extract numeric part from ID (e.g., "scanned_55555" -> 55555)
      let recordId;
      if (typeof record.id === 'string') {
        const numericPart = record.id.match(/\d+/);
        recordId = numericPart ? parseInt(numericPart[0], 10) : record.id;
      } else {
        recordId = record.id;
      }
      
      logger.log('Converted ID:', recordId, 'Type:', typeof recordId);
      
      if (isNaN(recordId)) {
        logger.error('Cannot convert ID to number:', record.id);
        throw new Error(`Invalid ID format: ${record.id}`);
      }
      
      // Check if record exists in imported_invoices table
      const { data: existingRecord, error: checkError } = await supabase
        .from('imported_invoices')
        .select('id, status')
        .eq('id', recordId)
        .single();
      
      if (checkError) {
        logger.error('Record not found in imported_invoices:', recordId, checkError);
        
        // Check if it's in the scans table instead
        const { data: scanRecord, error: scanError } = await supabase
          .from('scans')
          .select('id, action')
          .eq('id', recordId)
          .single();
        
        if (scanError) {
          logger.error('Record not found in scans table either:', recordId, scanError);
          
          // Check other possible tables
          logger.log('Checking other tables for record:', recordId);
          
          // Check bottle_scans table
          const { data: bottleScanRecord, error: bottleScanError } = await supabase
            .from('bottle_scans')
            .select('id, action')
            .eq('id', recordId)
            .single();
          
          if (!bottleScanError) {
            logger.log('Found record in bottle_scans table:', bottleScanRecord);
            logger.log('Skipping bottle_scan record:', recordId);
            continue;
          }
          
          // Check sales_orders table
          const { data: salesOrderRecord, error: salesOrderError } = await supabase
            .from('sales_orders')
            .select('id, sales_order_number')
            .eq('id', recordId)
            .single();
          
          if (!salesOrderError) {
            logger.log('Found record in sales_orders table:', salesOrderRecord);
            logger.log('Skipping sales_order record:', recordId);
            continue;
          }
          
          // Check imported_sales_receipts table
          const { data: receiptRecord, error: receiptError } = await supabase
            .from('imported_sales_receipts')
            .select('id, status')
            .eq('id', recordId)
            .single();
          
          if (!receiptError) {
            logger.log('Found record in imported_sales_receipts table:', receiptRecord);
            logger.log('Skipping sales_receipt record:', recordId);
            continue;
          }
          
          logger.error('Record not found in any table:', recordId);
          
          // Check if this might be a "scanned only" record that shouldn't be rejected
          if (record.displayId && record.displayId.startsWith('scanned_')) {
            logger.log('This appears to be a scanned-only record, skipping rejection:', recordId);
            continue;
          }
          
          throw new Error(`Record with ID ${recordId} not found in any table`);
        }
        
        logger.log('Found record in scans table:', scanRecord);
        // Skip this record as it's not an imported invoice
        logger.log('Skipping scan record:', recordId);
        continue;
      }
      
      logger.log('Found existing record in imported_invoices:', existingRecord);
      
      const { error } = await supabase
        .from('imported_invoices')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: currentUser.id
        })
        .eq('id', recordId);

      if (error) {
        logger.error('Error updating record:', recordId, error);
        logger.error('Record details:', record);
        throw error;
      }
      logger.log('Successfully updated record:', recordId);
    }
  }

  // Individual reject record
  async function handleIndividualReject(record) {
    logger.log('Starting individual reject for record:', record);
    
    // Get current user ID
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    logger.log('Current user ID:', currentUser.id);

    // Check if this is a scanned-only record
    if (typeof record.id === 'string' && record.id.startsWith('scanned_')) {
      logger.log('Cannot reject scanned-only record:', record.id);
      setSnackbar('Scanned-only records cannot be rejected individually. Use bulk reject instead.');
      return;
    }
    
    // Extract numeric part from ID (e.g., "scanned_55555" -> 55555)
    let recordId;
    if (typeof record.id === 'string') {
      const numericPart = record.id.match(/\d+/);
      recordId = numericPart ? parseInt(numericPart[0], 10) : record.id;
    } else {
      recordId = record.id;
    }
    
    logger.log('Converted ID:', recordId, 'Type:', typeof recordId);
    
    if (isNaN(recordId)) {
      logger.error('Cannot convert ID to number:', record.id);
      throw new Error(`Invalid ID format: ${record.id}`);
    }
    
    try {
      // Check if record exists in imported_invoices table
      const { data: existingRecord, error: checkError } = await supabase
        .from('imported_invoices')
        .select('id, status')
        .eq('id', recordId)
        .single();
      
      if (checkError) {
        logger.error('Record not found in imported_invoices:', recordId, checkError);
        setSnackbar('Record not found in database');
        return;
      }

      // Update the record
      const { error } = await supabase
        .from('imported_invoices')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: currentUser.id
        })
        .eq('id', recordId);

      if (error) {
        logger.error('Error updating record:', recordId, error);
        throw error;
      }
      
      logger.log('Successfully rejected record:', recordId);
      setSnackbar('Record rejected successfully');
      
      // Refresh the data
      await fetchData();
      
    } catch (error) {
      logger.error('Error rejecting record:', error);
      setSnackbar('Failed to reject record: ' + error.message);
    }
  }

  // Bulk mark for investigation
  async function handleBulkInvestigate(records) {
    // Get current user ID
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Update each record individually to avoid upsert issues
    for (const record of records) {
      // Check if this is a scanned-only record that shouldn't be processed
      if (typeof record.id === 'string' && record.id.startsWith('scanned_')) {
        logger.log('Skipping scanned-only record:', record.id);
        continue;
      }
      
      // Extract numeric part from ID (e.g., "scanned_55555" -> 55555)
      let recordId;
      if (typeof record.id === 'string') {
        const numericPart = record.id.match(/\d+/);
        recordId = numericPart ? parseInt(numericPart[0], 10) : record.id;
      } else {
        recordId = record.id;
      }
      
      if (isNaN(recordId)) {
        logger.error('Cannot convert ID to number:', record.id);
        throw new Error(`Invalid ID format: ${record.id}`);
      }
      
      const { error } = await supabase
        .from('imported_invoices')
        .update({
          status: 'investigation',
          investigation_started_at: new Date().toISOString(),
          investigation_started_by: currentUser.id
        })
        .eq('id', recordId);

      if (error) throw error;
    }
  }

  // Bulk export records
  async function handleBulkExport(records) {
    // Create CSV data
    const csvData = records.map(record => {
      const data = parseDataField(record.data);
      return {
        'Order Number': data.order_number || '',
        'Customer': data.customer_name || '',
        'Date': data.date || '',
        'Status': record.status || '',
        'Uploaded By': record.uploaded_by || '',
        'Created At': record.created_at || ''
      };
    });

    // Convert to CSV
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async function handleBulkDeleteInvoices() {
    if (selectedRecords.length === 0) return;
    
    try {
      // Determine which table to use based on the active tab
      const tableName = activeTab === 0 ? 'imported_invoices' : 'imported_sales_receipts';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', selectedRecords);
      
      if (error) throw error;
      
      setSnackbar(`${selectedRecords.length} records deleted successfully`);
      setSelectedRecords([]);
      fetchData();
    } catch (error) {
      setError('Failed to delete records: ' + error.message);
    }
  }

  async function handleViewAuditLogs(type, row) {
    try {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'import_approvals')
        .eq('record_id', row.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAuditDialog({
        open: true,
        logs: logs || [],
        title: `Audit Trail - ${type} ${row.invoice_number || row.receipt_number}`
      });
    } catch (error) {
      setError('Failed to fetch audit logs: ' + error.message);
    }
  }

  async function searchCustomers(query) {
    if (!query) return [];
    
    setCustomerSearchLoading(true);
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .eq('organization_id', organization.id)
        .ilike('name', `%${query}%`)
        .limit(10);
      
      if (error) throw error;
      return customers || [];
    } catch (error) {
      logger.error('Error searching customers:', error);
      return [];
    } finally {
      setCustomerSearchLoading(false);
    }
  }

  async function handleSidebarAction(option) {
    logger.log('Sidebar action:', option);
    // Implement sidebar action logic
  }

  const handleDeleteSelected = async () => {
    if (selectedRecords.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedRecords.length} selected records?`)) {
      await handleBulkDeleteInvoices();
    }
  };

  // Process invoice data for verification
  async function processInvoice(invoiceData) {
    // Implementation for processing invoice data
    logger.log('Processing invoice:', invoiceData);
  }

  // Process receipt data for verification
  async function processReceipt(receiptData) {
    // Implementation for processing receipt data
    logger.log('Processing receipt:', receiptData);
  }

  function getOrderNumber(data) {
    if (!data) return '';
    
    // Try direct properties first (now set by splitImportIntoIndividualRecords)
    if (data.order_number || data.reference_number || data.invoice_number) {
      return data.order_number || data.reference_number || data.invoice_number;
    }
    
    // Try to get from rows array (fallback)
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0];
      if (firstRow.order_number || firstRow.invoice_number || firstRow.reference_number || firstRow.sales_receipt_number) {
        return firstRow.order_number || firstRow.invoice_number || firstRow.reference_number || firstRow.sales_receipt_number;
      }
    }
    
    return '';
  }

  function getRecordDate(data) {
    if (!data) return '';
    
    // Try direct properties first (now set by splitImportIntoIndividualRecords)
    if (data.date || data.invoice_date || data.receipt_date) {
      return data.date || data.invoice_date || data.receipt_date;
    }
    
    // Try to get from rows array (fallback)
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0];
      if (firstRow.date || firstRow.invoice_date || firstRow.receipt_date) {
        return firstRow.date || firstRow.invoice_date || firstRow.receipt_date;
      }
    }
    
    return '';
  }

  // Function to split grouped import data into individual records (professional workflow)
  function splitImportIntoIndividualRecords(importRecord) {
    const data = parseDataField(importRecord.data);
    const rows = data.rows || [];
    
    logger.log('🔍 splitImportIntoIndividualRecords:', {
      importId: importRecord.id,
      filename: importRecord.filename,
      rowsCount: rows.length,
      dataKeys: Object.keys(data),
      firstRow: rows[0] ? {
        order_number: rows[0].order_number,
        reference_number: rows[0].reference_number,
        customer_name: rows[0].customer_name,
        product_code: rows[0].product_code,
        shipped: rows[0].shipped,
        returned: rows[0].returned
      } : null
    });
    
    if (!rows || rows.length === 0) return [importRecord];
    
    // Group rows by order/receipt number to keep separate entries for barcode vs product code
    const groupedByOrder = {};
    rows.forEach(row => {
      const orderNumber = row.reference_number || row.order_number || row.invoice_number || row.sales_receipt_number || 'UNKNOWN';
      if (!groupedByOrder[orderNumber]) {
        groupedByOrder[orderNumber] = [];
      }
      groupedByOrder[orderNumber].push(row);
    });
    
    logger.log('🔍 Grouped by order:', Object.keys(groupedByOrder).map(orderNum => ({
      orderNumber: orderNum,
      rowCount: groupedByOrder[orderNum].length
    })));
    
    // Create individual records for each order/receipt
    const individualRecords = [];
    Object.keys(groupedByOrder).forEach((orderNumber, index) => {
      const orderRows = groupedByOrder[orderNumber];
      const firstRow = orderRows[0];
      
      logger.log('🔍 Creating grouped record:', {
        index,
        orderNumber,
        customerName: firstRow.customer_name,
        rowCount: orderRows.length
      });
      
      individualRecords.push({
        ...importRecord,
        // Keep original ID for database operations, use displayId for React keys
        originalId: importRecord.id, // Original database ID
        id: importRecord.id, // Keep original ID for database operations
        displayId: `${importRecord.id}_${index}`, // Use for React keys only
        splitIndex: index, // Track which split this is
        data: {
          ...data,
          rows: orderRows, // All rows for this specific order
          order_number: orderNumber,
          customer_name: firstRow.customer_name,
          customer_id: firstRow.customer_id,
          date: firstRow.date,
          reference_number: orderNumber
        }
      });
    });
    
    logger.log('📊 Created consolidated records:', individualRecords.length);
    return individualRecords;
  }

  // Helper to get scanned SHP/RTN for a given order and product code
  function getScannedQty(orderNum, productCode, type, invoiceRecord = null) {
    // type: 'out' (delivered/shipped) or 'in' (returned)
    if (!orderNum || !productCode) return 0;
    
    logger.log('🔍 getScannedQty:', { orderNum, productCode, type, totalScans: allScannedRows.length });
    
    const matches = allScannedRows.filter(row => {
      const orderMatch = row.order_number === orderNum || row.invoice_number === orderNum;
      
      // For the same order, match ANY scanned barcode to ANY invoice product code
      // This handles the case where barcode 677777777 should match product BCS68-300
      const productMatch = row.product_code === productCode || 
                          row.bottle_barcode === productCode || 
                          row.barcode_number === productCode ||
                          // If we're looking for a product code from invoice, match any barcode from scans for same order
                          (orderMatch && (row.bottle_barcode || row.barcode_number));
      
      // Updated to match the mobile app's mode values
      const typeMatch = (type === 'out' && (
        row.scan_type === 'delivery' || 
        row.mode === 'delivery' || 
        row.mode === 'SHIP' || 
        row.action === 'out'
      )) || (type === 'in' && (
        row.scan_type === 'pickup' || 
        row.mode === 'pickup' || 
        row.mode === 'RETURN' || 
        row.action === 'in'
      ));
      
      if (orderMatch && productMatch && typeMatch) {
        logger.log('📦 Scan match found:', { 
          order: row.order_number, 
          product: row.product_code || row.bottle_barcode || row.barcode_number, 
          mode: row.mode, 
          action: row.action,
          lookingFor: productCode
        });
      }
      
      return orderMatch && productMatch && typeMatch;
    });
    
    logger.log(`📊 Found ${matches.length} scans for ${orderNum}/${productCode}/${type}`);
    return matches.length;
  }
} 