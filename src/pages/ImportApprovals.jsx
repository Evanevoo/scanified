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
  ButtonGroup, SpeedDial, SpeedDialAction, SpeedDialIcon,
  Table, TableHead, TableRow, TableCell, TableBody
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
  const data = parseDataField(record.data);
  
  // Check if record has invoice data (shipped/returned quantities from invoice)
  // This is the definitive check - if there are invoice quantities, it's NOT scanned-only
  const rows = data.rows || data.line_items || [];
  const hasInvoiceData = rows.some(row => {
    const shipped = parseInt(row.qty_out || row.QtyOut || row.shipped || row.Shipped || 0, 10);
    const returned = parseInt(row.qty_in || row.QtyIn || row.returned || row.Returned || 0, 10);
    return shipped > 0 || returned > 0;
  });
  
  // Also check if this is from imported_invoices/imported_sales_receipts (has database ID)
  // If it has originalId or ID is not a scanned ID, it's from an import
  const isFromImport = record.originalId || 
                      typeof record.id === 'number' || 
                      (typeof record.id === 'string' && !record.id.startsWith('scanned_'));
  
  // If record has invoice data OR is from an import, it's NOT scanned-only
  // Handle scanned-only records (orders that have been scanned but not invoiced yet)
  // Only mark as scanned-only if it has no invoice data AND is marked as scanned-only AND not from import
  if (record.is_scanned_only && !hasInvoiceData && !isFromImport) {
    return 'SCANNED_ONLY';
  }
  
  // If it has invoice data or is from import, don't treat as scanned-only (fall through to other status checks)
  
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
  
  // Check verification state - check status field
  if (record.status === 'approved' || record.status === 'verified') return 'VERIFIED';
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
  const [bottleInfoDialog, setBottleInfoDialog] = useState({
    open: false,
    orderNumber: null,
    bottles: [],
    scannedBarcodes: [], // Track scanned barcodes even if bottles not found
    loading: false
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
    const safeFilteredInvoices = filteredInvoices || [];
    const selectableInvoices = safeFilteredInvoices.filter(invoice => 
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
  }, [organization?.id]); // Re-fetch when organization changes

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
    if (!records || !Array.isArray(records)) {
      return [];
    }
    return records.filter(record => {
      const data = parseDataField(record.data);
      const orderNum = getOrderNumber(data);
      const recordStatus = determineVerificationStatus(record);
      const filterReasons = [];
      
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const orderNumLower = orderNum.toLowerCase();
        const customerName = getCustomerInfo(data).toLowerCase();
        const items = getLineItems(data);
        const productCodes = items.map(item => (item.product_code || '').toLowerCase()).join(' ');
        
        if (!orderNumLower.includes(searchLower) && 
            !customerName.includes(searchLower) && 
            !productCodes.includes(searchLower)) {
          filterReasons.push(`Search filter: "${search}" not found`);
          logger.log(`🚫 Filtering out record ${record.id} (${orderNum}): Search filter`);
          return false;
        }
      }
      
      // Status filter - handle different status filter options
      if (statusFilter === 'all') {
        // When showing "all", hide verified/approved records (they've been processed)
        // Also hide rejected records
        if (record.status === 'rejected') {
          logger.log(`🚫 Filtering out record ${record.id} (${orderNum}): Status is rejected`);
          return false;
        }
        
        // CRITICAL: Filter out approved/verified/rejected records - they should NOT appear in Import Approvals
        const recordStatusLower = (record.status || '').toLowerCase();
        if (recordStatusLower === 'approved' || recordStatusLower === 'verified' || recordStatusLower === 'rejected') {
          logger.log(`🚫 REMOVING record ${record.id} (${orderNum}): Status is '${record.status}' - verified orders should not appear here`);
          return false;
        }
        
        if (recordStatus === 'VERIFIED') {
          logger.log(`🚫 REMOVING record ${record.id} (${orderNum}): Verification status is VERIFIED`);
          return false;
        }
      } else {
        // Specific status filter selected - show only matching records
        if (record.status === 'rejected' && statusFilter !== 'rejected') {
          filterReasons.push('Status filter: rejected');
          logger.log(`🚫 Filtering out record ${record.id} (${orderNum}): Status is rejected`);
          return false;
        }
        
        if (statusFilter === 'pending' && recordStatus !== 'PENDING') {
          filterReasons.push(`Status filter: ${recordStatus} !== PENDING`);
          logger.log(`🚫 Filtering out record ${record.id} (${orderNum}): Status ${recordStatus} !== PENDING`);
          return false;
        }
        if (statusFilter === 'verified' && recordStatus !== 'VERIFIED') {
          filterReasons.push(`Status filter: ${recordStatus} !== VERIFIED`);
          return false;
        }
        if (statusFilter === 'exception' && recordStatus !== 'EXCEPTION') {
          filterReasons.push(`Status filter: ${recordStatus} !== EXCEPTION`);
          return false;
        }
        if (statusFilter === 'investigation' && recordStatus !== 'INVESTIGATION') {
          filterReasons.push(`Status filter: ${recordStatus} !== INVESTIGATION`);
          return false;
        }
        if (statusFilter === 'scanned_only' && recordStatus !== 'SCANNED_ONLY') {
          filterReasons.push(`Status filter: ${recordStatus} !== SCANNED_ONLY`);
          return false;
        }
      }
      
      // Location filter
      if (locationFilter !== 'All') {
        const recordLocation = data.location || data.summary?.location || 'Unknown';
        if (recordLocation !== locationFilter) {
          logger.log(`🚫 Filtering out record ${record.id} (${orderNum}): Location '${recordLocation}' !== '${locationFilter}'`);
          return false;
        }
      }
      
      // Log why record passed all filters
      if (filterReasons.length === 0) {
        logger.log(`✅ Record ${record.id} (${orderNum}) passed all filters - Status: ${recordStatus}, DB Status: ${record.status || 'null'}`);
      }
      
      return true;
    });
  };

  // Deduplicate records based on order number and customer
  const deduplicateRecords = (records) => {
    if (!records || !Array.isArray(records)) {
      return [];
    }
    
    const seen = new Map();
    const deduplicated = [];
    
    records.forEach(record => {
      const data = parseDataField(record.data);
      const orderNum = getOrderNumber(data);
      const customerName = getCustomerInfo(data);
      const key = `${orderNum}_${customerName}`;
      
      if (!seen.has(key)) {
        seen.set(key, record);
        deduplicated.push(record);
      } else {
        logger.log(`🗑️ Removing duplicate record: Order ${orderNum}, Customer ${customerName}, ID ${record.id}`);
      }
    });
    
    return deduplicated;
  };

  // Get filtered records
  const filteredInvoices = deduplicateRecords(filterRecords(pendingInvoices));
  const filteredReceipts = deduplicateRecords(filterRecords(pendingReceipts));
  
  // Debug: Log the data to see what we're working with
  logger.log('📊 Filtering Debug:', {
    pendingInvoicesCount: pendingInvoices.length,
    filteredInvoicesCount: filteredInvoices.length,
    search: search,
    statusFilter: statusFilter,
    locationFilter: locationFilter,
    pendingInvoices: pendingInvoices.map(r => ({
      id: r.id,
      status: r.status,
      verificationStatus: determineVerificationStatus(r),
      orderNumber: getOrderNumber(parseDataField(r.data))
    })),
    filteredInvoices: filteredInvoices.map(r => ({
      id: r.id,
      status: r.status,
      verificationStatus: determineVerificationStatus(r),
      orderNumber: getOrderNumber(parseDataField(r.data))
    }))
  });

  // Get unique locations from all records
  const getUniqueLocations = () => {
    const locations = new Set(['All']);
    const safePendingInvoices = pendingInvoices || [];
    const safePendingReceipts = pendingReceipts || [];
    const safeAllLocations = allLocations || [];
    
    logger.log('🔍 Debug locations - pendingInvoices:', (safePendingInvoices || []).length, 'pendingReceipts:', (safePendingReceipts || []).length);
    logger.log('🔍 Debug locations - allLocations from database:', (safeAllLocations || []).length);
    
    // Always use locations from database first (same as Locations page)
    safeAllLocations.forEach(location => {
      const locationName = location?.name || location?.location_name || location;
      if (locationName) {
        locations.add(locationName);
      }
    });
    
    // Also add any unique locations found in imported data
    [...safePendingInvoices, ...safePendingReceipts].forEach((record, index) => {
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
        .neq('status', 'rejected') // EXCLUDE REJECTED RECORDS
        .neq('status', 'approved'); // EXCLUDE APPROVED RECORDS
      
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
        .eq('organization_id', organization.id)
        .neq('status', 'rejected') // EXCLUDE REJECTED
        .neq('status', 'approved'); // EXCLUDE APPROVED
      
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
      
      // First, check ALL imports regardless of status to debug
      const { data: allImports, error: allImportsError } = await supabase
        .from('imported_invoices')
        .select('id, status, organization_id, created_at')
        .eq('organization_id', organization.id);
      
      // Filter out approved/rejected/verified records client-side to ensure they're excluded
      const filteredImports = (allImports || []).filter(imp => {
        const status = (imp.status || '').toLowerCase();
        return status !== 'approved' && status !== 'rejected' && status !== 'verified';
      });
      
      logger.log('🔍 All imports for organization (before filtering):', allImports?.length || 0);
      logger.log('🔍 All imports for organization (after filtering approved/rejected/verified):', filteredImports?.length || 0);
      if (filteredImports && filteredImports.length > 0) {
        logger.log('📋 Status of each remaining import:', filteredImports.map(imp => ({ id: imp.id, status: imp.status })));
      }
      
      // CRITICAL: Filter out approved/verified/rejected records at the database level
      // This is more efficient and ensures they never make it into the app
      const { data: invoicesRaw, error: invoiceError } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .neq('status', 'approved')
        .neq('status', 'verified')
        .neq('status', 'rejected');
      
      // CRITICAL: Filter out approved/verified/rejected records at the database level
      const { data: receiptsRaw, error: receiptError } = await supabase
        .from('imported_sales_receipts')
        .select('*')
        .eq('organization_id', organization.id)
        .neq('status', 'approved')
        .neq('status', 'verified')
        .neq('status', 'rejected');
      
      // Filter out approved/rejected/verified records client-side
      // CRITICAL: This must happen BEFORE splitting records to ensure approved records don't show up
      const invoices = (invoicesRaw || []).filter(inv => {
        const status = (inv.status || '').toLowerCase();
        const isExcluded = status === 'approved' || status === 'rejected' || status === 'verified';
        if (isExcluded) {
          logger.log(`🚫 Excluding invoice ${inv.id} with status: ${inv.status} - WILL NOT BE PROCESSED`);
        }
        return !isExcluded;
      });
      
      const receipts = (receiptsRaw || []).filter(rec => {
        const status = (rec.status || '').toLowerCase();
        const isExcluded = status === 'approved' || status === 'rejected' || status === 'verified';
        if (isExcluded) {
          logger.log(`🚫 Excluding receipt ${rec.id} with status: ${rec.status}`);
        }
        return !isExcluded;
      });
      
      logger.log(`📊 Invoices: ${invoicesRaw?.length || 0} total, ${invoices.length} after filtering`);
      logger.log(`📊 Receipts: ${receiptsRaw?.length || 0} total, ${receipts.length} after filtering`);
      
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
        allImportsCount: allImports?.length || 0,
        invoicesFound: invoices?.length || 0,
        receiptsFound: receipts?.length || 0,
        invoiceIds: invoices?.map(i => i.id) || [],
        invoiceStatuses: invoices?.map(i => i.status) || []
      });
      
      // Log status breakdown for debugging
      const statusCounts = {};
      (invoices || []).forEach(inv => {
        const status = inv.status || 'null';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      logger.log('📊 Invoice status breakdown:', statusCounts);
      logger.log('📊 Invoices with approved status (should be 0):', (invoices || []).filter(i => i.status === 'approved').length);
      
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
        invoiceStatuses: invoices?.map(i => ({ id: i.id, status: i.status })) || [],
        receiptStatuses: receipts?.map(r => ({ id: r.id, status: r.status })) || []
      });
      
      // Debug: Show first few individual records
      logger.log('🔍 First 3 individual invoices:', individualInvoices.slice(0, 3).map(inv => ({
        id: inv.id,
        displayId: inv.displayId,
        customerName: inv.data.customer_name,
        productCode: inv.data.product_code,
        orderNumber: inv.data.order_number
      })));
      
      // Build import order numbers set from split records FIRST (for consistent deduplication)
      const importOrderNumbers = new Set();
      [...individualInvoices, ...individualReceipts].forEach(record => {
        const data = parseDataField(record.data);
        // Try multiple ways to get order number from imported records
        const orderNum = record.data?.order_number 
          || record.data?.reference_number 
          || data.order_number 
          || data.reference_number
          || (data.rows && data.rows[0] && (data.rows[0].order_number || data.rows[0].reference_number));
        if (orderNum) {
          importOrderNumbers.add(orderNum.toString().trim());
        }
      });
      logger.log('📋 Import order numbers (from split records):', Array.from(importOrderNumbers));
      
      // Get scanned-only records from both bottle_scans and scans tables
      logger.log('⏱️ Fetching scanned data...');
      const scanStartTime = Date.now();
      
      // Get scanned rows from bottle_scans table
      // Note: bottle_scans table doesn't have a status column, so we can't filter by status here
      // We'll filter approved records after fetching by checking the scans table
      const { data: scannedRows, error: scannedError } = await supabase
        .from('bottle_scans')
        .select('*')
        .not('order_number', 'is', null)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to prevent slow queries
      
      // Also get scans from the mobile app scans table
      const { data: mobileScansRaw, error: mobileError } = await supabase
        .from('scans')
        .select('*')
        .not('order_number', 'is', null)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to prevent slow queries
      
      // Filter out approved/rejected/verified scans client-side
      const mobileScans = (mobileScansRaw || []).filter(scan => {
        const status = (scan.status || '').toLowerCase();
        const isExcluded = status === 'approved' || status === 'rejected' || status === 'verified';
        if (isExcluded) {
          logger.log(`🚫 Excluding scan for order ${scan.order_number} with status: ${scan.status}`);
        }
        return !isExcluded;
      });
      
      // Handle errors gracefully - if bottle_scans query fails, continue with empty array
      if (scannedError) {
        logger.warn('⚠️ Scanned rows query error (bottle_scans table may not have status column):', scannedError);
        // Continue with empty array instead of throwing
      }
      
      if (mobileError) {
        logger.error('❌ Mobile scans query error:', mobileError);
        // Continue with empty array for mobile scans
      }
      
      logger.log('⏱️ Scanned data queries completed in:', Date.now() - scanStartTime, 'ms');
      
      // Combine both scan sources
      const allScannedRows = [...(scannedRows || []), ...(mobileScans || [])];
      
      logger.log('🔍 Data fetch results:', {
        scannedRows: scannedRows?.length || 0,
        mobileScans: mobileScans?.length || 0,
        allScannedRows: allScannedRows.length
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
      logger.log('🔍 Scanned order numbers:', Object.keys(orderGroups));
      logger.log('🔍 Matching check - Import has:', Array.from(importOrderNumbers), 'Scanned has:', Object.keys(orderGroups));

      // Convert to the same format as imported invoices for consistency
      logger.log('⏱️ Processing scanned records...');
      const processStartTime = Date.now();
      
      // Check which orders have all scans processed (approved/verified) in the scans table
      // Query approved/verified scans separately since we exclude them from mobileScans
      // ALSO check imported_invoices for approved orders - these should NOT show as scanned-only
      const approvedOrderNumbers = new Set();
      
      // First, get approved orders from imported_invoices table
      const { data: approvedImports, error: approvedImportError } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('organization_id', organization.id)
        .in('status', ['approved', 'verified']);
      
      if (!approvedImportError && approvedImports) {
        approvedImports.forEach(imp => {
          const data = parseDataField(imp.data);
          const rows = data.rows || data.line_items || [];
          rows.forEach(row => {
            const orderNum = (row.order_number || row.invoice_number || row.reference_number || '').toString().trim();
            if (orderNum) {
              approvedOrderNumbers.add(orderNum);
              logger.log('✅ Found approved import order:', orderNum);
            }
          });
        });
      }
      
      // Also check scans table for approved orders
      const { data: allScansForApprovalCheck, error: allScansError } = await supabase
        .from('scans')
        .select('order_number, status')
        .not('order_number', 'is', null)
        .eq('organization_id', organization.id);
      
      if (!allScansError && allScansForApprovalCheck && allScansForApprovalCheck.length > 0) {
        const orderApprovalMap = {};
        allScansForApprovalCheck.forEach(scan => {
          const orderNum = scan.order_number?.toString().trim();
          if (orderNum) {
            if (!orderApprovalMap[orderNum]) {
              orderApprovalMap[orderNum] = { total: 0, approved: 0 };
            }
            orderApprovalMap[orderNum].total++;
            if (scan.status === 'approved' || scan.status === 'verified') {
              orderApprovalMap[orderNum].approved++;
            }
          }
        });
        
        // Mark orders as processed if all scans are processed (approved/verified)
        Object.entries(orderApprovalMap).forEach(([orderNum, counts]) => {
          if (counts.total > 0 && counts.approved === counts.total) {
            approvedOrderNumbers.add(orderNum);
            logger.log(`✅ Order ${orderNum} is fully approved (${counts.approved}/${counts.total} scans)`);
          }
        });
      }
      
      logger.log(`📋 Found ${approvedOrderNumbers.size} fully approved orders (will be filtered out):`, Array.from(approvedOrderNumbers));
      
      // Also fetch approved imported invoices to check for orphaned bottle_scans
      const { data: approvedImportsForCleanup, error: approvedImportCleanupError } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('organization_id', organization.id)
        .in('status', ['approved', 'verified']);
      
      const approvedImportOrderNumbers = new Set();
      if (!approvedImportCleanupError && approvedImportsForCleanup) {
        approvedImportsForCleanup.forEach(imp => {
          const data = parseDataField(imp.data);
          const rows = data.rows || data.line_items || [];
          rows.forEach(row => {
            const orderNum = (row.order_number || row.invoice_number || row.reference_number || '').toString().trim();
            if (orderNum) {
              approvedImportOrderNumbers.add(orderNum);
            }
          });
        });
      }
      logger.log('📋 Approved import order numbers for cleanup:', Array.from(approvedImportOrderNumbers));
      
      const scannedOnlyRecords = (await Promise.all(
        Object.entries(orderGroups)
          .map(async ([orderNumber, scans]) => {
            // Filter out orders where all scans are approved
            // Check if this order is in the approved list (from scans table)
            if (approvedOrderNumbers.has(orderNumber)) {
              logger.log('🚫 Filtering out order - all scans approved in scans table:', orderNumber);
              // DON'T delete bottle_scans - keep them for history/verification
              return null;
            }
            
            // Also check if any scans in this group have status='approved' or 'verified' (from scans table)
            const hasProcessedScans = scans.some(s => s.status === 'approved' || s.status === 'verified');
            if (hasProcessedScans && scans.every(s => s.status === 'approved' || s.status === 'verified' || s.status === undefined || s.status === null)) {
              // All scans that have status are processed (approved/verified), and bottle_scans don't have status
              // This means the order is processed
              logger.log('🚫 Filtering out order - all scans with status are processed:', orderNumber);
              // DON'T delete bottle_scans - keep them for history/verification
              return null;
            }
            
            // Check if this order matches an approved imported invoice
            // BUT only filter it out if the scan is older than the approval
            // If the scan is newer, it might be a new scan that should be shown
            if (approvedImportOrderNumbers.has(orderNumber)) {
              // Get the most recent scan timestamp
              const mostRecentScanTime = Math.max(...scans.map(s => new Date(s.created_at || s.scan_date || 0).getTime()));
              
              // Check if any approved import for this order was approved AFTER the scan
              // We need to check the actual invoice data to see if it contains this order number
              // and get the approval timestamp
              try {
                const { data: approvedImportsForOrder, error: approvedImportCheckError } = await supabase
                  .from('imported_invoices')
                  .select('approved_at, verified_at, data')
                  .eq('organization_id', organization.id)
                  .or('status.eq.approved,status.eq.verified');
                
                if (!approvedImportCheckError && approvedImportsForOrder) {
                  // Check each approved import to see if it contains this order number
                  // and if the approval was after the scan
                  let hasNewerApproval = false;
                  
                  for (const imp of approvedImportsForOrder) {
                    const data = parseDataField(imp.data);
                    const rows = data.rows || data.line_items || [];
                    
                    // Check if this import contains the order number
                    const containsOrderNumber = rows.some(row => {
                      const rowOrderNum = (row.order_number || row.invoice_number || row.reference_number || '').toString().trim();
                      return rowOrderNum === orderNumber;
                    });
                    
                    if (containsOrderNumber) {
                      // This import contains the order number, check if approval is newer than scan
                      const approvalTime = new Date(imp.approved_at || imp.verified_at || 0).getTime();
                      if (approvalTime > mostRecentScanTime) {
                        hasNewerApproval = true;
                        logger.log(`🚫 Order ${orderNumber} has newer approval (${new Date(approvalTime).toISOString()} > ${new Date(mostRecentScanTime).toISOString()})`);
                        break;
                      }
                    }
                  }
                  
                  if (hasNewerApproval) {
                    logger.log('🚫 Filtering out order - has newer approved import:', orderNumber);
                    return null;
                  } else {
                    logger.log('✅ Keeping order - scan is newer than approved import:', orderNumber, 'scan time:', new Date(mostRecentScanTime).toISOString());
                    // Continue processing - this is a new scan
                  }
                } else {
                  // If we can't check dates, but the order number matches an approved import,
                  // we should filter it out (the import was approved, so the scanned-only record shouldn't show)
                  logger.log('🚫 Filtering out order - matches approved import (approved import exists):', orderNumber, approvedImportCheckError?.message);
                  return null;
                }
              } catch (err) {
                logger.error('Error checking approved imports for order:', orderNumber, err);
                // On error, be conservative and filter it out
                logger.log('🚫 Filtering out order - error checking approved imports:', orderNumber);
                return null;
              }
            }
            
            return [orderNumber, scans];
          })
      ))
        .filter(r => r !== null)
        .map(([orderNumber, scans]) => {
        const firstScan = scans[0];
        const customerName = firstScan.customer_name || firstScan.customer || 'Unknown Customer';
        const customerId = firstScan.customer_id || firstScan.CustomerID || firstScan.CustomerId || firstScan.CustomerListID || null;
        const hasMatchingImport = importOrderNumbers.has(orderNumber);
        
        logger.log('🔍 Creating scanned record:', { 
          orderNumber, 
          customerName, 
          hasMatchingImport, 
          scanCount: scans.length,
          importOrderNumbers: Array.from(importOrderNumbers)
        });
        
        // Deduplicate scans by barcode to prevent multiple entries for the same bottle
        const seenBarcodes = new Set();
        const uniqueScans = scans.filter(scan => {
          const barcode = scan.barcode_number || scan.bottle_barcode;
          if (!barcode) return true; // Keep scans without barcodes
          
          if (seenBarcodes.has(barcode)) {
            logger.log('⚠️ Skipping duplicate scan for barcode:', barcode);
            return false;
          }
          seenBarcodes.add(barcode);
          return true;
        });
        
        logger.log(`📊 Deduplicated scans for order ${orderNumber}: ${scans.length} -> ${uniqueScans.length}`);
        
        return {
          id: `scanned_${orderNumber}`,
          data: {
            rows: uniqueScans.map(scan => {
              // Determine if this is a SHIP/OUT scan or RETURN/IN scan
              // Check multiple field names and values to be robust
              const mode = scan.mode || scan.scan_type || scan.action || '';
              const modeUpper = mode.toString().toUpperCase();
              const action = (scan.action || '').toString().toLowerCase();
              const scanType = (scan.scan_type || '').toString().toLowerCase();
              
              const isOut = action === 'out' || 
                            scanType === 'delivery' || 
                            modeUpper === 'SHIP' || 
                            modeUpper === 'DELIVERY' ||
                            modeUpper === 'OUT';
                            
              const isIn = action === 'in' || 
                          scanType === 'pickup' || 
                          modeUpper === 'RETURN' || 
                          modeUpper === 'PICKUP' ||
                          modeUpper === 'IN';
              
              // Log for debugging (only for first few scans to avoid spam)
              if (uniqueScans.indexOf(scan) < 3) {
                logger.log(`📊 Scan processing: barcode=${scan.barcode_number || scan.bottle_barcode}, mode="${mode}", action="${scan.action}", scan_type="${scan.scan_type}", isOut=${isOut}, isIn=${isIn}`);
              }
              
              return {
                order_number: orderNumber,
                customer_name: customerName,
                customer_id: customerId,
                CustomerID: customerId,
                CustomerId: customerId,
                CustomerListID: customerId,
                product_code: scan.product_code || scan.bottle_barcode || scan.barcode_number || 'Unknown',
                qty_out: isOut ? 1 : 0,
                qty_in: isIn ? 1 : 0,
                date: scan.scan_date || scan.created_at || new Date().toISOString().split('T')[0],
                location: scan.location || 'Unknown',
                // Add mobile-specific fields for better display
                barcode: scan.barcode_number || scan.bottle_barcode,
                description: scan.description || 'Unknown',
                gas_type: scan.gas_type || 'Unknown'
              };
            }),
            customer_name: customerName,
            customer_id: customerId,
            CustomerID: customerId,
            CustomerId: customerId,
            CustomerListID: customerId,
            summary: {
              total_rows: uniqueScans.length,
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
      
      // Deduplicate: Remove scanned-only records if we have an import for the same order number
      // Use the importOrderNumbers set that was already built from split records above
      logger.log('📋 Deduplication - Import order numbers:', Array.from(importOrderNumbers));
      
      const deduplicatedScannedOnly = scannedOnlyRecords.filter(record => {
        const data = parseDataField(record.data);
        // Try multiple ways to get order number from scanned-only records
        // Also check the ID format: scanned_${orderNumber}
        let orderNum = record.data?.order_number 
          || record.data?.reference_number
          || data.order_number
          || data.reference_number
          || (data.rows && data.rows[0] && (data.rows[0].order_number || data.rows[0].reference_number));
        
        // Fallback: Extract from ID if it follows pattern "scanned_${orderNumber}"
        if (!orderNum && record.id && record.id.startsWith('scanned_')) {
          orderNum = record.id.replace('scanned_', '');
        }
        
        if (!orderNum) {
          logger.log('⚠️ Scanned-only record has no order number:', record.id);
          return true; // Keep records without order numbers (shouldn't happen)
        }
        
        const orderNumStr = orderNum.toString().trim();
        const hasMatchingImport = importOrderNumbers.has(orderNumStr);
        const hasMatchingApprovedImport = approvedOrderNumbers.has(orderNumStr);
        
        logger.log('🔍 Deduplication check:', {
          recordId: record.id,
          orderNum: orderNumStr,
          hasMatchingImport,
          hasMatchingApprovedImport,
          importOrderNumbers: Array.from(importOrderNumbers),
          approvedOrderNumbers: Array.from(approvedOrderNumbers)
        });
        
        // Remove if there's a matching import OR if there's a matching approved import
        if (hasMatchingImport || hasMatchingApprovedImport) {
          logger.log('🗑️ Removing scanned-only record for order:', orderNumStr, 'Record ID:', record.id, 
            hasMatchingImport ? '(has matching import)' : '(has matching approved import)');
        }
        
        return !hasMatchingImport && !hasMatchingApprovedImport;
      });
      
      logger.log('📊 After deduplication - scanned-only records:', deduplicatedScannedOnly.length);
      
      const allRecords = [...individualInvoices, ...individualReceipts, ...deduplicatedScannedOnly];
      logger.log('📊 All records count (after deduplication):', allRecords.length);
      
      // Final cleanup: Remove any approved, verified, or rejected records that somehow made it through
      // THIS IS THE FINAL SAFETY NET - approved records MUST be removed here
      const cleanedRecords = allRecords.filter(record => {
        const status = (record.status || '').toLowerCase();
        if (status === 'approved' || status === 'rejected' || status === 'verified') {
          logger.warn(`🧹 REMOVING ${status.toUpperCase()} record from display:`, {
            id: record.id,
            orderNumber: record.data?.order_number || record.data?.reference_number,
            status: record.status
          });
          return false; // REMOVE IT - don't show approved/verified/rejected records
        }
        return true;
      });
      
      logger.log('🔍 Final allRecords:', {
        individualInvoices: individualInvoices.length,
        individualReceipts: individualReceipts.length,
        scannedOnlyRecords: scannedOnlyRecords.length,
        deduplicatedScannedOnly: deduplicatedScannedOnly.length,
        beforeCleanup: allRecords.length,
        afterCleanup: cleanedRecords.length
      });
      
      // Debug: Show first few final records
      logger.log('🔍 First 3 final records:', cleanedRecords.slice(0, 3).map(record => ({
        id: record.id,
        displayId: record.displayId,
        customerName: record.data?.customer_name,
        productCode: record.data?.product_code,
        orderNumber: record.data?.order_number,
        status: record.status
      })));
      
      setPendingInvoices(cleanedRecords);
      
      // Calculate stats from the actual data being displayed (cleanedRecords, not allRecords)
      const displayStats = {
        total: cleanedRecords.length,
        pending: 0,
        verified: 0,
        exceptions: 0,
        investigating: 0,
        processing: 0,
        scanned_only: 0,
        quantityDiscrepancies: 0
      };
      
      cleanedRecords.forEach(record => {
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
      logger.log('📊 Pending invoices set to:', cleanedRecords.length, 'records');
      setLoading(false);
      
    } catch (error) {
      logger.error('Error fetching verification stats:', error);
      setError('Failed to fetch data: ' + error.message);
      
      // Fallback: try to show basic data even if main function fails
      try {
        logger.log('🔄 Attempting fallback data fetch...');
        const { data: fallbackInvoicesRaw } = await supabase
          .from('imported_invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .limit(50);
        
        // Filter out approved/rejected/verified records from fallback data too
        const fallbackInvoices = (fallbackInvoicesRaw || []).filter(inv => {
          const status = (inv.status || '').toLowerCase();
          const isExcluded = status === 'approved' || status === 'rejected' || status === 'verified';
          if (isExcluded) {
            logger.log(`🚫 [FALLBACK] Excluding invoice ${inv.id} with status: ${inv.status}`);
          }
          return !isExcluded;
        });
        
        if (fallbackInvoices && fallbackInvoices.length > 0) {
          logger.log('✅ Fallback data found (after filtering):', fallbackInvoices.length, 'records');
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
    // SECURITY: Only fetch bottles from user's organization
    if (!organization?.id) {
      logger.error('Organization ID not found for fetchCylinders');
      return;
    }
    const { data: cylinders } = await supabase
      .from('bottles')
      .select('product_code, gas_type, size')
      .eq('organization_id', organization.id);
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
      // SECURITY: Only fetch from user's organization
      if (!organization?.id) {
        logger.error('Organization ID not found for fetchScannedCounts');
        return;
      }
      
      const { data: scannedRows, error } = await supabase
        .from('bottle_scans')
        .select('order_number, bottle_barcode')
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      
      const counts = {};
      const allOrderNumbers = new Set();
      (scannedRows || []).forEach(row => {
        if (row.order_number) {
          const orderNum = String(row.order_number).trim();
          allOrderNumbers.add(orderNum);
          counts[orderNum] = (counts[orderNum] || 0) + 1;
        }
      });
      
      logger.log('📊 Scanned counts:', counts);
      logger.log('📋 ALL ORDER NUMBERS IN BOTTLE_SCANS:', Array.from(allOrderNumbers).sort());
      logger.log('📋 Sample bottle_scans rows:', scannedRows?.slice(0, 5));
      setScannedCounts(counts);
    } catch (error) {
      logger.error('Error fetching scanned counts:', error);
    }
  }

  // Batch fetch all relevant bottles for all pending invoices
  async function fetchAllScanned() {
    try {
      // SECURITY: Only fetch from user's organization
      if (!organization?.id) {
        logger.error('Organization ID not found for fetchAllScanned');
        return;
      }
      
      // Get from bottle_scans table
      const { data: scannedRows, error: scanError } = await supabase
        .from('bottle_scans')
        .select('*')
        .eq('organization_id', organization.id);
      
      if (scanError) {
        logger.error('Error fetching bottle_scans:', scanError);
        // Continue with empty array
      }
      
      // Also get from scans table (legacy/mobile scans) - EXCLUDE REJECTED, APPROVED, VERIFIED
      // But first, let's check ALL scans to see what we have (including approved/verified)
      const { data: allMobileScans, error: allMobileError } = await supabase
        .from('scans')
        .select('*')
        .eq('organization_id', organization.id);
      
      if (allMobileError) {
        logger.error('Error fetching all mobile scans:', allMobileError);
      } else {
        const statusBreakdown = (allMobileScans || []).reduce((acc, s) => {
          const status = s.status || 'null';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        
        const scansWithOrder66668 = (allMobileScans || []).filter(s => 
          String(s.order_number || '').trim() === '66668' || 
          String(s.order_number || '').trim().replace(/^0+/, '') === '66668'
        );
        
        logger.log('🔍 ALL mobile scans in database:', {
          total: allMobileScans?.length || 0,
          byStatus: statusBreakdown,
          withOrderNumber: allMobileScans?.filter(s => s.order_number).length || 0,
          orderNumbers: [...new Set((allMobileScans || []).map(s => s.order_number).filter(Boolean))].slice(0, 10),
          scansForOrder66668: scansWithOrder66668.length,
          sampleScansFor66668: scansWithOrder66668.slice(0, 3).map(s => ({
            id: s.id,
            order_number: s.order_number,
            status: s.status,
            barcode: s.barcode_number || s.bottle_barcode,
            mode: s.mode,
            action: s.action
          }))
        });
      }
      
      // Now filter to only pending scans (but also include approved/verified for unverified orders)
      // We'll filter out approved/verified later when we know which orders are unverified
      const { data: mobileScans, error: mobileError } = await supabase
        .from('scans')
        .select('*')
        .eq('organization_id', organization.id)
        .not('status', 'eq', 'rejected');
      
      if (mobileError) {
        logger.error('Error fetching mobile scans:', mobileError);
        // Continue with empty array
      }
      
      // Combine both sources
      const allScans = [...(scannedRows || []), ...(mobileScans || [])];
      
      // Log order numbers for debugging
      const orderNumbers = [...new Set(allScans.map(s => s.order_number).filter(Boolean))];
      const scansWithoutOrder = allScans.filter(s => !s.order_number);
      
      logger.log('📊 Loaded scans:', { 
        bottleScans: scannedRows?.length || 0, 
        mobileScans: mobileScans?.length || 0, 
        total: allScans.length,
        orderNumbers: orderNumbers.slice(0, 10), // Show first 10 order numbers
        scansWithoutOrderNumber: scansWithoutOrder.length,
        sampleScansWithoutOrder: scansWithoutOrder.slice(0, 3).map(s => ({
          id: s.id,
          barcode: s.barcode_number || s.bottle_barcode,
          status: s.status,
          mode: s.mode,
          action: s.action,
          created_at: s.created_at
        }))
      });
      
      // Also log scans WITH order numbers to see what we have
      const scansWithOrder = allScans.filter(s => s.order_number);
      if (scansWithOrder.length > 0) {
        logger.log('📋 Scans WITH order numbers:', scansWithOrder.slice(0, 5).map(s => ({
          order_number: s.order_number,
          barcode: s.barcode_number || s.bottle_barcode,
          status: s.status,
          mode: s.mode
        })));
      }
      
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
      if (!organization?.id) {
        logger.warn('⚠️ No organization ID, cannot fetch scanned orders');
        return;
      }
      
      // Get all scanned orders from bottle_scans table - CRITICAL: Filter by organization_id
      const { data: scannedRows, error: scanError } = await supabase
        .from('bottle_scans')
        .select('*')
        .eq('organization_id', organization.id) // CRITICAL: Only get scans for this organization
        .not('order_number', 'is', null);
      
      logger.log('🔍 Fetched bottle_scans:', scannedRows?.length || 0, 'records for org:', organization.id);
      
      if (scanError) throw scanError;

      // Also get scans from the mobile app scans table (exclude rejected and approved ones)
      const { data: mobileScans, error: mobileError } = await supabase
        .from('scans')
        .select('*')
        .eq('organization_id', organization.id) // CRITICAL: Only get scans for this organization
        .not('order_number', 'is', null)
        .not('status', 'eq', 'rejected') // EXCLUDE REJECTED SCANS
        .not('status', 'eq', 'approved') // EXCLUDE APPROVED SCANS
        .not('status', 'eq', 'verified'); // EXCLUDE VERIFIED SCANS
      
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

      // Group scanned rows by order number - EXCLUDE REJECTED AND APPROVED
      const orderGroups = {};
      allScannedRows.forEach(scan => {
        // Skip rejected, approved, and verified scans (both from scans and bottle_scans tables)
        if (scan.status === 'rejected' || scan.status === 'approved' || scan.status === 'verified') return;
        
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

      // Also get all order numbers from approved/verified imported invoices
      // This helps clean up orphaned bottle_scans from previously approved orders
      const { data: approvedImports, error: approvedImportError } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('organization_id', organization.id)
        .in('status', ['approved', 'verified']);
      
      const approvedOrderNumbers = new Set();
      if (!approvedImportError && approvedImports) {
        approvedImports.forEach(imp => {
          const data = parseDataField(imp.data);
          const rows = data.rows || data.line_items || [];
          rows.forEach(row => {
            const orderNum = (row.order_number || row.invoice_number || row.reference_number || '').toString().trim();
            if (orderNum) {
              approvedOrderNumbers.add(orderNum);
            }
          });
        });
      }
      logger.log('📋 Approved order numbers from imports:', Array.from(approvedOrderNumbers));

      // Convert to the same format as imported invoices for consistency
      // Only create scanned-only records for orders that DON'T have matching imports
      // Also check if order has approved scans in scans table
      const scannedOnlyRecords = (await Promise.all(
        Object.entries(orderGroups)
          .filter(([orderNumber]) => !importedOrderNumbers.has(orderNumber))
          .map(async ([orderNumber, scans]) => {
            // Double-check: Query scans table to see if this order has any approved/verified scans
            // This catches cases where order was approved but bottle_scans weren't deleted
            const { data: approvedScans, error: approvedError } = await supabase
              .from('scans')
              .select('id, status')
              .eq('order_number', orderNumber)
              .eq('organization_id', organization.id)
              .in('status', ['approved', 'verified']);
            
            if (approvedError) {
              logger.warn(`⚠️ Error checking approved scans for order ${orderNumber}:`, approvedError);
            } else if (approvedScans && approvedScans.length > 0) {
              logger.log(`🚫 Filtering out order ${orderNumber} - has ${approvedScans.length} approved/verified scans in scans table`);
              // DON'T delete bottle_scans - keep them for history/verification
              return null; // Skip this order - it's already approved
            }
            
            // Also check if this order exists in approved imported invoices
            // This catches cases where the order was imported and approved, but bottle_scans weren't cleaned up
            if (approvedOrderNumbers.has(orderNumber)) {
              logger.log(`🚫 Filtering out order ${orderNumber} - has matching approved import`);
              // DON'T delete bottle_scans - keep them for history/verification
              return null; // Skip this order - it's already approved
            }
          // Get customer info from the first scan
          const firstScan = scans[0];
          const customerName = firstScan.customer_name || firstScan.customer || 'Unknown Customer';
          const customerId = firstScan.customer_id || firstScan.CustomerID || firstScan.CustomerId || firstScan.CustomerListID || null;
          
          // Deduplicate scans by barcode to prevent multiple entries for the same bottle
          const seenBarcodes = new Set();
          const uniqueScans = scans.filter(scan => {
            const barcode = scan.barcode_number || scan.bottle_barcode;
            if (!barcode) return true; // Keep scans without barcodes
            
            if (seenBarcodes.has(barcode)) {
              logger.log('⚠️ Skipping duplicate scan for barcode:', barcode);
              return false;
            }
            seenBarcodes.add(barcode);
            return true;
          });
          
          logger.log(`📊 Deduplicated scans for order ${orderNumber}: ${scans.length} -> ${uniqueScans.length}`);
          
          // Create a mock data structure that matches imported invoices format
          return {
            id: `scanned_${orderNumber}`,
            data: {
              rows: uniqueScans.map(scan => {
                // Determine if this is a SHIP/OUT scan or RETURN/IN scan
                // Check multiple field names and values to be robust
                const mode = scan.mode || scan.scan_type || scan.action || '';
                const modeUpper = mode.toString().toUpperCase();
                const action = (scan.action || '').toString().toLowerCase();
                const scanType = (scan.scan_type || '').toString().toLowerCase();
                
                const isOut = action === 'out' || 
                              scanType === 'delivery' || 
                              modeUpper === 'SHIP' || 
                              modeUpper === 'DELIVERY' ||
                              modeUpper === 'OUT';
                              
                const isIn = action === 'in' || 
                            scanType === 'pickup' || 
                            modeUpper === 'RETURN' || 
                            modeUpper === 'PICKUP' ||
                            modeUpper === 'IN';
                
                // Log for debugging (only for first few scans to avoid spam)
                if (uniqueScans.indexOf(scan) < 3) {
                  logger.log(`📊 Scan processing: barcode=${scan.barcode_number || scan.bottle_barcode}, mode="${mode}", action="${scan.action}", scan_type="${scan.scan_type}", isOut=${isOut}, isIn=${isIn}`);
                }
                
                const row = {
                  order_number: orderNumber,
                  customer_name: customerName,
                  customer_id: customerId,
                  CustomerID: customerId,
                  CustomerId: customerId,
                  CustomerListID: customerId,
                  product_code: scan.product_code || scan.bottle_barcode || scan.barcode_number || 'Unknown',
                  qty_out: isOut ? 1 : 0,
                  qty_in: isIn ? 1 : 0,
                  date: scan.scan_date || scan.created_at || new Date().toISOString().split('T')[0],
                  location: scan.location || 'Unknown',
                  // Add mobile-specific fields for better display
                  barcode: scan.barcode_number || scan.bottle_barcode,
                  description: scan.description || 'Unknown',
                  gas_type: scan.gas_type || 'Unknown'
                };
                
                // Log first few rows for debugging
                if (uniqueScans.indexOf(scan) < 3) {
                  logger.log(`📊 Created scanned-only row: barcode=${row.barcode}, qty_out=${row.qty_out}, qty_in=${row.qty_in}, mode="${mode}", isOut=${isOut}, isIn=${isIn}`);
                }
                
                return row;
              }),
              customer_name: customerName,
              customer_id: customerId,
              CustomerID: customerId,
              CustomerId: customerId,
              CustomerListID: customerId,
              summary: {
                total_rows: uniqueScans.length,
                uploaded_by: firstScan.user_id || 'scanner',
                uploaded_at: firstScan.created_at || new Date().toISOString()
              },
              is_scanned_only: true
            },
            uploaded_by: firstScan.user_id || 'scanner',
            status: 'scanned_only',
            created_at: firstScan.created_at || new Date().toISOString(),
            is_scanned_only: true
          };
          })))
        .filter(r => r !== null);

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
      // SECURITY: Only fetch bottles from user's organization
      if (!organization?.id) {
        logger.error('Organization ID not found for fetchBottles');
        return;
      }
      const { data: bottles, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id);
      if (error) throw error;
      const assetMap = {};
      (bottles || []).forEach(bottle => {
        // Create entry by product code
        if (bottle.product_code) {
          assetMap[bottle.product_code] = {
            description: bottle.description || (bottle.gas_type && bottle.size ? `${bottle.gas_type} BOTTLE - SIZE ${bottle.size}` : ''),
            type: bottle.product_code || '', // Type should be like BAR300
            size: bottle.size || '',
            group: bottle.gas_type || '', // Group is gas type
            category: bottle.category || 'INDUSTRIAL CYLINDERS', // Category standardized
            barcode: bottle.barcode_number || '',
            serial_number: bottle.serial_number || '',
            product_code: bottle.product_code || ''
          };
        }
        
        // Also create entry by barcode for direct lookup
        if (bottle.barcode_number) {
          assetMap[bottle.barcode_number] = {
            description: bottle.description || (bottle.gas_type && bottle.size ? `${bottle.gas_type} BOTTLE - SIZE ${bottle.size}` : ''),
            type: bottle.product_code || '',
            size: bottle.size || '',
            group: bottle.gas_type || '',
            category: bottle.category || 'INDUSTRIAL CYLINDERS',
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

  // Fetch bottle information for an order
  async function fetchBottleInfoForOrder(orderNumber) {
    try {
      if (!orderNumber) {
        logger.error('No order number provided to fetchBottleInfoForOrder');
        setBottleInfoDialog(prev => ({
          ...prev,
          loading: false,
          bottles: [],
          scannedBarcodes: []
        }));
        return;
      }

      logger.log('🔍 Fetching bottle info for order:', orderNumber, 'Type:', typeof orderNumber);
      setBottleInfoDialog(prev => ({ ...prev, loading: true, bottles: [] }));
      
      // Normalize order number - try multiple formats
      const orderNumStr = orderNumber.toString().trim();
      const orderNumNum = parseInt(orderNumStr, 10);
      const orderNumVariants = [
        orderNumStr,                    // "55666"
        orderNumNum.toString(),         // "55666" (as number string)
        orderNumStr.padStart(10, '0'),  // "0000055666" (with leading zeros)
        orderNumNum                     // 55666 (as number)
      ];
      
      // Remove duplicates
      const uniqueOrderNumbers = [...new Set(orderNumVariants.map(v => v.toString().trim()))];
      logger.log('🔍 Trying order number variants:', uniqueOrderNumbers);
      
      // Get all scanned barcodes for this order
      const scannedBarcodes = new Set();
      
      // Get scans from scans table - try all order number variants
      let scans = [];
      if (organization?.id) {
        // Try exact match first
        let { data: scansData, error: scansError } = await supabase
          .from('scans')
          .select('barcode_number, product_code, action, mode, created_at, customer_name, order_number')
          .eq('order_number', orderNumStr)
          .eq('organization_id', organization.id);
        
        if (scansError) {
          logger.error('❌ Error fetching scans (exact match):', scansError);
        } else if (scansData && scansData.length > 0) {
          scans = scansData;
        } else {
          // Try number match
          if (!isNaN(orderNumNum)) {
            const { data: scansDataNum, error: scansErrorNum } = await supabase
              .from('scans')
              .select('barcode_number, product_code, action, mode, created_at, customer_name, order_number')
              .eq('order_number', orderNumNum)
              .eq('organization_id', organization.id);
            
            if (!scansErrorNum && scansDataNum && scansDataNum.length > 0) {
              scans = scansDataNum;
              logger.log('✅ Found scans using numeric match');
            }
          }
          
          // If still no results, try OR query with all variants
          if (scans.length === 0 && uniqueOrderNumbers.length > 1) {
            const { data: scansDataAll, error: scansErrorAll } = await supabase
              .from('scans')
              .select('barcode_number, product_code, action, mode, created_at, customer_name, order_number')
              .in('order_number', uniqueOrderNumbers)
              .eq('organization_id', organization.id);
            
            if (!scansErrorAll && scansDataAll && scansDataAll.length > 0) {
              scans = scansDataAll;
              logger.log('✅ Found scans using variant match');
            }
          }
          
          // If still no results, try text-based search (ILIKE) for partial matches
          if (scans.length === 0) {
            let { data: scansText, error: scansTextError } = await supabase
              .from('scans')
              .select('barcode_number, product_code, action, mode, created_at, customer_name, order_number')
              .ilike('order_number', `%${orderNumStr}%`)
              .eq('organization_id', organization.id);
            
            if (!scansTextError && scansText && scansText.length > 0) {
              // Filter to only exact matches after trimming/normalizing
              const normalizedScans = scansText.filter(s => {
                const normalized = s.order_number?.toString().trim();
                return normalized === orderNumStr || normalized === orderNumNum.toString();
              });
              
              if (normalizedScans.length > 0) {
                scans = normalizedScans;
                logger.log('✅ Found scans using text-based search (ILIKE)');
              }
            }
          }
        }
        
        logger.log('📦 Found scans in scans table:', scans.length, 'for order', orderNumber);
        if (scans.length > 0) {
          logger.log('📦 Sample scan order_numbers:', scans.slice(0, 3).map(s => s.order_number));
        }
        
        // If no scans found with organization filter, try without it (as fallback)
        if (scans.length === 0) {
          logger.log('🔍 Trying scans table without organization filter...');
          const { data: scansNoOrg, error: scansNoOrgError } = await supabase
            .from('scans')
            .select('barcode_number, product_code, action, mode, created_at, customer_name, order_number, organization_id')
            .eq('order_number', orderNumStr);
          
          if (!scansNoOrgError && scansNoOrg && scansNoOrg.length > 0) {
            // Filter to our organization or null organization_id
            const filteredScans = scansNoOrg.filter(s => 
              !s.organization_id || s.organization_id === organization.id
            );
            
            if (filteredScans.length > 0) {
              scans = filteredScans;
              logger.log('✅ Found scans without org filter:', scans.length);
            }
          }
        }
      } else {
        logger.warn('⚠️ No organization ID, cannot fetch from scans table');
      }
      
      if (scans && scans.length > 0) {
        scans.forEach(scan => {
          if (scan.barcode_number) scannedBarcodes.add(scan.barcode_number.toString().trim());
        });
        logger.log('📊 Scans table barcodes:', Array.from(scannedBarcodes));
      } else {
        logger.log('⚠️ No scans found in scans table for order:', orderNumber);
      }
      
      // Also check bottle_scans table (may not have organization_id column)
      // NOTE: bottle_scans uses 'bottle_barcode' and 'cylinder_barcode', not 'barcode_number'
      let bottleScans = [];
      
      // Try exact match first (string)
      let { data: bottleScansData, error: bottleScansError } = await supabase
        .from('bottle_scans')
        .select('bottle_barcode, cylinder_barcode, barcode_number, created_at, order_number, organization_id')
        .eq('order_number', orderNumStr);
      
      if (bottleScansError) {
        logger.error('❌ Error fetching bottle_scans (exact match):', bottleScansError);
      } else {
        bottleScans = bottleScansData || [];
      }
      
      // If no results, try number match
      if (bottleScans.length === 0 && !isNaN(orderNumNum)) {
        const { data: bottleScansDataNum, error: bottleScansErrorNum } = await supabase
          .from('bottle_scans')
          .select('bottle_barcode, cylinder_barcode, barcode_number, created_at, order_number, organization_id')
          .eq('order_number', orderNumNum);
        
        if (!bottleScansErrorNum && bottleScansDataNum && bottleScansDataNum.length > 0) {
          bottleScans = bottleScansDataNum;
          logger.log('✅ Found bottle_scans using numeric match');
        }
      }
      
      // If still no results, try OR query with all variants
      if (bottleScans.length === 0 && uniqueOrderNumbers.length > 1) {
        const { data: bottleScansDataAll, error: bottleScansErrorAll } = await supabase
          .from('bottle_scans')
          .select('bottle_barcode, cylinder_barcode, barcode_number, created_at, order_number, organization_id')
          .in('order_number', uniqueOrderNumbers);
        
        if (!bottleScansErrorAll && bottleScansDataAll && bottleScansDataAll.length > 0) {
          bottleScans = bottleScansDataAll;
          logger.log('✅ Found bottle_scans using variant match');
        }
      }
      
      // If still no results, try text-based search (ILIKE) for partial matches
      // This handles cases where order_number might be stored with extra spaces or in different format
      if (bottleScans.length === 0) {
        // First try: order number contains the search term
        let { data: bottleScansText, error: bottleScansTextError } = await supabase
          .from('bottle_scans')
          .select('bottle_barcode, cylinder_barcode, barcode_number, created_at, order_number, organization_id')
          .ilike('order_number', `%${orderNumStr}%`);
        
        if (!bottleScansTextError && bottleScansText && bottleScansText.length > 0) {
          // Filter to only exact matches after trimming/normalizing
          const normalizedBottleScans = bottleScansText.filter(bs => {
            const normalized = bs.order_number?.toString().trim();
            return normalized === orderNumStr || normalized === orderNumNum.toString();
          });
          
          if (normalizedBottleScans.length > 0) {
            bottleScans = normalizedBottleScans;
            logger.log('✅ Found bottle_scans using text-based search (ILIKE)');
          }
        }
      }
      
      logger.log('📦 Raw bottle_scans data for order', orderNumber, ':', bottleScans.length, 'scans');
      if (bottleScans.length > 0) {
        logger.log('📦 Sample bottle_scan order_numbers:', bottleScans.slice(0, 3).map(bs => bs.order_number));
      }
      
      // DEBUG: If no scans found, check what order numbers actually exist
      if (bottleScans.length === 0 && scans.length === 0) {
        logger.log('🔍 DEBUG: No scans found, checking what order numbers exist...');
        logger.log('🔍 DEBUG: Searched for order number:', orderNumber, 'variants:', uniqueOrderNumbers);
        logger.log('🔍 DEBUG: Organization ID:', organization?.id);
        
        // Check bottle_scans table
        const { data: allOrderNumbers } = await supabase
          .from('bottle_scans')
          .select('order_number, organization_id, created_at')
          .limit(100)
          .order('created_at', { ascending: false });
        
        if (allOrderNumbers && allOrderNumbers.length > 0) {
          const orderNumbersSet = new Set(allOrderNumbers.map(s => s.order_number?.toString().trim()).filter(Boolean));
          logger.log('🔍 DEBUG: Sample order numbers in bottle_scans (last 100):', Array.from(orderNumbersSet).slice(0, 30));
          
          // Show order numbers with our organization if available
          if (organization?.id) {
            const orgOrderNumbers = allOrderNumbers
              .filter(s => s.organization_id === organization.id)
              .map(s => s.order_number?.toString().trim())
              .filter(Boolean);
            const orgOrderNumbersSet = new Set(orgOrderNumbers);
            logger.log('🔍 DEBUG: Order numbers for our organization:', Array.from(orgOrderNumbersSet).slice(0, 20));
          }
          
          // Check if our order number is close to any existing ones
          const matchingNumbers = Array.from(orderNumbersSet).filter(on => 
            on.includes(orderNumStr) || orderNumStr.includes(on)
          );
          if (matchingNumbers.length > 0) {
            logger.log('🔍 DEBUG: Similar order numbers found:', matchingNumbers);
          }
          
          // Check for exact matches with different type
          const exactMatches = Array.from(orderNumbersSet).filter(on => {
            const normalized = on.trim();
            return normalized === orderNumStr || normalized === orderNumNum.toString();
          });
          if (exactMatches.length > 0) {
            logger.log('⚠️ WARNING: Found exact match order numbers but scans query returned empty!', exactMatches);
          }
        }
        
        // Also check scans table if we have organization
        if (organization?.id) {
          const { data: scansOrderNumbers } = await supabase
            .from('scans')
            .select('order_number, organization_id')
            .eq('organization_id', organization.id)
            .limit(50)
            .order('created_at', { ascending: false });
          
          if (scansOrderNumbers && scansOrderNumbers.length > 0) {
            const scansOrderNumbersSet = new Set(scansOrderNumbers.map(s => s.order_number?.toString().trim()).filter(Boolean));
            logger.log('🔍 DEBUG: Sample order numbers in scans table:', Array.from(scansOrderNumbersSet).slice(0, 20));
          }
        }
      }
      
      // Filter by organization_id if the column exists and we have organization
      if (bottleScans.length > 0 && organization?.id) {
        const beforeFilter = bottleScans.length;
        bottleScans = bottleScans.filter(bs => {
          // Some scans might not have organization_id, so include them if missing
          return !bs.organization_id || bs.organization_id === organization.id;
        });
        logger.log(`📦 Filtered bottle_scans: ${beforeFilter} -> ${bottleScans.length} (org filter: ${organization.id})`);
      }
      
      if (bottleScans && bottleScans.length > 0) {
        bottleScans.forEach(scan => {
          // bottle_scans table uses 'bottle_barcode' as primary field
          if (scan.bottle_barcode) scannedBarcodes.add(scan.bottle_barcode.toString().trim());
          if (scan.cylinder_barcode) scannedBarcodes.add(scan.cylinder_barcode.toString().trim());
          if (scan.barcode_number) scannedBarcodes.add(scan.barcode_number.toString().trim()); // Fallback
        });
        logger.log('📊 Found bottle_scans:', bottleScans.length, 'unique barcodes:', Array.from(scannedBarcodes));
      } else {
        logger.log('⚠️ No bottle_scans found for order:', orderNumber);
      }
      
      // FALLBACK: Always check allScannedRows (preloaded data) - this is more reliable
      // This matches the strategy used by getScannedQty which successfully finds scans
      if (allScannedRows && allScannedRows.length > 0) {
        logger.log('🔍 FALLBACK: Checking allScannedRows for order:', orderNumber, 'Type:', typeof orderNumber);
        logger.log('🔍 FALLBACK: Total rows in allScannedRows:', allScannedRows.length);
        logger.log('🔍 FALLBACK: orderNumStr:', orderNumStr, 'orderNumNum:', orderNumNum);
        
        // Use EXACT same matching logic as getScannedQty (line 5820)
        // getScannedQty uses: row.order_number === orderNum || row.invoice_number === orderNum
        // But we need to try both string and number versions since types might not match
        const fallbackScans = allScannedRows.filter(row => {
          // Try strict equality first (like getScannedQty), then loose equality for type mismatches
          const orderMatch = 
            row.order_number === orderNumber ||      // Exact match (original value)
            row.order_number === orderNumStr ||      // String match
            row.order_number === orderNumNum ||      // Number match
            row.order_number == orderNumber ||       // Loose match (type coercion)
            row.order_number == orderNumStr ||
            row.order_number == orderNumNum ||
            row.invoice_number === orderNumber ||
            row.invoice_number === orderNumStr ||
            row.invoice_number === orderNumNum ||
            row.invoice_number == orderNumber ||
            row.invoice_number == orderNumStr ||
            row.invoice_number == orderNumNum;
          
          if (orderMatch) {
            logger.log('🔍 FALLBACK: Match found!', {
              row_order_number: row.order_number,
              row_invoice_number: row.invoice_number,
              row_type: typeof row.order_number,
              searched: orderNumber,
              barcode: row.barcode_number || row.bottle_barcode
            });
          }
          
          return orderMatch;
          // NOTE: getScannedQty does NOT filter by organization_id, so we don't either
        });
        
        logger.log('🔍 FALLBACK: Found', fallbackScans.length, 'matching scans in allScannedRows');
        if (fallbackScans.length > 0) {
          logger.log('🔍 FALLBACK: Sample scan order_numbers:', fallbackScans.slice(0, 3).map(s => ({
            order_number: s.order_number,
            invoice_number: s.invoice_number,
            barcode: s.barcode_number || s.bottle_barcode,
            org_id: s.organization_id
          })));
          
          // Extract barcodes from fallback scans
          const beforeFallback = scannedBarcodes.size;
          fallbackScans.forEach(scan => {
            if (scan.barcode_number) scannedBarcodes.add(scan.barcode_number.toString().trim());
            if (scan.bottle_barcode) scannedBarcodes.add(scan.bottle_barcode.toString().trim());
            if (scan.cylinder_barcode) scannedBarcodes.add(scan.cylinder_barcode.toString().trim());
          });
          
          // Also add to scans/bottleScans arrays for matching with bottles
          const scansToAdd = fallbackScans.filter(s => s.mode || s.action || s.scan_type);
          const bottleScansToAdd = fallbackScans.filter(s => s.bottle_barcode || s.cylinder_barcode);
          
          scans = [...scans, ...scansToAdd];
          bottleScans = [...bottleScans, ...bottleScansToAdd];
          
          logger.log('✅ FALLBACK: Added', scannedBarcodes.size - beforeFallback, 'new barcodes (total:', scannedBarcodes.size, ')');
          logger.log('✅ FALLBACK: Added', scansToAdd.length, 'scans and', bottleScansToAdd.length, 'bottle_scans');
        } else {
          // Debug: Show what order numbers actually exist in allScannedRows
          const uniqueOrderNums = [...new Set(allScannedRows.map(s => s.order_number?.toString().trim()).filter(Boolean))];
          logger.log('⚠️ FALLBACK: No matching scans. Sample order numbers in allScannedRows:', uniqueOrderNums.slice(0, 20));
        }
      } else {
        logger.log('⚠️ FALLBACK: allScannedRows is empty or not loaded');
      }
      
      // Fetch bottle details from database
      const bottles = [];
      logger.log('🔍 Summary - Scanned barcodes found:', scannedBarcodes.size, Array.from(scannedBarcodes));
      logger.log('🔍 Organization ID:', organization?.id);
      
      if (scannedBarcodes.size > 0 && organization?.id) {
        const barcodeArray = Array.from(scannedBarcodes);
        logger.log('🔍 Fetching bottles for', barcodeArray.length, 'barcodes:', barcodeArray);
        
        const { data: bottleData, error: bottleError } = await supabase
          .from('bottles')
          .select('*')
          .in('barcode_number', barcodeArray)
          .eq('organization_id', organization.id);
        
        if (bottleError) {
          logger.error('❌ Error fetching bottles:', bottleError);
          setError('Failed to fetch bottles: ' + bottleError.message);
        } else if (bottleData) {
          logger.log('✅ Found bottles in database:', bottleData.length, 'bottles');
          logger.log('✅ Bottle barcodes found:', bottleData.map(b => b.barcode_number));
          
          // Match bottles with scan information
          bottleData.forEach(bottle => {
            // Match with scans table
            const scanInfo = scans?.find(s => 
              s.barcode_number?.toString().trim() === bottle.barcode_number?.toString().trim() || 
              s.bottle_barcode?.toString().trim() === bottle.barcode_number?.toString().trim()
            );
            
            // Match with bottle_scans table (uses bottle_barcode and cylinder_barcode)
            const bottleScanInfo = bottleScans?.find(bs => 
              bs.bottle_barcode?.toString().trim() === bottle.barcode_number?.toString().trim() || 
              bs.cylinder_barcode?.toString().trim() === bottle.barcode_number?.toString().trim() ||
              bs.barcode_number?.toString().trim() === bottle.barcode_number?.toString().trim()
            );
            
            bottles.push({
              ...bottle,
              scanAction: scanInfo?.action || scanInfo?.mode || bottleScanInfo?.mode || 'unknown',
              scanDate: scanInfo?.created_at || bottleScanInfo?.created_at
            });
          });
          
          // Check if we found scans but no bottles
          if (bottles.length === 0 && scannedBarcodes.size > 0) {
            logger.warn('⚠️ WARNING: Found scanned barcodes but no matching bottles in database!');
            logger.warn('⚠️ Scanned barcodes:', Array.from(scannedBarcodes));
            logger.warn('⚠️ This means bottles were scanned but don\'t exist in the bottles table');
          }
        }
      } else if (scannedBarcodes.size === 0) {
        logger.warn('⚠️ No scanned barcodes found for order:', orderNumber);
        logger.warn('⚠️ This could mean:');
        logger.warn('   1. No scans exist for this order number');
        logger.warn('   2. Order number format doesn\'t match (check for leading zeros, spaces, etc.)');
        logger.warn('   3. Scans are in a different organization');
      } else if (!organization?.id) {
        logger.error('❌ No organization ID available');
        setError('Organization not found');
      }
      
      setBottleInfoDialog(prev => ({
        ...prev,
        bottles: bottles,
        scannedBarcodes: Array.from(scannedBarcodes), // Store scanned barcodes for display
        loading: false
      }));
      
      logger.log(`✅ Fetched ${bottles.length} bottles for order ${orderNumber} (from ${scannedBarcodes.size} scanned barcodes)`);
    } catch (error) {
      logger.error('❌ Error fetching bottle info:', error);
      setError('Failed to fetch bottle information: ' + error.message);
      setBottleInfoDialog(prev => ({
        ...prev,
        loading: false,
        bottles: []
      }));
    }
  }

  // Handle opening bottle info dialog - defined early to avoid hoisting issues
  function handleViewBottles(orderNumber) {
      setBottleInfoDialog({
      open: true,
      orderNumber: orderNumber,
      bottles: [],
      scannedBarcodes: [],
      loading: true
    });
    fetchBottleInfoForOrder(orderNumber);
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
      // SECURITY: Only access bottles from user's organization
      const { data: bottles, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('barcode_number', barcode)
        .eq('organization_id', organization.id);

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

          // Get location for this delivery
          const deliveryLocation = scan.location || customer.city || customer.address || 'Unknown';
          
          // Update bottle assignment AND location
          const { error: bottleError } = await supabase
            .from('bottles')
            .update({ 
              assigned_customer: customer.CustomerListID,
              location: deliveryLocation, // Update location to customer's location
              last_location_update: new Date().toISOString()
            })
            .eq('barcode_number', scan.cylinder_barcode)
            .eq('organization_id', organization.id); // SECURITY: Only update bottles from user's organization
          
          if (bottleError) {
            logger.error('Error assigning bottle to customer:', bottleError);
          } else {
            logger.log(`✅ Updated bottle ${scan.cylinder_barcode} - Customer: ${customer.CustomerListID}, Location: ${deliveryLocation}`);
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
              .eq('barcode_number', scan.cylinder_barcode)
            .eq('organization_id', organization.id); // SECURITY: Only update bottles from user's organization
            
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

          // Get location for this delivery
          const deliveryLocation = scan.location || customer.city || customer.address || 'Unknown';
          
          // Update bottle assignment AND location
          const { error: bottleError } = await supabase
            .from('bottles')
            .update({ 
              assigned_customer: customer.CustomerListID,
              location: deliveryLocation, // Update location to customer's location
              last_location_update: new Date().toISOString()
            })
            .eq('barcode_number', scan.cylinder_barcode)
            .eq('organization_id', organization.id); // SECURITY: Only update bottles from user's organization
          
          if (bottleError) {
            logger.error('Error assigning bottle to customer:', bottleError);
          } else {
            logger.log(`✅ Updated bottle ${scan.cylinder_barcode} - Customer: ${customer.CustomerListID}, Location: ${deliveryLocation}`);
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
              .eq('barcode_number', scan.cylinder_barcode)
            .eq('organization_id', organization.id); // SECURITY: Only update bottles from user's organization
            
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
    const productCode = lineItem.product_code || lineItem.ProductCode || lineItem.Item || '';
    
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
    
    // IMPORTANT: Use actual product_code from bottle info if available, not barcode
    const finalProductCode = assetInfo.product_code || productCode || barcode;
    
    return {
      productCode: finalProductCode,
      category: assetInfo.category || lineItem.category || 'INDUSTRIAL CYLINDERS',
      group: assetInfo.group || lineItem.group || '',
      type: assetInfo.type || lineItem.type || finalProductCode,
      description: lineItem.description || assetInfo.description || finalProductCode,
      billingCode: lineItem.billing_code || lineItem.BillingCode || finalProductCode
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
    
    // Check if this is a scanned-only record (no invoice data)
    // First check if the data structure itself has the flag
    const hasScannedOnlyFlag = data.is_scanned_only === true || 
                               (data.summary && data.summary.is_scanned_only === true);
    
    // Also check by characteristics: scanned-only records have barcodes and qty_out/qty_in from scans,
    // but don't have invoice-style shipped/returned fields
    const hasScannedOnlyCharacteristics = lineItems.length > 0 && lineItems.every(item => {
      // Check if this item has a barcode (scans always have barcodes)
      const hasBarcode = !!(item.barcode || item.barcode_number || item.bottle_barcode);
      
      // Check if this item has scan quantities (qty_out/qty_in)
      const hasScanQuantities = !!(item.qty_out || item.qty_in);
      
      // Check if this item has invoice quantities (shipped/returned from invoices)
      // Note: getShippedQuantity/getReturnedQuantity check qty_out/qty_in first,
      // so we need to check the actual invoice fields
      const hasInvoiceQuantities = !!(item.shipped || item.returned || item.QtyOut || item.QtyIn);
      
      // It's scanned-only if it has barcodes and scan quantities, but no invoice quantities
      return hasBarcode && hasScanQuantities && !hasInvoiceQuantities;
    });
    
    const isScannedOnly = hasScannedOnlyFlag || hasScannedOnlyCharacteristics;
    
    logger.log(`📊 getDetailedLineItems: isScannedOnly=${isScannedOnly}, lineItems.length=${lineItems.length}`);
    if (isScannedOnly && lineItems.length > 0) {
      logger.log(`📊 First item sample:`, {
        barcode: lineItems[0].barcode || lineItems[0].barcode_number,
        qty_out: lineItems[0].qty_out,
        qty_in: lineItems[0].qty_in,
        shipped: lineItems[0].shipped,
        returned: lineItems[0].returned
      });
    }
    
    // For scanned-only records, aggregate by product code AND barcode to prevent duplicates
    if (isScannedOnly && lineItems.length > 0) {
      const aggregated = {};
      const seenBarcodes = new Set(); // Track barcodes to prevent duplicate entries
      
      lineItems.forEach(item => {
        const productInfo = getProductInfo(item);
        const productCode = productInfo.productCode;
        
        // Use barcode as a unique key to prevent duplicate entries from the same scan
        const barcode = item.barcode || item.barcode_number || item.bottle_barcode || 
                       `${productCode}_${item.qty_out}_${item.qty_in}`;
        
        // Create a unique key combining product code and barcode
        const uniqueKey = `${productCode}_${barcode}`;
        
        // Skip if we've already processed this exact barcode
        if (seenBarcodes.has(barcode)) {
          logger.log('⚠️ Skipping duplicate barcode in line items:', barcode);
          return;
        }
        
        if (!aggregated[uniqueKey]) {
          seenBarcodes.add(barcode);
          aggregated[uniqueKey] = {
            ...item,
            productInfo,
            shipped: 0,
            returned: 0,
            scannedShipped: 0,
            scannedReturned: 0
          };
        }
        
        // Count scanned quantities - only count if they're actually set (not default 0)
        const qty_out = parseInt(item.qty_out || 0, 10);
        const qty_in = parseInt(item.qty_in || 0, 10);
        
        // Only add to counts if the value is actually set (not just default 0)
        if (qty_out > 0) {
          aggregated[uniqueKey].scannedShipped += qty_out;
        }
        if (qty_in > 0) {
          aggregated[uniqueKey].scannedReturned += qty_in;
        }
        
        logger.log(`📊 Aggregating item: barcode=${item.barcode || item.barcode_number}, qty_out=${qty_out}, qty_in=${qty_in}, scannedShipped=${aggregated[uniqueKey].scannedShipped}, scannedReturned=${aggregated[uniqueKey].scannedReturned}`);
      });
      
      // If we still have multiple entries with the same product code, merge them
      const finalAggregated = {};
      Object.values(aggregated).forEach(item => {
        const productCode = item.productInfo.productCode;
        if (!finalAggregated[productCode]) {
          finalAggregated[productCode] = item;
        } else {
          // Merge quantities for same product code
          finalAggregated[productCode].scannedShipped += item.scannedShipped;
          finalAggregated[productCode].scannedReturned += item.scannedReturned;
        }
      });
      
      const result = Object.values(finalAggregated).map(item => {
        const highlight = getHighlightInfo(item, item.productInfo);
        logger.log(`📊 Final aggregated item: productCode=${item.productInfo.productCode}, scannedShipped=${item.scannedShipped}, scannedReturned=${item.scannedReturned}, qty_out=${item.qty_out}, qty_in=${item.qty_in}`);
        return {
          ...item,
          highlight
        };
      });
      logger.log(`📊 Scanned-only aggregation complete: ${result.length} items, total scannedShipped=${result.reduce((sum, item) => sum + (item.scannedShipped || 0), 0)}, total scannedReturned=${result.reduce((sum, item) => sum + (item.scannedReturned || 0), 0)}`);
      return result;
    }
    
    // For regular invoices, keep existing behavior
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
          rental_order_number: orderNumber
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
          rental_start_date: null
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
              Verification will assign assets to customers and update inventory
            </Typography>
            <ButtonGroup>
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
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {filteredInvoices.length > 0 
                  ? `${filteredInvoices.length} import${filteredInvoices.length !== 1 ? 's' : ''} showing`
                  : 'No imports requiring review'}
              </Typography>
              {pendingInvoices.length > 0 && filteredInvoices.length === 0 && (search || statusFilter !== 'all' || locationFilter !== 'All') && (
                <Button 
                  size="small" 
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setLocationFilter('All');
                  }}
                  sx={{ minHeight: '24px', fontSize: '0.75rem' }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          </Box>
          <Badge badgeContent={(pendingInvoices || []).length} color="primary">
            <Button variant="outlined" disabled>
              Total Records
            </Button>
          </Badge>
        </Box>
      </Paper>

      {/* Bulk Actions Bar */}
      {(selectedRecords || []).length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'action.selected' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2">
              {(selectedRecords || []).length} record(s) selected
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

      {/* Bottle Information Dialog */}
      <Dialog 
        open={bottleInfoDialog.open} 
        onClose={() => setBottleInfoDialog({ open: false, orderNumber: null, bottles: [], scannedBarcodes: [], loading: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <InventoryIcon />
              <Typography variant="h6">
                Bottle Information - Order {bottleInfoDialog.orderNumber}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setBottleInfoDialog({ open: false, orderNumber: null, bottles: [], loading: false })}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {bottleInfoDialog.loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={4}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Loading bottle information...
              </Typography>
            </Box>
          ) : (bottleInfoDialog?.bottles || []).length === 0 ? (
            <Box sx={{ mt: 2 }}>
              <Alert severity={(bottleInfoDialog?.scannedBarcodes || []).length > 0 ? 'warning' : 'info'} sx={{ mb: 2 }}>
                {(bottleInfoDialog?.scannedBarcodes || []).length > 0 ? (
                  <>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      ⚠️ Scans Found But No Matching Bottles
                    </Typography>
                    <Typography variant="body2">
                      Found {(bottleInfoDialog?.scannedBarcodes || []).length} scanned barcode(s) for order {bottleInfoDialog?.orderNumber}, 
                      but no matching bottles exist in the system.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
                      Scanned Barcodes:
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {bottleInfoDialog.scannedBarcodes.map((barcode, idx) => (
                        <Chip
                          key={idx}
                          label={barcode}
                          size="small"
                          color="warning"
                          variant="outlined"
                          onClick={async () => {
                            // Try to find the bottle by barcode and navigate to it
                            try {
                              if (!organization?.id) {
                                setSnackbar('Organization not found');
                                return;
                              }
                              
                              const { data: bottleData, error } = await supabase
                                .from('bottles')
                                .select('id')
                                .eq('barcode_number', barcode)
                                .eq('organization_id', organization.id)
                                .limit(1)
                                .single();
                              
                              if (error || !bottleData) {
                                setSnackbar(`Bottle with barcode ${barcode} not found in system`);
                                return;
                              }
                              
                              navigate(`/bottle/${bottleData.id}`);
                              setBottleInfoDialog({ open: false, orderNumber: null, bottles: [], scannedBarcodes: [], loading: false });
                            } catch (error) {
                              logger.error('Error finding bottle by barcode:', error);
                              setSnackbar(`Failed to find bottle: ${error.message}`);
                            }
                          }}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'warning.light',
                              color: 'warning.contrastText'
                            }
                          }}
                        />
                      ))}
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                      These bottles need to be added to the system before they can be assigned to customers.
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      No Scans Found
                    </Typography>
                    <Typography variant="body2">
                      No bottles were scanned for order <strong>{bottleInfoDialog.orderNumber}</strong>.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Possible reasons:
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, pl: 3, mb: 1 }}>
                      <li>Bottles may not have been scanned yet</li>
                      <li>The order number format doesn't match (check for leading zeros, spaces, etc.)</li>
                      <li>Scans may be in a different organization</li>
                      <li>The order number may be stored differently in the database</li>
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                      Check the browser console (F12) for detailed debug information about what order numbers exist in the system.
                    </Typography>
                  </>
                )}
              </Alert>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Found {(bottleInfoDialog?.bottles || []).length} bottle(s) for order {bottleInfoDialog?.orderNumber}
              </Typography>
              
              {/* Warning if any bottles are already at customers */}
              {(() => {
                const bottlesAtCustomers = (bottleInfoDialog?.bottles || []).filter(b => 
                  (b.scanAction === 'out' || b.scanAction === 'SHIP' || b.scanAction === 'delivery') && 
                  (b.status === 'delivered' || b.status === 'RENTED') && 
                  (b.customer_name || b.assigned_customer)
                );
                
                if (bottlesAtCustomers.length > 0) {
                  return (
                    <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1, mb: 1 }}>
                      <strong>⚠️ Warning:</strong> {bottlesAtCustomers.length} bottle(s) are being shipped but appear to already be at a customer. 
                      {bottlesAtCustomers.length === 1 && bottlesAtCustomers[0].customer_name && 
                        ` Bottle is currently at: ${bottlesAtCustomers[0].customer_name}`
                      }
                      {bottlesAtCustomers.length > 1 && 
                        ' Please verify if these bottles were returned before approving this shipment.'
                      }
                    </Alert>
                  );
                }
                return null;
              })()}
              
              <Box sx={{ maxHeight: '60vh', overflow: 'auto', mt: 2 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Barcode</strong></TableCell>
                      <TableCell><strong>Product Code</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Customer</strong></TableCell>
                      <TableCell><strong>Category/Group/Type</strong></TableCell>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell><strong>Scan Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bottleInfoDialog.bottles.map((bottle, index) => (
                      <TableRow key={bottle.id || index} hover>
                        <TableCell>
                          {bottle.barcode_number ? (
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              component={Link}
                              to={`/bottle/${bottle.id}`}
                              sx={{
                                color: 'primary.main',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                '&:hover': {
                                  textDecoration: 'underline'
                                }
                              }}
                            >
                              {bottle.barcode_number}
                            </Typography>
                          ) : (
                            <Typography variant="body2" fontWeight={500}>
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{bottle.product_code || '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip 
                              label={bottle.status || 'UNKNOWN'} 
                              size="small"
                              color={
                                bottle.status === 'RENTED' ? 'warning' :
                                bottle.status === 'AVAILABLE' || bottle.status === 'IN_STOCK' ? 'success' :
                                'default'
                              }
                            />
                            {/* Warning if bottle is being shipped but is already at a customer */}
                            {(bottle.scanAction === 'out' || bottle.scanAction === 'SHIP' || bottle.scanAction === 'delivery') && 
                             (bottle.status === 'delivered' || bottle.status === 'RENTED') && 
                             (bottle.customer_name || bottle.assigned_customer) && (
                              <Chip 
                                icon={<WarningIcon />}
                                label="Already at customer" 
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="body2">
                              {bottle.customer_name || (bottle.assigned_customer ? 'Assigned' : 'Available')}
                            </Typography>
                            {/* Show location if bottle is at a customer */}
                            {(bottle.customer_name || bottle.assigned_customer) && bottle.location && (
                              <Typography variant="caption" color="text.secondary">
                                📍 {bottle.location}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" display="block">
                            Cat: {bottle.category || '-'}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Grp: {bottle.group_name || bottle.gas_type || '-'}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Type: {bottle.type || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {bottle.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={bottle.scanAction || 'unknown'} 
                            size="small"
                            color={
                              bottle.scanAction === 'out' || bottle.scanAction === 'SHIP' || bottle.scanAction === 'delivery' ? 'primary' :
                              bottle.scanAction === 'in' || bottle.scanAction === 'RETURN' || bottle.scanAction === 'pickup' ? 'secondary' :
                              'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setBottleInfoDialog({ open: false, orderNumber: null, bottles: [], loading: false })}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
            Are you sure you want to {bulkActionDialog.action?.label?.toLowerCase()} {(selectedRecords || []).length} selected record(s)?
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
                const recordCount = (selectedRecords || []).length;
                
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
    if (filteredInvoices.length === 0) {
      // Check if user has actually applied filters (search, specific status, or location)
      const hasUserFilters = search || statusFilter !== 'all' || locationFilter !== 'All';
      
      return (
        <Box sx={{ mt: 4, textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {hasUserFilters && pendingInvoices.length > 0
              ? 'No records match your filters'
              : 'No imports requiring review'}
          </Typography>
          {hasUserFilters && pendingInvoices.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {pendingInvoices.length} record{pendingInvoices.length !== 1 ? 's' : ''} {pendingInvoices.length === 1 ? 'is' : 'are'} hidden by your current filters.
            </Typography>
          )}
          {hasUserFilters && (
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setLocationFilter('All');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      );
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        {filteredInvoices.map(invoice => {
          const data = parseDataField(invoice.data);
          const orderNum = getOrderNumber(data);
          const customerInfo = getCustomerInfo(data);
          const customerId = getCustomerId(data);
          const recordDate = getRecordDate(data);
          
          // Get detailed items for this invoice
          const detailedItems = getDetailedLineItems(data);
          // Check if invoice has actual invoice quantities (not just scanned)
          // For scanned-only records, don't treat qty_out/qty_in from scans as invoice data
          const isScannedOnly = invoice.is_scanned_only || (typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'));
          const hasInvoiceData = !isScannedOnly && (
            detailedItems.some(i => (i.shipped || 0) > 0 || (i.returned || 0) > 0) || 
            (data.rows && data.rows.some(r => {
              // Only count as invoice data if it's NOT from a scan (check for scan indicators)
              const hasScanIndicators = r.barcode || r.barcode_number || r.bottle_barcode;
              if (hasScanIndicators) return false; // This is from a scan, not an invoice
              return (r.qty_out || r.shipped || 0) > 0 || (r.qty_in || r.returned || 0) > 0;
            }))
          );
          
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
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
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
                        logger.log('Customer click - Name:', customerInfo, 'ID:', customerId, 'Data:', data);
                        if (customerId) {
                          navigate(`/customer/${customerId}`);
                        } else {
                          // Try to find customer by name first
                          navigate(`/customers?search=${encodeURIComponent(customerInfo)}`);
                        }
                      }}
                      >
                        {customerInfo}
                      </Typography>
                      {customerId && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: '0.7rem', 
                            mt: 0.5,
                            lineHeight: 1.2
                          }}
                        >
                          ID: {String(customerId).trim()}
                        </Typography>
                      )}
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          mt: 0.5,
                          lineHeight: 1.2
                        }}
                      >
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
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<InventoryIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        logger.log('View Bottles clicked for order:', orderNum);
                        if (orderNum) {
                          handleViewBottles(orderNum);
                        } else {
                          setError('Order number not found');
                        }
                      }}
                    >
                      View Bottles
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
                    // For scanned-only records, invoice quantities should always be 0 (no invoice imported)
                    const isScannedOnlyRecord = invoice.is_scanned_only || (typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'));
                    
                    // For scanned-only records, ALWAYS use aggregated quantities from the item (never call getScannedQty)
                    // getScannedQty might find old scans from other orders/contexts with the same product code
                    let scannedOut, scannedIn;
                    if (isScannedOnlyRecord) {
                      // For scanned-only records, use the aggregated values from the item itself
                      scannedOut = item.scannedShipped !== undefined ? item.scannedShipped : 0;
                      scannedIn = item.scannedReturned !== undefined ? item.scannedReturned : 0;
                      logger.log(`📊 Scanned-only record display: orderNum=${orderNum}, productCode=${item.productInfo.productCode}, isScannedOnlyRecord=${isScannedOnlyRecord}, item.scannedShipped=${item.scannedShipped}, item.scannedReturned=${item.scannedReturned}, scannedOut=${scannedOut}, scannedIn=${scannedIn}`);
                      logger.log(`📊 Full item object:`, JSON.stringify({
                        scannedShipped: item.scannedShipped,
                        scannedReturned: item.scannedReturned,
                        qty_out: item.qty_out,
                        qty_in: item.qty_in,
                        shipped: item.shipped,
                        returned: item.returned
                      }, null, 2));
                    } else {
                      // For imported invoices, use getScannedQty to find matching scans
                      scannedOut = getScannedQty(orderNum, item.productInfo.productCode, 'out', invoice);
                      scannedIn = getScannedQty(orderNum, item.productInfo.productCode, 'in', invoice);
                    }
                    
                    const shipped = isScannedOnlyRecord ? 0 : (item.shipped || 0);
                    const returned = isScannedOnlyRecord ? 0 : (item.returned || 0);
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
                                    color={!hasInvoiceData ? 'text.secondary' : (shippedMismatch ? 'error.main' : 'text.primary')}
                                    fontWeight={600}
                                  >
                                    Inv: {!hasInvoiceData ? '?' : shipped}
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
                                    color={!hasInvoiceData ? 'text.secondary' : (returnedMismatch ? 'error.main' : 'text.primary')}
                                    fontWeight={600}
                                  >
                                    Inv: {!hasInvoiceData ? '?' : returned}
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
    
    if (filteredInvoices.length === 0) {
      // Check if user has actually applied filters (search, specific status, or location)
      const hasUserFilters = search || statusFilter !== 'all' || locationFilter !== 'All';
      
      return (
        <Box sx={{ mt: 4, textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {hasUserFilters && pendingInvoices.length > 0
              ? 'No records match your filters'
              : 'No imports requiring review'}
          </Typography>
          {hasUserFilters && pendingInvoices.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {pendingInvoices.length} record{pendingInvoices.length !== 1 ? 's' : ''} {pendingInvoices.length === 1 ? 'is' : 'are'} hidden by your current filters.
            </Typography>
          )}
          {hasUserFilters && (
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setLocationFilter('All');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      );
    }
    
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
                      {customerId && (
                        <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                          ID: {customerId}
                        </Box>
                      )}
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
                      startIcon={<InventoryIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        logger.log('View Bottles clicked for order:', orderNum);
                        if (orderNum) {
                          handleViewBottles(orderNum);
                        } else {
                          setError('Order number not found');
                        }
                      }}
                    >
                      View Bottles
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
    if (filteredInvoices.length === 0) {
      // Check if user has actually applied filters (search, specific status, or location)
      const hasUserFilters = search || statusFilter !== 'all' || locationFilter !== 'All';
      
      return (
        <Box sx={{ mt: 4, textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {hasUserFilters && pendingInvoices.length > 0
              ? 'No records match your filters'
              : 'No imports requiring review'}
          </Typography>
          {hasUserFilters && pendingInvoices.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {pendingInvoices.length} record{pendingInvoices.length !== 1 ? 's' : ''} {pendingInvoices.length === 1 ? 'is' : 'are'} hidden by your current filters.
            </Typography>
          )}
          {hasUserFilters && (
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setLocationFilter('All');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      );
    }
    
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
          const customerId = getCustomerId(data);
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
                    {customerId && (
                      <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                        ID: {customerId}
                      </Box>
                    )}
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
      // Handle scanned-only records (they don't have database IDs)
      if (typeof row.id === 'string' && row.id.startsWith('scanned_')) {
        logger.log('🔍 Approving scanned-only record:', row.id);
        
        const orderNumber = row.id.replace('scanned_', '');
        
        // Mark all scans in scans table for this order as approved/verified
        logger.log(`🔄 Updating scans table for order ${orderNumber}, org: ${organization?.id}`);
        
        // First, check if there are any scans to update
        const { data: existingScans, error: checkError } = await supabase
          .from('scans')
          .select('id')
          .eq('order_number', orderNumber)
          .eq('organization_id', organization?.id);
        
        if (checkError) {
          logger.error('❌ Error checking scans:', checkError);
        } else {
          logger.log(`📋 Found ${existingScans?.length || 0} scans in scans table for order ${orderNumber}`);
        }
        
        if (existingScans && existingScans.length > 0) {
          // Only update if there are scans in the scans table
          const { data: updatedScans, error: scanError } = await supabase
            .from('scans')
            .update({
              status: 'approved'
            })
            .eq('order_number', orderNumber)
            .eq('organization_id', organization?.id)
            .select();
          
          if (scanError) {
            logger.error('❌ Error updating scans table:', scanError);
          } else {
            logger.log(`✅ Marked ${updatedScans?.length || 0} scans as approved for order ${orderNumber}`, updatedScans);
          }
        } else {
          logger.log(`ℹ️ No scans in scans table for order ${orderNumber} - this is a bottle_scans-only record`);
        }
        
        // For scanned-only records, assign bottles to customers FIRST
        // We need to do this BEFORE updating scans because assignBottlesToCustomer relies on those records
        logger.log(`🔄 Assigning bottles to customer for order ${orderNumber}`);
        await assignBottlesToCustomer(row);
        
        // DON'T delete bottle_scans - keep them for history/verification
        // The scans table status='approved' is used to filter them out from showing as new orders
        // This allows verified orders to display the bottles that were scanned
        logger.log(`✅ Keeping bottle_scans for order ${orderNumber} for history/verification purposes`);
        
        logger.log(`✅ Order ${orderNumber} fully approved - refreshing data`);
        setSnackbar('Scanned record approved and bottles assigned to customers');
        
        // Wait a moment to ensure the update is reflected in the database
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        logger.log('🔄 Fetching updated data after approval...');
        await fetchData();
        logger.log('✅ Data refresh complete');
        return;
      }
      
      const tableName = type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts';
      
      // Use originalId for split records, otherwise use id
      // For split records, originalId is the actual database ID
      const recordId = row.originalId || row.id;
      
      logger.log('🔍 Record details for approval:', {
        rowId: row.id,
        originalId: row.originalId,
        recordId: recordId,
        isString: typeof recordId === 'string',
        startsWithScanned: typeof recordId === 'string' && recordId.startsWith('scanned_'),
        type: type,
        tableName: tableName
      });
      
      // Validate that recordId is a valid database ID (number or valid UUID)
      if (!recordId || (typeof recordId === 'string' && recordId.startsWith('scanned_'))) {
        logger.error('❌ Invalid record ID:', recordId);
        throw new Error('Invalid record ID for database update');
      }
      
      // Build update object - use 'approved' status to match check constraint
      const updateData = {
        status: 'approved',  // Set status to 'approved' (matches database constraint)
        approved_at: new Date().toISOString()
      };
      
      logger.log('🔍 Approving record:', { type, tableName, id: recordId, originalId: row.originalId, displayId: row.id, updateData });
      
      const { data: updateResult, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', recordId)
        .select();
      
      if (error) {
        logger.error('❌ Error approving record:', error);
        logger.error('❌ Error details:', { 
          message: error.message, 
          details: error.details, 
          hint: error.hint,
          code: error.code 
        });
        throw new Error(`Failed to approve: ${error.message}${error.details ? ' - ' + error.details : ''}${error.hint ? ' (' + error.hint + ')' : ''}`);
      }
      
      logger.log('✅ Record approved successfully:', {
        updateResult: updateResult,
        rowsUpdated: updateResult?.length || 0,
        updatedRecord: updateResult?.[0]
      });
      
      if (!updateResult || updateResult.length === 0) {
        logger.error('❌ No records were updated! Check if ID exists:', recordId);
        throw new Error(`No records were updated. Record with ID ${recordId} may not exist.`);
      }
      
      // Verify the status was actually set to 'approved'
      const updatedRecord = updateResult[0];
      if (updatedRecord.status !== 'approved') {
        logger.error('❌ Status was not set to approved! Current status:', updatedRecord.status);
        throw new Error(`Status update failed. Record status is: ${updatedRecord.status}`);
      }
      
      logger.log('✅ Verified: Record status is now "approved" - it will be removed from Import Approvals');
      
      // Immediately remove the record from the UI (optimistic update)
      setPendingInvoices(prev => prev.filter(inv => {
        const shouldRemove = (inv.id === recordId || inv.originalId === recordId);
        if (shouldRemove) {
          logger.log('🗑️ Removing record from UI immediately:', inv.id);
        }
        return !shouldRemove;
      }));
      
      // Assign bottles to customers after approval
      await assignBottlesToCustomer(row);
      
      setSnackbar('Record approved successfully and bottles assigned to customers');
      
      // Wait a moment to ensure the update is reflected in the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force a full refresh of the data to ensure everything is in sync
      logger.log('🔄 Refreshing data after approval...');
      await fetchData();
      logger.log('✅ Data refresh complete - approved records should now be gone');
    } catch (error) {
      logger.error('❌ Failed to approve record:', error);
      setError('Failed to approve record: ' + error.message);
      setSnackbar('Failed to approve record: ' + error.message);
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
          rejected_at: new Date().toISOString()
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

  // Check if any bottles are currently at customers (not home/available)
  async function checkBottlesAtCustomers(record) {
    try {
      const data = parseDataField(record.data);
      const rows = data.rows || data.line_items || [];
      const orderNumber = data.order_number || data.reference_number || data.invoice_number;
      
      if (!orderNumber) {
        return { hasBottlesAtCustomers: false, bottlesAtCustomers: [] };
      }
      
      // Get all scanned barcodes for this order (shipped items only)
      const scannedBarcodes = new Set();
      
      // Get scans from scans table (shipped items only)
      const { data: scans } = await supabase
        .from('scans')
        .select('barcode_number, product_code')
        .eq('order_number', orderNumber)
        .eq('organization_id', organization?.id)
        .or('mode.eq.SHIP,mode.eq.delivery,action.eq.out');
      
      if (scans && scans.length > 0) {
        scans.forEach(scan => {
          if (scan.barcode_number) scannedBarcodes.add(scan.barcode_number);
        });
      }
      
      // Also check bottle_scans table
      const { data: bottleScans } = await supabase
        .from('bottle_scans')
        .select('bottle_barcode')
        .eq('order_number', orderNumber);
      
      if (bottleScans && bottleScans.length > 0) {
        bottleScans.forEach(scan => {
          if (scan.bottle_barcode) scannedBarcodes.add(scan.bottle_barcode);
        });
      }
      
      const bottlesAtCustomers = [];
      
      // Check each scanned barcode to see if it's at a customer
      for (const barcode of scannedBarcodes) {
        const { data: bottles } = await supabase
          .from('bottles')
          .select('id, barcode_number, assigned_customer, customer_name, status')
          .eq('barcode_number', barcode)
          .eq('organization_id', organization?.id)
          .limit(1);
        
        if (bottles && bottles.length > 0) {
          const bottle = bottles[0];
          const currentCustomerName = bottle.customer_name || bottle.assigned_customer;
          
          // Check if bottle is at a customer (not home)
          const isAtCustomer = currentCustomerName && currentCustomerName !== '' && currentCustomerName !== null;
          
          if (isAtCustomer) {
            bottlesAtCustomers.push({
              barcode: bottle.barcode_number,
              currentCustomer: currentCustomerName,
              status: bottle.status
            });
          }
        }
      }
      
      return {
        hasBottlesAtCustomers: bottlesAtCustomers.length > 0,
        bottlesAtCustomers: bottlesAtCustomers
      };
    } catch (error) {
      logger.error('Error checking bottles at customers:', error);
      // On error, assume bottles might be at customers to be safe (require manual verification)
      return { hasBottlesAtCustomers: true, bottlesAtCustomers: [] };
    }
  }

  // Auto-approve record if quantities match AND all bottles are at home
  async function autoApproveIfQuantitiesMatch(record) {
    try {
      const quantitiesMatch = await checkQuantityMatch(record);
      
      if (!quantitiesMatch) {
        logger.log(`❌ Not auto-approving record ${record.id} - quantities don't match`);
        return false;
      }
      
      // Check if any bottles are currently at customers (not home)
      const { hasBottlesAtCustomers, bottlesAtCustomers } = await checkBottlesAtCustomers(record);
      
      if (hasBottlesAtCustomers) {
        logger.log(`⚠️ Not auto-approving record ${record.id} - bottles are at customers:`, bottlesAtCustomers);
        return false; // Require manual verification when bottles are at customers
      }
      
      // Quantities match AND all bottles are at home - safe to auto-approve
      logger.log(`✅ Auto-approving record ${record.id} - quantities match and all bottles are at home`);
      
      // Update record status to approved
      const tableName = record.is_scanned_only ? 'imported_invoices' : 'imported_invoices';
      const { error } = await supabase
        .from(tableName)
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString(),
          auto_approved: true,
          auto_approval_reason: 'Quantities match between invoice and scanned data, and all bottles are at home'
        })
        .eq('id', record.id);
      
      if (error) {
        logger.error('Error auto-approving record:', error);
        return false;
      }
      
      // Assign bottles to customers
      await assignBottlesToCustomer(record);
      
      return true;
    } catch (error) {
      logger.error('Error in auto-approval:', error);
      return false;
    }
  }

  // Assign bottles to customers after approval
  async function assignBottlesToCustomer(record) {
    try {
      logger.log('🔍 assignBottlesToCustomer called with record:', {
        id: record.id,
        data: record.data,
        is_scanned_only: record.is_scanned_only
      });
      
      const data = parseDataField(record.data);
      const rows = data.rows || data.line_items || [];
      const newCustomerName = data.customer_name || rows[0]?.customer_name;
      
      logger.log('🔍 Customer name extracted:', newCustomerName, 'Rows:', rows.length);
      
      // Extract order number - handle scanned-only records specially
      let orderNumber = data.order_number || data.reference_number || data.invoice_number;
      if (!orderNumber && typeof record.id === 'string' && record.id.startsWith('scanned_')) {
        orderNumber = record.id.replace('scanned_', '');
        logger.log('🔍 Extracted order number from scanned ID:', orderNumber);
      }
      if (!orderNumber && rows.length > 0 && rows[0].order_number) {
        orderNumber = rows[0].order_number;
        logger.log('🔍 Extracted order number from first row:', orderNumber);
      }
      
      if (!orderNumber) {
        logger.error('❌ No order number found for bottle assignment');
        throw new Error('No order number found in record');
      }
      
      // Get customer ID from customer name if possible
      // IMPORTANT: Use CustomerListID (the business ID), not the internal UUID id
      let newCustomerId = null;
      if (newCustomerName) {
        logger.log('🔍 Looking up customer:', newCustomerName, 'org:', organization?.id);
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('CustomerListID, id')
          .eq('name', newCustomerName)
          .eq('organization_id', organization?.id)
          .limit(1)
          .single();
        
        if (customerError) {
          logger.error('❌ Error looking up customer:', customerError);
        } else if (customer) {
          // Use CustomerListID for assigned_customer (this is what customer detail page queries by)
          newCustomerId = customer.CustomerListID;
          logger.log('✅ Found customer CustomerListID:', newCustomerId);
        } else {
          logger.warn('⚠️ Customer not found:', newCustomerName);
        }
      } else {
        logger.warn('⚠️ No customer name found in record');
      }
      
      // Get all scanned barcodes for this order (shipped items only)
      const scannedBarcodes = new Set();
      if (orderNumber) {
        logger.log('🔍 assignBottlesToCustomer: Looking for scans for order:', orderNumber, 'org:', organization?.id);
        
        // Get scans from scans table (shipped items only)
        // Note: scans table uses 'barcode_number', not 'bottle_barcode'
        let scansQuery = supabase
          .from('scans')
          .select('barcode_number')
          .eq('order_number', orderNumber);
        
        // Add organization filter if available
        if (organization?.id) {
          scansQuery = scansQuery.eq('organization_id', organization.id);
        }
        
        const { data: scans, error: scansError } = await scansQuery;
        
        if (scansError) {
          logger.error('Error fetching scans:', scansError);
        }
        
        if (scans && scans.length > 0) {
          logger.log(`✅ Found ${scans.length} scans for order ${orderNumber}`);
          scans.forEach(scan => {
            if (scan.barcode_number) scannedBarcodes.add(scan.barcode_number);
          });
        } else {
          logger.warn(`⚠️ No scans found for order ${orderNumber}`);
        }
        
        // Also check bottle_scans table
        // Note: bottle_scans uses 'bottle_barcode', not 'barcode_number' or 'cylinder_barcode'
        let bottleScansQuery = supabase
          .from('bottle_scans')
          .select('bottle_barcode')
          .eq('order_number', orderNumber);
        
        // Add organization filter if available
        if (organization?.id) {
          bottleScansQuery = bottleScansQuery.eq('organization_id', organization.id);
        }
        
        const { data: bottleScans, error: bottleScansError } = await bottleScansQuery;
        
        if (bottleScansError) {
          logger.error('Error fetching bottle_scans:', bottleScansError);
        }
        
        if (bottleScans && bottleScans.length > 0) {
          logger.log(`✅ Found ${bottleScans.length} bottle_scans for order ${orderNumber}`);
          bottleScans.forEach(scan => {
            if (scan.bottle_barcode) scannedBarcodes.add(scan.bottle_barcode);
          });
        }
      } else {
        logger.warn('⚠️ No order number found in record data');
      }
      
      logger.log(`📦 Total unique barcodes found: ${scannedBarcodes.size}`);
      
      const assignmentWarnings = [];
      const assignmentSuccesses = [];
      const processedBarcodes = new Set();
      
      // First, process scanned barcodes (most reliable)
      for (const barcode of scannedBarcodes) {
        if (processedBarcodes.has(barcode)) continue;
        processedBarcodes.add(barcode);
        
        const { data: bottles, error: bottleError } = await supabase
          .from('bottles')
          .select('*')
          .eq('barcode_number', barcode)
          .eq('organization_id', organization?.id)
          .limit(1);
          
          if (bottleError) {
            logger.error('Error finding bottle:', bottleError);
            continue;
          }
          
          if (bottles && bottles.length > 0) {
            const bottle = bottles[0];
            const currentCustomerName = bottle.assigned_customer || bottle.customer_name;
            
            // Check if bottle is at home (no customer assigned)
            const isAtHome = !currentCustomerName || currentCustomerName === '' || currentCustomerName === null;
            
            // Check if the assigned_customer is a UUID or internal ID (incorrect assignment from previous attempt)
            // UUIDs are typically 36 characters with hyphens, or internal IDs like "8000020B-1435161928S" (20 chars)
            // CustomerListIDs that look like IDs from other systems often have this pattern
            const looksLikeInternalId = currentCustomerName && (
              (currentCustomerName.length >= 20 && currentCustomerName.includes('-') && /[A-F0-9]/.test(currentCustomerName)) ||
              (currentCustomerName.length === 36 && currentCustomerName.split('-').length === 5)
            );
            const isAssignedToUUID = looksLikeInternalId;
            
            // Check if bottle is at a different customer (but not if it's wrongly assigned to a UUID)
            const isAtDifferentCustomer = !isAtHome && !isAssignedToUUID && currentCustomerName !== newCustomerName;
            
            if (isAtHome || isAssignedToUUID) {
              // Bottle is at home OR wrongly assigned to a UUID - assign/fix normally
              if (isAssignedToUUID) {
                logger.warn(`🔧 Fixing bottle ${bottle.barcode_number} - was assigned to UUID ${currentCustomerName}, reassigning to ${newCustomerName} (${newCustomerId})`);
              }
              
              const updateData = {
                assigned_customer: newCustomerId || newCustomerName,
                customer_name: newCustomerName,
                status: 'RENTED',
                rental_start_date: new Date().toISOString().split('T')[0]
              };
              
              const { error: updateError } = await supabase
                .from('bottles')
                .update(updateData)
                .eq('id', bottle.id)
                .eq('organization_id', organization?.id);
              
              if (updateError) {
                logger.error('Error updating bottle:', updateError);
                assignmentWarnings.push(`Failed to assign bottle ${bottle.barcode_number}: ${updateError.message}`);
              } else {
                logger.log(`✅ Assigned bottle ${bottle.barcode_number} to customer ${newCustomerName} (${newCustomerId})`);
                assignmentSuccesses.push(`Bottle ${bottle.barcode_number} assigned to ${newCustomerName}`);
                
                // Create rental record if it doesn't exist
                await createRentalRecord(bottle, newCustomerName, null);
              }
            } else if (isAtDifferentCustomer) {
              // Bottle is at a different customer - but we're verifying an order, so reassign it
              // This handles cases where the bottle was incorrectly assigned or needs to be transferred
              logger.warn(`⚠️ Bottle ${bottle.barcode_number} is at ${currentCustomerName}, reassigning to ${newCustomerName} per order verification`);
              
              const updateData = {
                assigned_customer: newCustomerId || newCustomerName,
                customer_name: newCustomerName,
                status: 'RENTED',
                rental_start_date: new Date().toISOString().split('T')[0]
              };
              
              const { error: updateError } = await supabase
                .from('bottles')
                .update(updateData)
                .eq('id', bottle.id)
                .eq('organization_id', organization?.id);
              
              if (updateError) {
                logger.error('Error reassigning bottle:', updateError);
                assignmentWarnings.push(`Failed to reassign bottle ${bottle.barcode_number} from ${currentCustomerName} to ${newCustomerName}: ${updateError.message}`);
              } else {
                logger.log(`✅ Reassigned bottle ${bottle.barcode_number} from ${currentCustomerName} to ${newCustomerName} (${newCustomerId})`);
                assignmentSuccesses.push(`Bottle ${bottle.barcode_number} reassigned from ${currentCustomerName} to ${newCustomerName}`);
                
                // Create rental record if it doesn't exist
                await createRentalRecord(bottle, newCustomerName, null);
              }
            } else {
              // Already assigned to this customer - just log
              logger.log(`ℹ️ Bottle ${bottle.barcode_number} is already assigned to ${newCustomerName}`);
            }
          } else {
            logger.warn(`⚠️ Bottle not found for scanned barcode: ${barcode}`);
            assignmentWarnings.push(`Bottle not found: ${barcode}`);
          }
      }
      
      // Fallback: Process import rows if we didn't get barcodes from scans (for older imports)
      for (const row of rows) {
        // For shipped items (qty_out > 0), assign bottles to customer
        if (row.qty_out > 0 && (row.product_code || row.bottle_barcode || row.barcode)) {
          const barcode = row.bottle_barcode || row.barcode;
          if (barcode && processedBarcodes.has(barcode)) continue; // Already processed
          
          // Find the bottle by barcode or product code
          const bottleQuery = barcode
            ? { barcode_number: barcode }
            : { product_code: row.product_code };
          
          const { data: bottles, error: bottleError } = await supabase
            .from('bottles')
            .select('*')
            .match(bottleQuery)
            .eq('organization_id', organization?.id)
            .limit(1);
          
          if (bottleError) {
            logger.error('Error finding bottle:', bottleError);
            continue;
          }
          
          if (bottles && bottles.length > 0) {
            const bottle = bottles[0];
            if (barcode) processedBarcodes.add(barcode);
            
            const currentCustomerName = bottle.assigned_customer || bottle.customer_name;
            
            // Check if bottle is at home (no customer assigned)
            const isAtHome = !currentCustomerName || currentCustomerName === '' || currentCustomerName === null;
            
            // Check if the assigned_customer is a UUID or internal ID (incorrect assignment from previous attempt)
            // UUIDs are typically 36 characters with hyphens, or internal IDs like "8000020B-1435161928S" (20 chars)
            // CustomerListIDs that look like IDs from other systems often have this pattern
            const looksLikeInternalId = currentCustomerName && (
              (currentCustomerName.length >= 20 && currentCustomerName.includes('-') && /[A-F0-9]/.test(currentCustomerName)) ||
              (currentCustomerName.length === 36 && currentCustomerName.split('-').length === 5)
            );
            const isAssignedToUUID = looksLikeInternalId;
            
            // Check if bottle is at a different customer (but not if it's wrongly assigned to a UUID)
            const isAtDifferentCustomer = !isAtHome && !isAssignedToUUID && currentCustomerName !== newCustomerName;
            
            if (isAtHome || isAssignedToUUID) {
              // Bottle is at home OR wrongly assigned to a UUID - assign/fix normally
              if (isAssignedToUUID) {
                logger.warn(`🔧 Fixing bottle ${bottle.barcode_number} - was assigned to UUID ${currentCustomerName}, reassigning to ${newCustomerName} (${newCustomerId})`);
              }
              
              const updateData = {
                assigned_customer: newCustomerId || newCustomerName,
                customer_name: newCustomerName,
                status: 'RENTED',
                rental_start_date: new Date().toISOString().split('T')[0]
              };
              
              const { error: updateError } = await supabase
                .from('bottles')
                .update(updateData)
                .eq('id', bottle.id)
                .eq('organization_id', organization?.id);
              
              if (updateError) {
                logger.error('Error updating bottle:', updateError);
                assignmentWarnings.push(`Failed to assign bottle ${bottle.barcode_number}: ${updateError.message}`);
              } else {
                logger.log(`✅ Assigned bottle ${bottle.barcode_number} to customer ${newCustomerName} (${newCustomerId})`);
                assignmentSuccesses.push(`Bottle ${bottle.barcode_number} assigned to ${newCustomerName}`);
                
                // Create rental record if it doesn't exist
                await createRentalRecord(bottle, newCustomerName, row);
              }
            } else if (isAtDifferentCustomer) {
              // Bottle is at a different customer - but we're verifying an order, so reassign it
              // This handles cases where the bottle was incorrectly assigned or needs to be transferred
              logger.warn(`⚠️ Bottle ${bottle.barcode_number} is at ${currentCustomerName}, reassigning to ${newCustomerName} per order verification`);
              
              const updateData = {
                assigned_customer: newCustomerId || newCustomerName,
                customer_name: newCustomerName,
                status: 'RENTED',
                rental_start_date: new Date().toISOString().split('T')[0]
              };
              
              const { error: updateError } = await supabase
                .from('bottles')
                .update(updateData)
                .eq('id', bottle.id)
                .eq('organization_id', organization?.id);
              
              if (updateError) {
                logger.error('Error reassigning bottle:', updateError);
                assignmentWarnings.push(`Failed to reassign bottle ${bottle.barcode_number} from ${currentCustomerName} to ${newCustomerName}: ${updateError.message}`);
              } else {
                logger.log(`✅ Reassigned bottle ${bottle.barcode_number} from ${currentCustomerName} to ${newCustomerName} (${newCustomerId})`);
                assignmentSuccesses.push(`Bottle ${bottle.barcode_number} reassigned from ${currentCustomerName} to ${newCustomerName}`);
                
                // Create rental record if it doesn't exist
                await createRentalRecord(bottle, newCustomerName, row);
              }
            } else {
              // Already assigned to this customer - just log
              logger.log(`ℹ️ Bottle ${bottle.barcode_number} is already assigned to ${newCustomerName}`);
            }
          } else {
            logger.warn(`⚠️ Bottle not found for barcode: ${row.bottle_barcode || row.barcode || row.product_code}`);
            assignmentWarnings.push(`Bottle not found: ${row.bottle_barcode || row.barcode || row.product_code}`);
          }
        }
      }
      
      // Show summary messages
      if (assignmentSuccesses.length > 0) {
        logger.log(`✅ Successfully assigned ${assignmentSuccesses.length} bottle(s)`);
      }
      
      if (assignmentWarnings.length > 0) {
        const warningMessage = `⚠️ ${assignmentWarnings.length} warning(s):\n${assignmentWarnings.join('\n')}`;
        logger.warn(warningMessage);
        // Optionally show warnings to user via snackbar
        if (assignmentWarnings.length > 0 && assignmentSuccesses.length === 0) {
          setError(warningMessage);
        } else if (assignmentWarnings.length > 0) {
          setSnackbar(`Assigned ${assignmentSuccesses.length} bottle(s). ${assignmentWarnings.length} warning(s) - see logs.`);
        }
      }
    } catch (error) {
      logger.error('Error assigning bottles to customer:', error);
      setError('Failed to assign bottles: ' + error.message);
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
    if (!selectedRecords || selectedRecords.length === 0) return;
    
    try {
      // Determine which table to use based on the active tab
      const tableName = activeTab === 0 ? 'imported_invoices' : 'imported_sales_receipts';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', selectedRecords);
      
      if (error) throw error;
      
      setSnackbar(`${(selectedRecords || []).length} records deleted successfully`);
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
    if (!selectedRecords || selectedRecords.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${(selectedRecords || []).length} selected records?`)) {
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
        rowCount: orderRows.length,
        importRecordStatus: importRecord.status,
        importRecordId: importRecord.id
      });
      
      individualRecords.push({
        ...importRecord,
        // Keep original ID for database operations, use displayId for React keys
        originalId: importRecord.id, // Original database ID
        id: importRecord.id, // Keep original ID for database operations
        displayId: `${importRecord.id}_${index}`, // Use for React keys only
        splitIndex: index, // Track which split this is
        // Explicitly set is_scanned_only to false for imported invoices/receipts
        is_scanned_only: false,
        // Preserve status explicitly (important for filtering approved records)
        status: importRecord.status || 'pending',
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
    
    logger.log('🔍 getScannedQty CALLED:', { 
      orderNum, 
      productCode, 
      type, 
      totalScans: allScannedRows.length,
      scansForThisOrder: allScannedRows.filter(r => String(r.order_number || '').trim() === String(orderNum || '').trim()).length,
      sampleScans: allScannedRows.slice(0, 5).map(s => ({
        order_number: s.order_number,
        bottle_barcode: s.bottle_barcode || s.barcode_number,
        product_code: s.product_code,
        mode: s.mode,
        action: s.action
      }))
    });
    
    // CRITICAL: If productCode looks like a barcode (all numbers), resolve it to actual product code
    let resolvedProductCode = productCode;
    if (/^\d+$/.test(productCode)) {
      // This might be a barcode, look it up
      const bottleInfo = productCodeToAssetInfo[productCode];
      if (bottleInfo && bottleInfo.product_code) {
        resolvedProductCode = bottleInfo.product_code;
        logger.log('📦 Resolved barcode to product code:', productCode, '->', resolvedProductCode);
      }
    }
    
    // Get the actual barcode from the invoice record if available (for scanned-only records)
    const invoiceBarcodes = new Set();
    if (invoiceRecord?.data?.rows) {
      invoiceRecord.data.rows.forEach(row => {
        const barcode = row.barcode || row.barcode_number || row.bottle_barcode;
        if (barcode) invoiceBarcodes.add(String(barcode).trim());
      });
    }
    
    // Normalize order numbers for comparison (remove leading zeros, trim, etc.)
    const normalizeOrderNum = (num) => {
      if (!num) return '';
      return String(num).trim().replace(/^0+/, ''); // Remove leading zeros and trim
    };
    
    const normalizedSearchOrderNum = normalizeOrderNum(orderNum);
    
    logger.log('🔍 Searching for scans:', {
      originalOrderNum: orderNum,
      normalizedOrderNum: normalizedSearchOrderNum,
      totalScans: allScannedRows.length,
      uniqueOrderNums: [...new Set(allScannedRows.map(r => r.order_number).filter(Boolean))].slice(0, 10)
    });
    
    const matches = allScannedRows.filter(row => {
      // Normalize order numbers for comparison
      const rowOrderNum = normalizeOrderNum(row.order_number);
      const rowInvoiceNum = normalizeOrderNum(row.invoice_number);
      
      // Try exact match first, then normalized match
      const orderMatch = 
        String(row.order_number || '').trim() === String(orderNum || '').trim() ||
        String(row.invoice_number || '').trim() === String(orderNum || '').trim() ||
        rowOrderNum === normalizedSearchOrderNum ||
        rowInvoiceNum === normalizedSearchOrderNum;
      
      if (!orderMatch) {
        // Log first few non-matching scans for debugging
        if (normalizedSearchOrderNum === '66668' && row.order_number) {
          logger.log('❌ Order 66668 mismatch:', {
            rowOrderNum: row.order_number,
            normalizedRowOrderNum: rowOrderNum,
            searchOrderNum: orderNum,
            normalizedSearchOrderNum,
            bottle_barcode: row.bottle_barcode || row.barcode_number,
            product_code: row.product_code
          });
        }
        return false;
      }
      
      logger.log('✅ Order matched:', { 
        rowOrderNum: row.order_number, 
        normalizedRowOrderNum: rowOrderNum,
        searchOrderNum: orderNum,
        normalizedSearchOrderNum,
        bottle_barcode: row.bottle_barcode, 
        product_code: row.product_code, 
        mode: row.mode,
        action: row.action
      });
      
      // Get the barcode from the scan
      const scannedBarcode = String(row.bottle_barcode || row.barcode_number || '').trim();
      
      // For scanned-only records, ONLY match scans with the exact barcode from the invoice
      // This prevents matching scans from other bottles with the same product code
      if (invoiceBarcodes.size > 0 && scannedBarcode) {
        if (!invoiceBarcodes.has(scannedBarcode)) {
          logger.log(`🔍 Barcode mismatch: scan barcode="${scannedBarcode}" not in invoice barcodes:`, Array.from(invoiceBarcodes));
          return false;
        }
      }
      
      // Match by direct product code match OR by looking up the barcode in productCodeToAssetInfo
      let productMatch = row.product_code === resolvedProductCode || 
                        row.bottle_barcode === resolvedProductCode || 
                        row.barcode_number === resolvedProductCode;
      
      // If not matched yet, try to find the bottle's product code from the barcode
      if (!productMatch && scannedBarcode) {
        const bottleInfo = productCodeToAssetInfo[scannedBarcode];
        if (bottleInfo && bottleInfo.product_code === resolvedProductCode) {
          productMatch = true;
        }
      }
      
      if (!productMatch) {
        return false;
      }
      
      // Updated to match the mobile app's mode values - STRICT matching
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
          barcode: scannedBarcode,
          product: row.product_code || row.bottle_barcode || row.barcode_number, 
          mode: row.mode, 
          action: row.action,
          scan_type: row.scan_type,
          lookingFor: productCode,
          requestedType: type
        });
      } else if (orderMatch && productMatch && !typeMatch) {
        logger.log('⚠️ Scan matched order/product but not type:', {
          order: row.order_number,
          barcode: scannedBarcode,
          product: row.product_code || row.bottle_barcode || row.barcode_number,
          mode: row.mode,
          action: row.action,
          scan_type: row.scan_type,
          lookingFor: productCode,
          requestedType: type
        });
      }
      
      return orderMatch && productMatch && typeMatch;
    });
    
    // Deduplicate by barcode - only count each unique barcode once per order/product code
    const uniqueMatches = [];
    const seenBarcodes = new Set();
    
    matches.forEach(match => {
      const barcode = match.bottle_barcode || match.barcode_number;
      
      // If we have a barcode, only count it once (even if scanned multiple times)
      if (barcode) {
        if (seenBarcodes.has(barcode)) {
          logger.log(`⚠️ Skipping duplicate scan for barcode ${barcode} in getScannedQty`);
          return; // Skip this duplicate
        }
        seenBarcodes.add(barcode);
      } else {
        // If no barcode, use timestamp as fallback deduplication
        const timestamp = new Date(match.created_at || match.timestamp).getTime();
        const roundedTime = Math.floor(timestamp / 1000);
        const key = `no_barcode_${roundedTime}`;
        if (seenBarcodes.has(key)) {
          return; // Skip duplicate timestamp
        }
        seenBarcodes.add(key);
      }
      
      uniqueMatches.push(match);
    });
    
    logger.log(`📊 Found ${uniqueMatches.length} unique scans (${matches.length} total) for ${orderNum}/${productCode}/${type}`);
    logger.log(`📊 Unique barcodes: ${Array.from(seenBarcodes).join(', ')}`);
    return uniqueMatches.length;
  }
} 