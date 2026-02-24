import logger from '../utils/logger';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { resetDaysAtLocation } from '../utils/daysAtLocationUpdater';
import { 
  Box, Paper, Typography, Button, Alert, CircularProgress, Divider, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, 
  MenuItem, Select, FormControl, InputLabel, Chip, Checkbox, Autocomplete, Tooltip, Fab, 
  Zoom, Card, CardContent, CardHeader, Grid, Tabs, Tab, Badge, LinearProgress,
  Stepper, Step, StepLabel, StepContent, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon, Switch, FormControlLabel, Stack,
  ButtonGroup, SpeedDial, SpeedDialAction, SpeedDialIcon,
  Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SearchInputWithIcon } from '../components/ui/search-input-with-icon';
import PortalSnackbar from '../components/PortalSnackbar';
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
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { bottleAssignmentService } from '../services/bottleAssignmentService';

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
    { id: 'bulk_investigate', label: 'Bulk Mark for Investigation', icon: <BugReportIcon />, color: 'warning' },
    { id: 'bulk_export', label: 'Export Selected', icon: <ExportIcon />, color: 'primary' },
    { id: 'bulk_reject', label: 'Bulk Reject', icon: <CloseIcon />, color: 'error' },
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

// Edit Bottle Dialog Component
function EditBottleDialog({ open, bottle, barcode, isNew, organizationId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    barcode_number: bottle?.barcode_number || barcode || '',
    product_code: bottle?.product_code || '',
    description: bottle?.description || '',
    gas_type: bottle?.gas_type || '',
    status: bottle?.status || 'available',
    location: bottle?.location || '',
    serial_number: bottle?.serial_number || ''
  });

  useEffect(() => {
    if (bottle) {
      setFormData({
        barcode_number: bottle.barcode_number || '',
        product_code: bottle.product_code || '',
        description: bottle.description || '',
        gas_type: bottle.gas_type || '',
        status: bottle.status || 'available',
        location: bottle.location || '',
        serial_number: bottle.serial_number || ''
      });
    } else if (barcode) {
      setFormData(prev => ({ ...prev, barcode_number: barcode }));
    }
  }, [bottle, barcode]);

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      barcode_number: isNew ? barcode : formData.barcode_number
    };
    // Remove empty strings, convert to null
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key] === '') {
        dataToSave[key] = null;
      }
    });
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isNew ? 'Create Bottle (Unclassified)' : 'Edit Bottle'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Barcode"
            value={formData.barcode_number}
            onChange={(e) => setFormData({...formData, barcode_number: e.target.value})}
            fullWidth
            disabled={isNew} // Don't allow editing barcode for new bottles
            required
          />
          <TextField
            label="Product Code"
            value={formData.product_code}
            onChange={(e) => setFormData({...formData, product_code: e.target.value})}
            fullWidth
            placeholder="Enter product code"
            helperText={isNew ? "Required to classify this bottle" : ""}
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Gas Type"
            value={formData.gas_type}
            onChange={(e) => setFormData({...formData, gas_type: e.target.value})}
            fullWidth
          />
          <TextField
            label="Serial Number"
            value={formData.serial_number}
            onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Location</InputLabel>
            <Select
              value={formData.location || ''}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              label="Location"
            >
              <MenuItem value="SASKATOON">Saskatoon (Saskatchewan)</MenuItem>
              <MenuItem value="REGINA">Regina (Saskatchewan)</MenuItem>
              <MenuItem value="CHILLIWACK">Chilliwack (British Columbia)</MenuItem>
              <MenuItem value="PRINCE_GEORGE">Prince George (British Columbia)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              label="Status"
            >
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="rented">Rented</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}

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
      logger.debug('JSON parse error for data:', data);
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
      
      logger.debug(`Merged order ${invoiceOrderNum}: invoice + ${matchingScanned.length} scanned records`);
    } else {
      // No matching scans, keep as regular import
      merged.push(invoice);
    }
  }
  
  // Add remaining scanned records that don't have matching imports
  const remainingScanned = scannedRecords.filter(scan => !processedScannedIds.has(scan.id));
  merged.push(...remainingScanned);
  
  logger.debug(`Merge result: ${merged.length} total records (${importedInvoices.length} imports, ${remainingScanned.length} scanned-only)`);
  
  return merged;
}

// Enhanced status determination with professional workflow logic
// Helper function to check if asset is on customer balance and create exception if not
const validateReturnBalance = async (bottle, orderNumber, organization) => {
  const currentCustomerId = bottle.assigned_customer || bottle.customer_id;
  const currentCustomerName = bottle.assigned_customer || bottle.customer_name;

  if (!currentCustomerId) {
    // No customer assigned, so it's not a balance issue
    return { isOnBalance: true, exceptionCreated: false };
  }

  // Check for active rental record
  const { data: activeRental, error: rentalCheckError } = await supabase
    .from('rentals')
    .select('id, customer_id, bottle_id')
    .eq('bottle_id', bottle.id)
    .eq('customer_id', currentCustomerId)
    .is('rental_end_date', null)
    .maybeSingle();
  
  if (rentalCheckError) {
    logger.warn('⚠️ Error checking rental record:', rentalCheckError);
  }

  let isOnBalance = false;
  if (activeRental) {
    isOnBalance = true;
  } else {
    // Also check if bottle is assigned to this customer (even without rental record)
    if (bottle.assigned_customer === currentCustomerId || bottle.customer_id === currentCustomerId) {
      isOnBalance = true;
    }
  }

  // If asset is NOT on balance, create exception record
  if (!isOnBalance) {
    logger.warn(`⚠️ Asset ${bottle.barcode_number || bottle.barcode} returned but was NOT on customer balance. Creating exception.`);
    
    const { error: exceptionError } = await supabase
      .from('asset_exceptions')
      .insert({
        organization_id: organization.id,
        asset_id: bottle.id,
        asset_barcode: bottle.barcode_number || bottle.barcode,
        customer_id: currentCustomerId,
        customer_name: currentCustomerName,
        exception_type: 'Returned Asset Was Not on Balance',
        resolution_status: 'RESOLVED',
        resolution_note: 'No credit was given for this return',
        transaction_type: 'RETURN',
        order_number: orderNumber,
        metadata: {
          bottle_status: bottle.status,
          assigned_customer: bottle.assigned_customer,
          customer_id: bottle.customer_id,
          checked_at: new Date().toISOString()
        }
      });
    
    if (exceptionError) {
      logger.error('❌ Error creating exception record:', exceptionError);
      return { isOnBalance: false, exceptionCreated: false, error: exceptionError };
    } else {
      logger.debug('Exception record created for asset not on balance');
      return { isOnBalance: false, exceptionCreated: true };
    }
  }

  return { isOnBalance: true, exceptionCreated: false };
};

/**
 * Revert bottle status when a return scan is rejected/cancelled.
 * Bottles were marked as empty when the return was scanned; we restore them to rented.
 * Batched: 2 queries for scan data, 1 for all bottles, then batch updates.
 */
const revertBottlesForRejectedReturn = async (orderNumber, organizationId) => {
  if (!orderNumber || !organizationId) return;
  try {
    const barcodesToRevert = new Set();
    const [bottleScansRes, scansRes] = await Promise.all([
      supabase.from('bottle_scans').select('bottle_barcode, mode').eq('order_number', orderNumber),
      supabase.from('scans').select('barcode_number, bottle_barcode, action, "mode"').eq('order_number', orderNumber)
    ]);
    (bottleScansRes.data || []).forEach(s => {
      const modeUpper = (s.mode || '').toUpperCase();
      if (s.bottle_barcode && (modeUpper === 'RETURN' || modeUpper === 'IN')) barcodesToRevert.add(s.bottle_barcode);
    });
    (scansRes.data || []).forEach(s => {
      const barcode = s.barcode_number || s.bottle_barcode;
      if (barcode && (s.action === 'in' || (s.mode || '').toUpperCase() === 'RETURN')) barcodesToRevert.add(barcode);
    });
    const barcodes = [...barcodesToRevert];
    if (barcodes.length === 0) return;
    const { data: bottles } = await supabase
      .from('bottles')
      .select('barcode_number, assigned_customer')
      .in('barcode_number', barcodes)
      .eq('organization_id', organizationId);
    const byBarcode = new Map((bottles || []).map(b => [b.barcode_number, b]));
    await Promise.all(barcodes.map(async (barcode) => {
      const bottle = byBarcode.get(barcode);
      const newStatus = bottle?.assigned_customer ? 'rented' : 'available';
      const { error } = await supabase
        .from('bottles')
        .update({ status: newStatus })
        .eq('barcode_number', barcode)
        .eq('organization_id', organizationId);
      if (error) logger.warn('Could not revert bottle status for rejected return:', barcode, error);
    }));
  } catch (err) {
    logger.error('Error reverting bottles for rejected return:', err);
  }
};

function determineVerificationStatus(record) {
  const data = parseDataField(record.data);
  
  // Scanned-only: orders scanned but not yet imported as invoice. Check first so filter works.
  // ID format scanned_<orderNumber> or explicit is_scanned_only flag (data can still have qty_out/qty_in from scans)
  const isScannedOnlyRecord = record.is_scanned_only === true ||
    (typeof record.id === 'string' && record.id.startsWith('scanned_'));
  if (isScannedOnlyRecord) {
    return 'SCANNED_ONLY';
  }
  
  // Check if record has invoice data (shipped/returned quantities from invoice)
  const rows = data.rows || data.line_items || [];
  const hasInvoiceData = rows.some(row => {
    const shipped = parseInt(row.qty_out || row.QtyOut || row.shipped || row.Shipped || 0, 10);
    const returned = parseInt(row.qty_in || row.QtyIn || row.returned || row.Returned || 0, 10);
    return shipped > 0 || returned > 0;
  });
  
  // Also check if this is from imported_invoices/imported_sales_receipts (has database ID)
  const isFromImport = record.originalId || 
                      typeof record.id === 'number' || 
                      (typeof record.id === 'string' && !record.id.startsWith('scanned_'));
  
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
  
  // Per-order verification: this order may have been verified in a multi-order import
  const orderNumber = data.order_number || data.reference_number;
  const verifiedOrders = data.verified_order_numbers || [];
  const normOrder = (n) => (n != null && n !== '') ? String(n).trim().replace(/^0+/, '') || String(n).trim() : '';
  if (orderNumber && Array.isArray(verifiedOrders) && verifiedOrders.some(n => normOrder(n) === normOrder(orderNumber))) return 'VERIFIED';
  
  // Check verification state - check status field
  if (record.status === 'approved' || record.status === 'verified') return 'VERIFIED';
  if (record.processing) return 'IN_PROGRESS';
  
  return 'PENDING';
}

export default function ImportApprovals() {
  const { user, organization } = useAuth();
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [ordersWithBottlesAtCustomers, setOrdersWithBottlesAtCustomers] = useState(new Set());
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditDialog, setAuditDialog] = useState({ open: false, logs: [], title: '' });
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced state management  
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'timeline'
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
  const [editBottleDialog, setEditBottleDialog] = useState({
    open: false,
    bottle: null,
    barcode: null, // For unclassified bottles that don't exist yet
    isNew: false
  });
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  
  // Existing state
  const [customerNameToId, setCustomerNameToId] = useState({});
  const [customerIdToName, setCustomerIdToName] = useState({});
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
  const [restoreRejectedDialog, setRestoreRejectedDialog] = useState({ open: false, orderNumber: '', loading: false });
  const [reassignOrderDialog, setReassignOrderDialog] = useState({ open: false, oldOrder: '', newOrder: '', customerPattern: '', loading: false });

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
  const prevPathnameRef = useRef(location.pathname);

  // Define handleSelectAll early to avoid initialization errors
  const handleSelectAll = () => {
    const safeFilteredInvoices = filteredInvoices || [];
    const selectableInvoices = safeFilteredInvoices.filter(invoice => 
      !(typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'))
    );
    
    // Check how many of the currently visible selectable invoices are selected
    const visibleSelectedCount = visibleSelectedRecords.filter(id =>
      selectableInvoices.some(inv => inv.id === id)
    ).length;
    
    // Get IDs that are selected but not in the current visible list (to preserve them)
    const otherSelectedIds = visibleSelectedRecords.filter(id =>
      !selectableInvoices.some(inv => inv.id === id)
    );
    
    setSelectedRecords(
      visibleSelectedCount === selectableInvoices.length 
        ? otherSelectedIds // Deselect all visible ones, keep others
        : [...otherSelectedIds, ...selectableInvoices.map(invoice => invoice.id)] // Select all visible ones
    );
  };

  const handleSelectRecord = (id) => {
    setSelectedRecords(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Initialize component with optimized loading
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Load critical data first (allScannedRows must be ready before cards render so Trk counts are correct)
        await Promise.all([
          fetchData(),
          fetchCustomers(),
          fetchScannedCounts(),
          fetchCylinders(),  // Load product code to group mapping
          fetchBottles(),    // Load product code to asset info mapping
          fetchAllScanned()  // Full scan set for Trk counts & augmenting product lines
        ]);
        
        // Load secondary data in background
        Promise.all([
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
  }, [organization?.id, refetchTrigger]); // Re-fetch when organization or refetchTrigger changes

  // When returning from detail (e.g. after unverify or sales order change), clear list and refetch
  useEffect(() => {
    if (location.pathname === '/import-approvals' && location.state?.refetch) {
      setPendingInvoices([]);
      setLoading(true);
      setRefetchTrigger(prev => prev + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state]);

  // Refetch when user navigates TO this page (e.g. from Verified Orders after unverify) so unverified order appears
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;
    if (location.pathname === '/import-approvals' && prev !== undefined && prev !== '/import-approvals') {
      setPendingInvoices([]);
      setLoading(true);
      setRefetchTrigger(prevTrigger => prevTrigger + 1);
    }
  }, [location.pathname]);

  useEffect(() => {
    document.title = 'Order Verification';
    return () => { document.title = ''; };
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

  // Debug: Log when ordersWithBottlesAtCustomers changes
  useEffect(() => {
    if (ordersWithBottlesAtCustomers.size > 0) {
      logger.debug('Orders with bottles at customers:', Array.from(ordersWithBottlesAtCustomers));
    }
  }, [ordersWithBottlesAtCustomers]);

  // Enhanced data fetching with statistics
  const fetchData = async () => {
    try {
      // fetchVerificationStats fetches imports, receipts, scans, and sets pendingInvoices
      await fetchVerificationStats();
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
          logger.debug(`Filtering out record ${record.id} (${orderNum}): Search filter`);
          return false;
        }
      }
      
      // Status filter - handle different status filter options
      if (statusFilter === 'all') {
        // When showing "all", hide verified/approved records (they've been processed)
        // Also hide rejected records
        if (record.status === 'rejected') {
          logger.debug(`Filtering out record ${record.id} (${orderNum}): Status is rejected`);
          return false;
        }
        
        // CRITICAL: Filter out approved/verified/rejected records - they should NOT appear in Order Verification
        const recordStatusLower = (record.status || '').toLowerCase();
        if (recordStatusLower === 'approved' || recordStatusLower === 'verified' || recordStatusLower === 'rejected') {
          logger.debug(`Removing record ${record.id} (${orderNum}): Status is verified`);
          return false;
        }
        
        if (recordStatus === 'VERIFIED') {
          logger.debug(`Removing record ${record.id} (${orderNum}): Verification status is VERIFIED`);
          return false;
        }
      } else {
        // Specific status filter selected - show only matching records
        if (record.status === 'rejected' && statusFilter !== 'rejected') {
          filterReasons.push('Status filter: rejected');
          logger.debug(`Filtering out record ${record.id} (${orderNum}): Status is rejected`);
          return false;
        }
        
        if (statusFilter === 'pending' && recordStatus !== 'PENDING') {
          filterReasons.push(`Status filter: ${recordStatus} !== PENDING`);
          logger.debug(`Filtering out record ${record.id} (${orderNum}): Status ${recordStatus} !== PENDING`);
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
          logger.debug(`Filtering out record ${record.id} (${orderNum}): Location filter`);
          return false;
        }
      }
      
      // Log why record passed all filters
      if (filterReasons.length === 0) {
        logger.debug(`Record ${record.id} (${orderNum}) passed filters`);
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
        logger.debug(`Removing duplicate record: Order ${orderNum}, Customer ${customerName}`);
      }
    });
    
    return deduplicated;
  };

  // Get filtered records
  const filteredInvoices = deduplicateRecords(filterRecords(pendingInvoices));
  const filteredReceipts = deduplicateRecords(filterRecords(pendingReceipts));

  // Sort by scan time (created_at = when record was created/scanned), newest first
  const getSortableScanTime = (record) => {
    const t = record?.created_at;
    return t ? new Date(t).getTime() : 0;
  };
  const sortedFilteredInvoices = useMemo(() => {
    return [...(filteredInvoices || [])].sort((a, b) => getSortableScanTime(b) - getSortableScanTime(a));
  }, [filteredInvoices]);
  const sortedFilteredReceipts = useMemo(() => {
    return [...(filteredReceipts || [])].sort((a, b) => getSortableScanTime(b) - getSortableScanTime(a));
  }, [filteredReceipts]);
  
  // Create a Set of visible IDs for efficient lookup (memoized to prevent recreation)
  const visibleRecordIds = useMemo(() => {
    const ids = new Set();
    filteredInvoices.forEach(inv => ids.add(inv.id));
    filteredReceipts.forEach(rec => ids.add(rec.id));
    return ids;
  }, [
    // Use sorted string of IDs as dependency to detect actual changes
    filteredInvoices.map(inv => String(inv.id)).sort().join(','),
    filteredReceipts.map(rec => String(rec.id)).sort().join(',')
  ]);
  
  // Filter selectedRecords to only include IDs that are actually visible
  const visibleSelectedRecords = useMemo(() => {
    return (selectedRecords || []).filter(id => visibleRecordIds.has(id));
  }, [selectedRecords, visibleRecordIds]);
  
  // Clean up selectedRecords if it contains IDs that are no longer visible
  const prevVisibleIdsRef = useRef(new Set());
  useEffect(() => {
    // Check if visible IDs actually changed
    const idsChanged = prevVisibleIdsRef.current.size !== visibleRecordIds.size ||
      [...prevVisibleIdsRef.current].some(id => !visibleRecordIds.has(id)) ||
      [...visibleRecordIds].some(id => !prevVisibleIdsRef.current.has(id));
    
    if (idsChanged) {
      prevVisibleIdsRef.current = new Set(visibleRecordIds);
      
      // Filter selectedRecords to only include visible IDs
      const cleanedSelected = (selectedRecords || []).filter(id => visibleRecordIds.has(id));
      
      // Only update if there's a difference
      const currentIds = new Set(selectedRecords || []);
      const cleanedIds = new Set(cleanedSelected);
      const hasDifference = currentIds.size !== cleanedIds.size || 
        [...currentIds].some(id => !cleanedIds.has(id));
      
      if (hasDifference) {
        setSelectedRecords(cleanedSelected);
      }
    }
  }, [visibleRecordIds, selectedRecords]);
  
  logger.debug('Filtering state:', {
    pendingInvoicesCount: pendingInvoices.length,
    filteredInvoicesCount: filteredInvoices.length,
    search,
    statusFilter,
    locationFilter
  });

  // Get unique locations from all records
  const getUniqueLocations = () => {
    const locations = new Set(['All']);
    const safePendingInvoices = pendingInvoices || [];
    const safePendingReceipts = pendingReceipts || [];
    const safeAllLocations = allLocations || [];
    
    logger.debug('Debug locations - pendingInvoices:', (safePendingInvoices || []).length, 'pendingReceipts:', (safePendingReceipts || []).length);
    
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
      
      if (index < 3) logger.debug(`Record ${index} location:`, location);
    });
    
    logger.debug('Final locations:', Array.from(locations));
    return Array.from(locations);
  };

  // Enhanced data fetching functions
  async function fetchPendingInvoices() {
    try {
      logger.debug('Processing imported invoices for auto-approval');
      if (!organization?.id) {
        logger.debug('No organization ID, skipping invoice processing');
        return;
      }
      
      const { data, error } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .neq('status', 'rejected') // EXCLUDE REJECTED RECORDS
        .neq('status', 'approved'); // EXCLUDE APPROVED RECORDS
      
      if (error) throw error;
      
      logger.debug('Found invoices for organization:', data?.length || 0);
      // Split grouped imports into individual records (professional workflow)
      const individualRecords = [];
      (data || []).forEach(importRecord => {
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        individualRecords.push(...splitRecords);
      });
      
      logger.debug('Split invoices into individual records:', individualRecords.length);
      
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
        logger.debug(`Auto-approved ${autoApprovedRecords.length} records with matching quantities`);
        setSnackbar(`Auto-approved ${autoApprovedRecords.length} records with matching quantities`);
      }
      
      // Don't set pendingInvoices here - let fetchVerificationStats handle it
      logger.debug('fetchPendingInvoices completed, remaining records:', remainingRecords.length);
    } catch (error) {
      logger.error('Error fetching pending invoices:', error);
      setError('Failed to fetch pending invoices');
    }
  }

  async function fetchPendingReceipts() {
    try {
      logger.debug('Processing imported receipts for auto-approval');
      if (!organization?.id) {
        logger.debug('No organization ID, skipping receipt processing');
        return;
      }
      
      const { data, error } = await supabase
        .from('imported_sales_receipts')
        .select('*')
        .eq('organization_id', organization.id)
        .neq('status', 'rejected') // EXCLUDE REJECTED
        .neq('status', 'approved'); // EXCLUDE APPROVED
      
      if (error) throw error;
      
      logger.debug('Found receipts for organization:', data?.length || 0);
      // Split grouped imports into individual records (professional workflow)
      const individualRecords = [];
      (data || []).forEach(importRecord => {
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        individualRecords.push(...splitRecords);
      });
      
      logger.debug('Split receipts into individual records:', individualRecords.length);
      setPendingReceipts(individualRecords);
    } catch (error) {
      logger.error('Error fetching pending receipts:', error);
      setError('Failed to fetch pending receipts');
    }
  }

  async function fetchVerificationStats() {
    try {
      setLoading(true);
      logger.debug('Starting data fetch');
      
      if (!organization || !organization.id) {
        logger.error('❌ No organization found');
        setError('No organization found. Please log in again.');
        setLoading(false);
        return;
      }
      
      const startTime = Date.now();
      
      // Fetch imports and scans in parallel for speed.
      // Also fetch pending scans separately so unverified orders (often older) are not dropped by the 5000 limit.
      const [invoicesResult, receiptsResult, bottleScansResult, mobileScansResult, pendingScansResult] = await Promise.all([
        supabase
          .from('imported_invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .neq('status', 'approved')
          .neq('status', 'verified')
          .neq('status', 'rejected'),
        supabase
          .from('imported_sales_receipts')
          .select('*')
          .eq('organization_id', organization.id)
          .neq('status', 'approved')
          .neq('status', 'verified')
          .neq('status', 'rejected'),
        supabase
          .from('bottle_scans')
          .select('*')
          .not('order_number', 'is', null)
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('scans')
          .select('id, barcode_number, order_number, "mode", action, status, organization_id, customer_name, customer_id, product_code, created_at')
          .not('order_number', 'is', null)
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('scans')
          .select('id, barcode_number, order_number, "mode", action, status, organization_id, customer_name, customer_id, product_code, created_at')
          .not('order_number', 'is', null)
          .eq('organization_id', organization.id)
          .eq('status', 'pending')
          .limit(3000)
      ]);
      
      const { data: invoicesRaw, error: invoiceError } = invoicesResult;
      const { data: receiptsRaw, error: receiptError } = receiptsResult;
      const { data: scannedRows, error: scannedError } = bottleScansResult;
      const { data: mobileScansRaw, error: mobileError } = mobileScansResult;
      const { data: pendingScansRaw } = pendingScansResult;
      
      if (invoiceError) throw invoiceError;
      if (receiptError) throw receiptError;
      
      let invoices = invoicesRaw || [];
      let receipts = receiptsRaw || [];
      
      // Explicitly fetch pending (unverified) invoices/receipts and merge so we never miss them (e.g. after unverify)
      const [pendingInvoicesResult, pendingReceiptsResult] = await Promise.all([
        supabase.from('imported_invoices').select('*').eq('organization_id', organization.id).eq('status', 'pending'),
        supabase.from('imported_sales_receipts').select('*').eq('organization_id', organization.id).eq('status', 'pending')
      ]);
      const existingInvoiceIds = new Set(invoices.map(i => i.id));
      const existingReceiptIds = new Set(receipts.map(r => r.id));
      (pendingInvoicesResult.data || []).forEach(inv => { if (!existingInvoiceIds.has(inv.id)) { invoices = [...invoices, inv]; existingInvoiceIds.add(inv.id); } });
      (pendingReceiptsResult.data || []).forEach(rec => { if (!existingReceiptIds.has(rec.id)) { receipts = [...receipts, rec]; existingReceiptIds.add(rec.id); } });

      logger.debug(`Fetched ${invoices.length} invoices, ${receipts.length} receipts, ${(scannedRows || []).length} bottle_scans, ${(mobileScansRaw || []).length} scans`);
      
      // Split grouped imports into individual records
      const individualInvoices = [];
      invoices.forEach(importRecord => {
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        splitRecords.forEach(r => { r._sourceTable = 'imported_invoices'; });
        individualInvoices.push(...splitRecords);
      });
      
      const individualReceipts = [];
      receipts.forEach(importRecord => {
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        splitRecords.forEach(r => { r._sourceTable = 'imported_sales_receipts'; });
        individualReceipts.push(...splitRecords);
      });
      
      // Build import order numbers set from split records FIRST (for consistent deduplication)
      const importOrderNumbers = new Set();
      [...individualInvoices, ...individualReceipts].forEach(record => {
        const data = parseDataField(record.data);
        const orderNum = getOrderNumber(data);
        if (orderNum) {
          importOrderNumbers.add(orderNum.toString().trim());
        }
      });
      
      const mobileScansFiltered = (mobileScansRaw || []).filter(scan => {
        const status = (scan.status || '').toLowerCase();
        return status !== 'approved' && status !== 'rejected' && status !== 'verified';
      });
      // Merge in pending-only fetch so unverified orders (often older) are not dropped by the 5000 limit
      const seenScanIds = new Set((mobileScansFiltered || []).map(s => s.id));
      const extraPending = (pendingScansRaw || []).filter(s => s.id && !seenScanIds.has(s.id));
      extraPending.forEach(s => seenScanIds.add(s.id));
      const mobileScans = [...mobileScansFiltered, ...extraPending];
      
      // Handle errors gracefully - if bottle_scans query fails, continue with empty array
      if (scannedError) {
        logger.warn('⚠️ Scanned rows query error (bottle_scans table may not have status column):', scannedError);
        // Continue with empty array instead of throwing
      }
      
      if (mobileError) {
        logger.error('❌ Mobile scans query error:', mobileError);
        // Continue with empty array for mobile scans
      }
      
      // Merge: one row per (order, barcode, modeType). SHIP and RETURN are counted independently;
      // duplicate scans of the same type for the same barcode+order keep only the newest.
      const normBarcodeForMerge = (b) => (b == null || b === '') ? '' : String(b).trim().replace(/^0+/, '') || String(b).trim();
      const orderForMerge = (o) => (o == null || o === '') ? '' : String(o).trim();
      const getBarcodeFromRow = (r) => normBarcodeForMerge(r.bottle_barcode || r.barcode_number || r.cylinder_barcode);
      const normModeType = (r) => {
        const m = (r.mode || '').toString().toUpperCase();
        const a = (r.action || '').toString().toLowerCase();
        return (m === 'SHIP' || m === 'DELIVERY' || a === 'out') ? 'SHIP' : 'RETURN';
      };
      const mergeKey = (r) => { const o = orderForMerge(r.order_number); const b = getBarcodeFromRow(r); return o && b ? `${o}\t${b}\t${normModeType(r)}` : null; };
      const mergedByKey = {};
      const mergeNewest = (r) => {
        const k = mergeKey(r);
        if (!k) return;
        const existing = mergedByKey[k];
        if (!existing) { mergedByKey[k] = r; return; }
        const existingTime = new Date(existing.created_at || 0).getTime();
        const newTime = new Date(r.created_at || 0).getTime();
        if (newTime >= existingTime) mergedByKey[k] = r;
      };
      (scannedRows || []).forEach(mergeNewest);
      (mobileScans || []).forEach(mergeNewest);
      const allScannedRows = Object.values(mergedByKey);
      // Keep card line items in sync: use this same merge so getDetailedLineItems sees BCS62-300 etc.
      setAllScannedRows(allScannedRows);
      
      // Group scanned rows by order AND customer so each card has one customer
      const orderAndCustomerGroups = {};
      allScannedRows.forEach(scan => {
        const orderNum = scan.order_number?.toString().trim();
        if (!orderNum) return;
        const customerName = (scan.customer_name || scan.customer || 'Unknown Customer').toString().trim();
        const customerId = (scan.customer_id || scan.CustomerID || scan.CustomerId || scan.CustomerListID || '').toString().trim();
        const groupKey = `${orderNum}\t${customerName}\t${customerId}`;
        if (!orderAndCustomerGroups[groupKey]) {
          orderAndCustomerGroups[groupKey] = [];
        }
        orderAndCustomerGroups[groupKey].push(scan);
      });
      const orderGroups = orderAndCustomerGroups;
      const processStartTime = Date.now();
      
      // Normalize order number so "71760" and "071760" match (used for approved-order and scanned-only filtering)
      const normalizeOrderNumForApproval = (num) => {
        if (num == null || num === '') return '';
        const s = String(num).trim();
        if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
        return s;
      };

      // Check which orders have all scans processed (approved/verified) in the scans table
      // Query approved/verified scans separately since we exclude them from mobileScans
      // ALSO check imported_invoices for approved orders - these should NOT show as scanned-only
      const approvedOrderNumbers = new Set();
      
      // Fetch approved imports (invoices + receipts) and scan statuses in parallel
      const [approvedInvoicesResult, approvedReceiptsResult, allScansApprovalResult] = await Promise.all([
        supabase
          .from('imported_invoices')
          .select('data, approved_at, verified_at')
          .eq('organization_id', organization.id)
          .in('status', ['approved', 'verified']),
        supabase
          .from('imported_sales_receipts')
          .select('data, approved_at, verified_at')
          .eq('organization_id', organization.id)
          .in('status', ['approved', 'verified']),
        supabase
          .from('scans')
          .select('order_number, status')
          .not('order_number', 'is', null)
          .eq('organization_id', organization.id)
      ]);
      
      const approvedImports = [...(approvedInvoicesResult.data || []), ...(approvedReceiptsResult.data || [])];
      const approvedImportError = approvedInvoicesResult.error || approvedReceiptsResult.error;
      const { data: allScansForApprovalCheck, error: allScansError } = allScansApprovalResult;
      
      if (!approvedImportError && approvedImports.length > 0) {
        approvedImports.forEach(imp => {
          const data = parseDataField(imp.data);
          // Extract order numbers from all possible locations
          const rows = data.rows || data.line_items || [];
          rows.forEach(row => {
            const orderNum = (row.order_number || row.invoice_number || row.reference_number || row.sales_receipt_number || '').toString().trim();
            if (orderNum) {
              approvedOrderNumbers.add(normalizeOrderNumForApproval(orderNum));
            }
          });
          // Top-level order number
          const topOrder = (data.order_number || data.reference_number || data.invoice_number || data.summary?.reference_number || '').toString().trim();
          if (topOrder) approvedOrderNumbers.add(normalizeOrderNumForApproval(topOrder));
          // verified_order_numbers array
          if (Array.isArray(data.verified_order_numbers)) {
            data.verified_order_numbers.forEach(n => {
              const norm = normalizeOrderNumForApproval(n);
              if (norm) approvedOrderNumbers.add(norm);
            });
          }
        });
      }
      
      if (!allScansError && allScansForApprovalCheck && allScansForApprovalCheck.length > 0) {
        const orderApprovalMap = {};
        allScansForApprovalCheck.forEach(scan => {
          const orderNum = scan.order_number?.toString().trim();
          if (orderNum) {
            const norm = normalizeOrderNumForApproval(orderNum);
            if (!orderApprovalMap[norm]) {
              orderApprovalMap[norm] = { total: 0, approved: 0 };
            }
            orderApprovalMap[norm].total++;
            if (scan.status === 'approved' || scan.status === 'verified') {
              orderApprovalMap[norm].approved++;
            }
          }
        });
        
        // Mark orders as processed if all scans are processed (approved/verified)
        // Also track orders where ALL scans are pending (truly unverified, e.g. after unverify)
        const unverifiedOrderNumbers = new Set();
        Object.entries(orderApprovalMap).forEach(([normOrderNum, counts]) => {
          if (counts.total > 0 && counts.approved === counts.total) {
            approvedOrderNumbers.add(normOrderNum);
          }
          if (counts.total > 0 && counts.approved === 0) {
            unverifiedOrderNumbers.add(normOrderNum);
          }
        });

        // Clean stale verified_order_numbers: only remove orders whose scans are ALL pending (truly unverified).
        // This fixes records that were unverified before the code properly cleared verified_order_numbers.
        // Partially-verified multi-order imports (where some scans are approved) are left untouched.
        const cleanStaleVON = (records) => {
          records.forEach(rec => {
            if ((rec.status || '').toLowerCase() !== 'pending') return;
            const d = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
            if (d && Array.isArray(d.verified_order_numbers) && d.verified_order_numbers.length > 0) {
              const cleaned = d.verified_order_numbers.filter(on => !unverifiedOrderNumbers.has(normalizeOrderNumForApproval(on)));
              if (cleaned.length !== d.verified_order_numbers.length) {
                d.verified_order_numbers = cleaned;
                rec.data = d;
              }
            }
          });
        };
        cleanStaleVON(invoices);
        cleanStaleVON(receipts);
      }
      
      // Reuse approvedImports (already fetched above) to build approved import order numbers (normalized)
      const approvedImportOrderNumbers = new Set();
      if (approvedImports) {
        approvedImports.forEach(imp => {
          const data = parseDataField(imp.data);
          const rows = data.rows || data.line_items || [];
          rows.forEach(row => {
            const orderNum = (row.order_number || row.invoice_number || row.reference_number || row.sales_receipt_number || '').toString().trim();
            if (orderNum) {
              approvedImportOrderNumbers.add(normalizeOrderNumForApproval(orderNum));
            }
          });
        });
      }
      
      // Pre-build approved import lookup (normalized order → approval time) to avoid per-order DB queries
      const approvedImportTimestamps = new Map();
      if (approvedImports) {
        approvedImports.forEach(imp => {
          const data = parseDataField(imp.data);
          const rows = data.rows || data.line_items || [];
          const approvalTime = new Date(imp.approved_at || imp.verified_at || 0).getTime();
          rows.forEach(row => {
            const orderNum = (row.order_number || row.invoice_number || row.reference_number || row.sales_receipt_number || '').toString().trim();
            if (orderNum) {
              const norm = normalizeOrderNumForApproval(orderNum);
              const existing = approvedImportTimestamps.get(norm) || 0;
              if (approvalTime > existing) approvedImportTimestamps.set(norm, approvalTime);
            }
          });
        });
      }
      
      const scannedOnlyRecords = Object.entries(orderGroups)
          .filter(([groupKey, scans]) => {
            const orderNumber = groupKey.split('\t')[0];
            const normOrder = normalizeOrderNumForApproval(orderNumber);
            if (approvedOrderNumbers.has(normOrder)) return false;
            
            const hasProcessedScans = scans.some(s => s.status === 'approved' || s.status === 'verified');
            if (hasProcessedScans && scans.every(s => s.status === 'approved' || s.status === 'verified' || s.status === undefined || s.status === null)) {
              return false;
            }
            
            if (approvedImportOrderNumbers.has(normOrder)) {
              const mostRecentScanTime = Math.max(...scans.map(s => new Date(s.created_at || s.scan_date || 0).getTime()));
              const approvalTime = approvedImportTimestamps.get(normOrder) || 0;
              if (approvalTime > mostRecentScanTime) return false;
            }
            
            return true;
          })
          .map(([groupKey, scans]) => {
        const orderNumber = groupKey.split('\t')[0];
        const firstScan = scans[0];
        const customerName = firstScan.customer_name || firstScan.customer || 'Unknown Customer';
        const customerId = firstScan.customer_id || firstScan.CustomerID || firstScan.CustomerId || firstScan.CustomerListID || null;
        const hasMatchingImport = importOrderNumbers.has(orderNumber);
        const safeCustomerSuffix = (customerId || customerName || 'u').toString().replace(/[\t\n]/g, '_').slice(0, 80);
        
        // Deduplicate scans by barcode+mode (same barcode can have both SHIP and RETURN)
        const seenBarcodeMode = new Set();
        const uniqueScans = scans.filter(scan => {
          const barcode = scan.barcode_number || scan.bottle_barcode;
          if (!barcode) return true;
          const m = (scan.mode || '').toString().toUpperCase();
          const a = (scan.action || '').toString().toLowerCase();
          const modeType = (m === 'SHIP' || m === 'DELIVERY' || a === 'out') ? 'SHIP' : 'RETURN';
          const key = `${barcode}\t${modeType}`;
          if (seenBarcodeMode.has(key)) return false;
          seenBarcodeMode.add(key);
          return true;
        });
        
        return {
          id: `scanned_${orderNumber}_${safeCustomerSuffix}`,
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
                created_at: scan.created_at || scan.scan_date,
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
      
      // Deduplicate: Remove scanned-only records if we have an import for the same order number
      
      const deduplicatedScannedOnly = scannedOnlyRecords.filter(record => {
        const data = parseDataField(record.data);
        let orderNum = getOrderNumber(data);
        
        // Fallback: Extract from ID if it follows pattern "scanned_${orderNumber}" or "scanned_${orderNumber}_${customerSuffix}"
        if (!orderNum && record.id && record.id.startsWith('scanned_')) {
          const afterPrefix = record.id.replace(/^scanned_/, '');
          orderNum = afterPrefix.includes('_') ? afterPrefix.split('_')[0] : afterPrefix;
        }
        
        if (!orderNum) {
          logger.debug('Scanned-only record has no order number:', record.id);
          return true; // Keep records without order numbers (shouldn't happen)
        }
        
        const orderNumStr = orderNum.toString().trim();
        const orderNumNorm = normalizeOrderNumForApproval(orderNumStr);
        const hasMatchingImport = importOrderNumbers.has(orderNumStr);
        const hasMatchingApprovedImport = approvedOrderNumbers.has(orderNumNorm);
        
        return !hasMatchingImport && !hasMatchingApprovedImport;
      });
      
      const combinedRecords = [...individualInvoices, ...individualReceipts, ...deduplicatedScannedOnly];
      
      // One card per order + customer so we never merge different customers' data into one card
      const orderToRecord = new Map();
      combinedRecords.forEach(record => {
        const data = parseDataField(record.data);
        const orderNum = (getOrderNumber(data) || (record.id && String(record.id).startsWith('scanned_') ? String(record.id).replace('scanned_', '') : '')).toString().trim();
        const customerName = (getCustomerInfo(data) || '').toString().trim();
        const customerId = (getCustomerId(data) != null && getCustomerId(data) !== '') ? String(getCustomerId(data)).trim() : '';
        const cardKey = orderNum ? `${orderNum}\t${customerName}\t${customerId}` : `_no_order_${record.id}`;
        if (!orderNum) {
          orderToRecord.set(cardKey, record);
          return;
        }
        const existing = orderToRecord.get(cardKey);
        if (!existing) {
          orderToRecord.set(cardKey, record);
          return;
        }
        if (record.is_scanned_only && !existing.is_scanned_only) return;
        if (!record.is_scanned_only && existing.is_scanned_only) orderToRecord.set(cardKey, record);
      });
      const allRecords = Array.from(orderToRecord.values());

      // Final cleanup: Remove any approved/verified/rejected records AND any record whose
      // order number is already fully approved (catches duplicates from re-imports).
      const cleanedRecords = allRecords.filter(record => {
        const status = (record.status || '').toLowerCase();
        if (status === 'approved' || status === 'rejected' || status === 'verified') {
          return false;
        }
        const data = parseDataField(record.data);
        const orderNum = getOrderNumber(data);
        if (orderNum) {
          const norm = normalizeOrderNumForApproval(orderNum);
          if (norm && approvedOrderNumbers.has(norm)) {
            logger.debug(`Removing record ${record.id} (order ${orderNum}): order is in approvedOrderNumbers`);
            return false;
          }
        }
        return true;
      });
      
      logger.debug('Final allRecords:', { individualInvoices: individualInvoices.length, individualReceipts: individualReceipts.length, scannedOnly: deduplicatedScannedOnly.length, afterCleanup: cleanedRecords.length });
      
      // Calculate stats from the actual data being displayed
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
      
      logger.debug(`Data fetch completed in ${Date.now() - startTime}ms — ${cleanedRecords.length} records`);
      setVerificationStats(displayStats);
      setPendingInvoices(cleanedRecords);
      setLoading(false);
      
      // Check bottles at customers in background (non-blocking)
      checkBottlesAtCustomersForAllOrders(cleanedRecords).catch(console.error);
      
    } catch (error) {
      logger.error('Error fetching verification stats:', error);
      setError('Failed to fetch data: ' + error.message);
      
      // Fallback: try to show basic data even if main function fails
      try {
        logger.debug('Attempting fallback data fetch');
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
            logger.debug(`Fallback excluding invoice ${inv.id} status: ${inv.status}`);
          }
          return !isExcluded;
        });
        
        if (fallbackInvoices && fallbackInvoices.length > 0) {
          logger.debug('Fallback data found:', fallbackInvoices.length, 'records');
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

  // Fetch all customers once for lookup (name->id and id->name)
  async function fetchCustomers() {
    if (customerLookupDone.current) return;
    try {
      const { data: customers, error } = await supabase.from('customers').select('CustomerListID, name');
      if (error) throw error;
      const nameToId = {};
      const idToName = {};
      (customers || []).forEach(c => {
        if (c.name) nameToId[c.name.toLowerCase()] = c.CustomerListID;
        if (c.CustomerListID != null) idToName[String(c.CustomerListID)] = c.name || '';
      });
      setCustomerNameToId(nameToId);
      setCustomerIdToName(idToName);
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
      
      // Get from scans table (exclude rejected)
      const { data: mobileScans, error: mobileError } = await supabase
        .from('scans')
        .select('id, barcode_number, order_number, "mode", action, status, organization_id, customer_name, customer_id, product_code, created_at')
        .eq('organization_id', organization.id)
        .not('status', 'eq', 'rejected');
      
      if (mobileError) {
        logger.error('Error fetching mobile scans:', mobileError);
        // Continue with empty array
      }
      
      // Get rejected scans to filter out matching bottle_scans entries
      // (bottle_scans table doesn't have status, so we need to cross-reference)
      // Note: scans table uses 'barcode_number', not 'bottle_barcode'
      const { data: rejectedScans, error: rejectedError } = await supabase
        .from('scans')
        .select('order_number, barcode_number')
        .eq('organization_id', organization.id)
        .eq('status', 'rejected');
      
      if (rejectedError) {
        logger.warn('Error fetching rejected scans:', rejectedError);
      }
      
      // Build sets of rejected scan identifiers (order number as-is, trim only; no deriving)
      const trimOrderNum = (num) => (num == null || num === '') ? '' : String(num).trim();
      
      const rejectedOrderNumbers = new Set();
      const rejectedScanKeys = new Set();
      if (rejectedScans) {
        rejectedScans.forEach(scan => {
          const orderNum = trimOrderNum(scan.order_number);
          const barcode = String(scan.barcode_number || '').trim();
          
          if (orderNum) rejectedOrderNumbers.add(orderNum);
          if (orderNum && barcode) rejectedScanKeys.add(`${orderNum}:${barcode}`);
        });
      }
      
      // Filter out bottle_scans that match rejected scans
      // Also filter out SHIP scans when there are RETURN scans for the same barcode/order
      // (This handles cases where a user scanned a return but there are old SHIP scans)
      const filteredBottleScans = (scannedRows || []).filter(bottleScan => {
        const orderNum = trimOrderNum(bottleScan.order_number);
        const barcode = String(bottleScan.bottle_barcode || '').trim();
        const mode = (bottleScan.mode || '').toString().toUpperCase();
        
        // Check if this specific bottle_scan matches a rejected scan (exact match: order + barcode)
        if (orderNum && barcode) {
          if (rejectedScanKeys.has(`${orderNum}:${barcode}`)) {
            return false;
          }
        }
        
        // Also check if this order has rejected scans and this specific barcode was rejected
        if (orderNum && barcode && rejectedOrderNumbers.has(orderNum)) {
          const matchingRejectedScan = rejectedScans?.find(scan => {
            const scanOrderNum = trimOrderNum(scan.order_number);
            const scanBarcode = String(scan.barcode_number || '').trim();
            
            const orderMatches = scanOrderNum === orderNum;
            const barcodeMatches = scanBarcode === barcode;
            
            return orderMatches && barcodeMatches;
          });
          
          if (matchingRejectedScan) {
            logger.debug('🚫 Filtering out bottle_scan - found matching rejected scan:', {
              order: orderNum,
              barcode: barcode,
              mode: mode,
              rejectedScan: {
                order: matchingRejectedScan.order_number,
                barcode: matchingRejectedScan.barcode_number
              }
            });
            return false;
          }
        }
        
        // Do NOT filter out SHIP scans when a RETURN exists for the same barcode/order.
        // For verification we need both: Trk SHP = scans that were delivered, Trk RTN = scans that were returned.
        // Filtering out SHIP when RETURN exists made the list show Trk SHP: 0 while the detail page showed 2 DELIVERED.
        // Keep only the rejected-scan filtering above.
        
        return true;
      });
      
      // Merge: one row per (order, barcode, modeType). SHIP and RETURN are counted independently;
      // duplicate scans of the same type for the same barcode+order keep only the newest.
      const normBarcodeForMerge = (b) => (b == null || b === '') ? '' : String(b).trim().replace(/^0+/, '') || String(b).trim();
      const orderForMerge = (o) => (o == null || o === '') ? '' : String(o).trim();
      const getBarcodeFromRow = (r) => normBarcodeForMerge(r.bottle_barcode || r.barcode_number || r.cylinder_barcode);
      const normModeType = (r) => {
        const m = (r.mode || '').toString().toUpperCase();
        const a = (r.action || '').toString().toLowerCase();
        return (m === 'SHIP' || m === 'DELIVERY' || a === 'out') ? 'SHIP' : 'RETURN';
      };
      const mergeKey = (r) => { const o = orderForMerge(r.order_number); const b = getBarcodeFromRow(r); return o && b ? `${o}\t${b}\t${normModeType(r)}` : null; };
      const mergedByKey = {};
      const mergeNewest = (r) => {
        const k = mergeKey(r);
        if (!k) return;
        const existing = mergedByKey[k];
        if (!existing) { mergedByKey[k] = r; return; }
        const existingTime = new Date(existing.created_at || 0).getTime();
        const newTime = new Date(r.created_at || 0).getTime();
        if (newTime >= existingTime) mergedByKey[k] = r;
      };
      (filteredBottleScans || []).forEach(mergeNewest);
      (mobileScans || []).forEach(mergeNewest);
      const allScans = Object.values(mergedByKey);
      
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
      
      logger.debug('🔍 Fetched bottle_scans:', scannedRows?.length || 0, 'records for org:', organization.id);
      
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
      
      logger.debug('🔍 Fetched mobile scans:', mobileScans?.length || 0, 'records');
      
      // Check for rejected scans in this organization
      const { data: rejectedScans } = await supabase
        .from('scans')
        .select('order_number, status, rejected_at')
        .eq('status', 'rejected')
        .eq('organization_id', organization.id);
      logger.debug('Rejected scans in database:', rejectedScans);

      // Merge: one row per (order, barcode, modeType). SHIP and RETURN are counted independently;
      // duplicate scans of the same type for the same barcode+order keep only the newest.
      const normBarcodeForMerge = (b) => (b == null || b === '') ? '' : String(b).trim().replace(/^0+/, '') || String(b).trim();
      const orderForMerge = (o) => (o == null || o === '') ? '' : String(o).trim();
      const getBarcodeFromRow = (r) => normBarcodeForMerge(r.bottle_barcode || r.barcode_number || r.cylinder_barcode);
      const normModeType = (r) => {
        const m = (r.mode || '').toString().toUpperCase();
        const a = (r.action || '').toString().toLowerCase();
        return (m === 'SHIP' || m === 'DELIVERY' || a === 'out') ? 'SHIP' : 'RETURN';
      };
      const mergeKey = (r) => { const o = orderForMerge(r.order_number); const b = getBarcodeFromRow(r); return o && b ? `${o}\t${b}\t${normModeType(r)}` : null; };
      const mergedByKey = {};
      const mergeNewest = (r) => {
        const k = mergeKey(r);
        if (!k) return;
        const existing = mergedByKey[k];
        if (!existing) { mergedByKey[k] = r; return; }
        const existingTime = new Date(existing.created_at || 0).getTime();
        const newTime = new Date(r.created_at || 0).getTime();
        if (newTime >= existingTime) mergedByKey[k] = r;
      };
      (scannedRows || []).forEach(mergeNewest);
      (mobileScans || []).forEach(mergeNewest);
      const allScannedRows = Object.values(mergedByKey);

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

      logger.debug('📋 Imported order numbers:', Array.from(importedOrderNumbers));

      // Group scanned rows by order AND customer - EXCLUDE REJECTED AND APPROVED
      const orderGroups = {};
      allScannedRows.forEach(scan => {
        if (scan.status === 'rejected' || scan.status === 'approved' || scan.status === 'verified') return;
        const orderNum = scan.order_number?.toString().trim();
        if (!orderNum) return;
        const customerName = (scan.customer_name || scan.customer || 'Unknown Customer').toString().trim();
        const customerId = (scan.customer_id || scan.CustomerID || scan.CustomerId || scan.CustomerListID || '').toString().trim();
        const groupKey = `${orderNum}\t${customerName}\t${customerId}`;
        if (!orderGroups[groupKey]) orderGroups[groupKey] = [];
        orderGroups[groupKey].push(scan);
      });

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
      logger.debug('📋 Approved order numbers from imports:', Array.from(approvedOrderNumbers));

      // Convert to the same format as imported invoices for consistency
      // Only create scanned-only records for orders that DON'T have matching imports
      // Also check if order has approved scans in scans table
      const scannedOnlyRecords = (await Promise.all(
        Object.entries(orderGroups)
          .filter(([groupKey]) => !importedOrderNumbers.has(groupKey.split('\t')[0]))
          .map(async ([groupKey, scans]) => {
            const orderNumber = groupKey.split('\t')[0];
            // Double-check: Query scans table to see if this order has any approved/verified scans
            const { data: approvedScans, error: approvedError } = await supabase
              .from('scans')
              .select('id, status')
              .eq('order_number', orderNumber)
              .eq('organization_id', organization.id)
              .in('status', ['approved', 'verified']);
            
            if (approvedError) {
              logger.warn(`⚠️ Error checking approved scans for order ${orderNumber}:`, approvedError);
            } else if (approvedScans && approvedScans.length > 0) {
              return null;
            }
            if (approvedOrderNumbers.has(orderNumber)) {
              return null;
            }
          const firstScan = scans[0];
          const customerName = firstScan.customer_name || firstScan.customer || 'Unknown Customer';
          const customerId = firstScan.customer_id || firstScan.CustomerID || firstScan.CustomerId || firstScan.CustomerListID || null;
          const safeCustomerSuffix = (customerId || customerName || 'u').toString().replace(/[\t\n]/g, '_').slice(0, 80);
          
          return {
            id: `scanned_${orderNumber}_${safeCustomerSuffix}`,
            data: {
              rows: scans.map(scan => {
                const mode = scan.mode || scan.scan_type || scan.action || '';
                const modeUpper = mode.toString().toUpperCase();
                const action = (scan.action || '').toString().toLowerCase();
                const scanType = (scan.scan_type || '').toString().toLowerCase();
                const isOut = action === 'out' || scanType === 'delivery' || modeUpper === 'SHIP' || modeUpper === 'DELIVERY' || modeUpper === 'OUT';
                const isIn = action === 'in' || scanType === 'pickup' || modeUpper === 'RETURN' || modeUpper === 'PICKUP' || modeUpper === 'IN';
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
                  created_at: scan.created_at || scan.scan_date,
                  location: scan.location || 'Unknown',
                  barcode: scan.barcode_number || scan.bottle_barcode,
                  description: scan.description || 'Unknown',
                  gas_type: scan.gas_type || 'Unknown'
                };
                return row;
              }),
              customer_name: customerName,
              customer_id: customerId,
              CustomerID: customerId,
              CustomerId: customerId,
              CustomerListID: customerId,
              summary: {
                total_rows: scans.length,
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
        logger.debug(`✅ Auto-approved ${autoApprovedScannedRecords.length} scanned-only records with matching quantities`);
        setSnackbar(`Auto-approved ${autoApprovedScannedRecords.length} scanned-only records with matching quantities`);
      }

      // Don't set pendingInvoices here - let fetchVerificationStats handle it
      logger.debug('📊 fetchScannedOnlyOrders completed, remaining scanned records:', remainingScannedRecords.length);

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
      logger.debug('🔍 Fetched locations:', locations?.length || 0);
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
      const normBarcode = (b) => (b == null || b === '') ? '' : (String(b).trim().replace(/^0+/, '') || String(b).trim());
      (bottles || []).forEach(bottle => {
        const bottleInfo = {
          description: bottle.description || (bottle.gas_type && bottle.size ? `${bottle.gas_type} BOTTLE - SIZE ${bottle.size}` : ''),
          type: bottle.product_code || '',
          size: bottle.size || '',
          group: bottle.gas_type || '',
          category: bottle.category || 'INDUSTRIAL CYLINDERS',
          barcode: bottle.barcode_number || '',
          serial_number: bottle.serial_number || '',
          product_code: bottle.product_code || ''
        };
        // Create entry by product code
        if (bottle.product_code) {
          assetMap[bottle.product_code] = bottleInfo;
        }
        // Create entry by barcode (raw and normalized) so scans match whether barcode is "12345" or "012345"
        if (bottle.barcode_number) {
          assetMap[bottle.barcode_number] = bottleInfo;
          const nb = normBarcode(bottle.barcode_number);
          if (nb && nb !== bottle.barcode_number) assetMap[nb] = bottleInfo;
        }
      });
      setProductCodeToAssetInfo(assetMap);
    } catch (error) {
      logger.error('Error fetching bottles:', error);
    }
  }

  // Fetch bottle information for an order
  async function fetchBottleInfoForOrder(orderNumber, customerFilter = null) {
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

      logger.debug('🔍 Fetching bottle info for order:', orderNumber, 'Type:', typeof orderNumber);
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
      logger.debug('🔍 Trying order number variants:', uniqueOrderNumbers);
      
      // Get all scanned barcodes for this order
      const scannedBarcodes = new Set();
      
      // Get scans from scans table - try all order number variants
      let scans = [];
      if (organization?.id) {
        // Try exact match first
        let { data: scansData, error: scansError } = await supabase
.from('scans')
        .select('barcode_number, product_code, action, "mode", created_at, customer_name, order_number')
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
              .select('barcode_number, product_code, action, "mode", created_at, customer_name, order_number')
              .eq('order_number', orderNumNum)
              .eq('organization_id', organization.id);
            
            if (!scansErrorNum && scansDataNum && scansDataNum.length > 0) {
              scans = scansDataNum;
              logger.debug('✅ Found scans using numeric match');
            }
          }
          
          // If still no results, try OR query with all variants
          if (scans.length === 0 && uniqueOrderNumbers.length > 1) {
            const { data: scansDataAll, error: scansErrorAll } = await supabase
              .from('scans')
              .select('barcode_number, product_code, action, "mode", created_at, customer_name, order_number')
              .in('order_number', uniqueOrderNumbers)
              .eq('organization_id', organization.id);
            
            if (!scansErrorAll && scansDataAll && scansDataAll.length > 0) {
              scans = scansDataAll;
              logger.debug('✅ Found scans using variant match');
            }
          }
          
          // If still no results, try text-based search (ILIKE) for partial matches
          if (scans.length === 0) {
            let { data: scansText, error: scansTextError } = await supabase
              .from('scans')
              .select('barcode_number, product_code, action, "mode", created_at, customer_name, order_number')
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
                logger.debug('✅ Found scans using text-based search (ILIKE)');
              }
            }
          }
        }
        
      logger.debug('📦 Found scans in scans table:', scans.length, 'for order', orderNumber);
        if (scans.length > 0) {
          logger.debug('📦 Sample scan order_numbers:', scans.slice(0, 3).map(s => s.order_number));
        }
        
        // For scanned-only cards: only include scans for this card's customer (same order number can have multiple customers)
        if (customerFilter && (customerFilter.customerName || customerFilter.customerId)) {
          const norm = (v) => (v != null && v !== '') ? String(v).trim().toLowerCase() : '';
          const wantName = norm(customerFilter.customerName);
          const wantId = norm(customerFilter.customerId);
          const before = scans.length;
          scans = scans.filter(s => {
            const sn = norm(s.customer_name || s.customer);
            const si = norm(s.customer_id || s.CustomerID || s.CustomerId || s.CustomerListID);
            return (wantName && sn === wantName) || (wantId && si === wantId);
          });
          logger.debug('📦 Filtered scans by customer:', before, '->', scans.length, 'customerFilter:', customerFilter);
        }
        
        // If no scans found with organization filter, try without it (as fallback)
        if (scans.length === 0) {
          logger.debug('🔍 Trying scans table without organization filter...');
          const { data: scansNoOrg, error: scansNoOrgError } = await supabase
            .from('scans')
            .select('barcode_number, product_code, action, "mode", created_at, customer_name, order_number, organization_id')
            .eq('order_number', orderNumStr);
          
          if (!scansNoOrgError && scansNoOrg && scansNoOrg.length > 0) {
            // Filter to our organization or null organization_id
            const filteredScans = scansNoOrg.filter(s => 
              !s.organization_id || s.organization_id === organization.id
            );
            
            if (filteredScans.length > 0) {
              scans = filteredScans;
              logger.debug('✅ Found scans without org filter:', scans.length);
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
        logger.debug('📊 Scans table barcodes:', Array.from(scannedBarcodes));
      } else {
        logger.debug('⚠️ No scans found in scans table for order:', orderNumber);
      }
      
      // Also check bottle_scans table (may not have organization_id column)
      // NOTE: bottle_scans uses 'bottle_barcode' and 'cylinder_barcode', not 'barcode_number'
      let bottleScans = [];
      
      const bottleScansSelect = 'bottle_barcode, cylinder_barcode, barcode_number, created_at, order_number, organization_id, mode';
      // Try exact match first (string)
      let { data: bottleScansData, error: bottleScansError } = await supabase
        .from('bottle_scans')
        .select(bottleScansSelect)
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
          .select(bottleScansSelect)
          .eq('order_number', orderNumNum);
        
        if (!bottleScansErrorNum && bottleScansDataNum && bottleScansDataNum.length > 0) {
          bottleScans = bottleScansDataNum;
          logger.debug('✅ Found bottle_scans using numeric match');
        }
      }
      
      // If still no results, try OR query with all variants
      if (bottleScans.length === 0 && uniqueOrderNumbers.length > 1) {
        const { data: bottleScansDataAll, error: bottleScansErrorAll } = await supabase
          .from('bottle_scans')
          .select(bottleScansSelect)
          .in('order_number', uniqueOrderNumbers);
        
        if (!bottleScansErrorAll && bottleScansDataAll && bottleScansDataAll.length > 0) {
          bottleScans = bottleScansDataAll;
          logger.debug('✅ Found bottle_scans using variant match');
        }
      }
      
      // If still no results, try text-based search (ILIKE) for partial matches
      // This handles cases where order_number might be stored with extra spaces or in different format
      if (bottleScans.length === 0) {
        // First try: order number contains the search term
        let { data: bottleScansText, error: bottleScansTextError } = await supabase
          .from('bottle_scans')
          .select(bottleScansSelect)
          .ilike('order_number', `%${orderNumStr}%`);
        
        if (!bottleScansTextError && bottleScansText && bottleScansText.length > 0) {
          // Filter to only exact matches after trimming/normalizing
          const normalizedBottleScans = bottleScansText.filter(bs => {
            const normalized = bs.order_number?.toString().trim();
            return normalized === orderNumStr || normalized === orderNumNum.toString();
          });
          
          if (normalizedBottleScans.length > 0) {
            bottleScans = normalizedBottleScans;
            logger.debug('✅ Found bottle_scans using text-based search (ILIKE)');
          }
        }
      }
      
      logger.debug('📦 Raw bottle_scans data for order', orderNumber, ':', bottleScans.length, 'scans');
      if (bottleScans.length > 0) {
        logger.debug('📦 Sample bottle_scan order_numbers:', bottleScans.slice(0, 3).map(bs => bs.order_number));
      }
      
      // DEBUG: If no scans found, check what order numbers actually exist
      if (bottleScans.length === 0 && scans.length === 0) {
        logger.debug('🔍 DEBUG: No scans found, checking what order numbers exist...');
        logger.debug('🔍 DEBUG: Searched for order number:', orderNumber, 'variants:', uniqueOrderNumbers);
        logger.debug('🔍 DEBUG: Organization ID:', organization?.id);
        
        // Check bottle_scans table
        const { data: allOrderNumbers } = await supabase
          .from('bottle_scans')
          .select('order_number, organization_id, created_at')
          .limit(100)
          .order('created_at', { ascending: false });
        
        if (allOrderNumbers && allOrderNumbers.length > 0) {
          const orderNumbersSet = new Set(allOrderNumbers.map(s => s.order_number?.toString().trim()).filter(Boolean));
          logger.debug('🔍 DEBUG: Sample order numbers in bottle_scans (last 100):', Array.from(orderNumbersSet).slice(0, 30));
          
          // Show order numbers with our organization if available
          if (organization?.id) {
            const orgOrderNumbers = allOrderNumbers
              .filter(s => s.organization_id === organization.id)
              .map(s => s.order_number?.toString().trim())
              .filter(Boolean);
            const orgOrderNumbersSet = new Set(orgOrderNumbers);
            logger.debug('🔍 DEBUG: Order numbers for our organization:', Array.from(orgOrderNumbersSet).slice(0, 20));
          }
          
          // Check if our order number is close to any existing ones
          const matchingNumbers = Array.from(orderNumbersSet).filter(on => 
            on.includes(orderNumStr) || orderNumStr.includes(on)
          );
          if (matchingNumbers.length > 0) {
            logger.debug('🔍 DEBUG: Similar order numbers found:', matchingNumbers);
          }
          
          // Check for exact matches with different type
          const exactMatches = Array.from(orderNumbersSet).filter(on => {
            const normalized = on.trim();
            return normalized === orderNumStr || normalized === orderNumNum.toString();
          });
          if (exactMatches.length > 0) {
            logger.debug('⚠️ WARNING: Found exact match order numbers but scans query returned empty!', exactMatches);
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
            logger.debug('🔍 DEBUG: Sample order numbers in scans table:', Array.from(scansOrderNumbersSet).slice(0, 20));
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
        logger.debug(`📦 Filtered bottle_scans: ${beforeFilter} -> ${bottleScans.length} (org filter: ${organization.id})`);
      }
      
      // When filtering by customer (scanned-only card), only use scans/fallback for barcodes (they are already filtered). Skip bottle_scans so we don't mix in other customers' data.
      const skipBottleScansForBarcodes = customerFilter && (customerFilter.customerName || customerFilter.customerId);
      
      if (bottleScans && bottleScans.length > 0 && !skipBottleScansForBarcodes) {
        bottleScans.forEach(scan => {
          // bottle_scans table uses 'bottle_barcode' as primary field
          if (scan.bottle_barcode) scannedBarcodes.add(scan.bottle_barcode.toString().trim());
          if (scan.cylinder_barcode) scannedBarcodes.add(scan.cylinder_barcode.toString().trim());
          if (scan.barcode_number) scannedBarcodes.add(scan.barcode_number.toString().trim()); // Fallback
        });
        logger.debug('📊 Found bottle_scans:', bottleScans.length, 'unique barcodes:', Array.from(scannedBarcodes));
      } else {
        logger.debug('⚠️ No bottle_scans found for order:', orderNumber);
      }
      
      // FALLBACK: Always check allScannedRows (preloaded data) - this is more reliable
      // This matches the strategy used by getScannedQty which successfully finds scans
      if (allScannedRows && allScannedRows.length > 0) {
        logger.debug('🔍 FALLBACK: Checking allScannedRows for order:', orderNumber, 'Type:', typeof orderNumber);
        logger.debug('🔍 FALLBACK: Total rows in allScannedRows:', allScannedRows.length);
        logger.debug('🔍 FALLBACK: orderNumStr:', orderNumStr, 'orderNumNum:', orderNumNum);
        
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
            logger.debug('🔍 FALLBACK: Match found!', {
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
        
        // For scanned-only: only include fallback scans for this card's customer
        let fallbackScansFiltered = fallbackScans;
        if (customerFilter && (customerFilter.customerName || customerFilter.customerId) && fallbackScans.length > 0) {
          const norm = (v) => (v != null && v !== '') ? String(v).trim().toLowerCase() : '';
          const wantName = norm(customerFilter.customerName);
          const wantId = norm(customerFilter.customerId);
          fallbackScansFiltered = fallbackScans.filter(row => {
            const sn = norm(row.customer_name || row.customer);
            const si = norm(row.customer_id || row.CustomerID || row.CustomerId || row.CustomerListID);
            return (wantName && sn === wantName) || (wantId && si === wantId);
          });
          logger.debug('🔍 FALLBACK: Filtered by customer:', fallbackScans.length, '->', fallbackScansFiltered.length);
        }
        
        logger.debug('🔍 FALLBACK: Found', fallbackScansFiltered.length, 'matching scans in allScannedRows');
        if (fallbackScansFiltered.length > 0) {
          logger.debug('🔍 FALLBACK: Sample scan order_numbers:', fallbackScansFiltered.slice(0, 3).map(s => ({
            order_number: s.order_number,
            invoice_number: s.invoice_number,
            barcode: s.barcode_number || s.bottle_barcode,
            org_id: s.organization_id
          })));
          
          // Extract barcodes from fallback scans
          const beforeFallback = scannedBarcodes.size;
          fallbackScansFiltered.forEach(scan => {
            if (scan.barcode_number) scannedBarcodes.add(scan.barcode_number.toString().trim());
            if (scan.bottle_barcode) scannedBarcodes.add(scan.bottle_barcode.toString().trim());
            if (scan.cylinder_barcode) scannedBarcodes.add(scan.cylinder_barcode.toString().trim());
          });
          
          // Also add to scans/bottleScans arrays for matching with bottles
          const scansToAdd = fallbackScansFiltered.filter(s => s.mode || s.action || s.scan_type);
          const bottleScansToAdd = fallbackScansFiltered.filter(s => s.bottle_barcode || s.cylinder_barcode);
          
          scans = [...scans, ...scansToAdd];
          bottleScans = [...bottleScans, ...bottleScansToAdd];
          
          logger.debug('✅ FALLBACK: Added', scannedBarcodes.size - beforeFallback, 'new barcodes (total:', scannedBarcodes.size, ')');
          logger.debug('✅ FALLBACK: Added', scansToAdd.length, 'scans and', bottleScansToAdd.length, 'bottle_scans');
        } else {
          // Debug: Show what order numbers actually exist in allScannedRows
          const uniqueOrderNums = [...new Set(allScannedRows.map(s => s.order_number?.toString().trim()).filter(Boolean))];
          logger.debug('⚠️ FALLBACK: No matching scans. Sample order numbers in allScannedRows:', uniqueOrderNums.slice(0, 20));
        }
      } else {
        logger.debug('⚠️ FALLBACK: allScannedRows is empty or not loaded');
      }
      
      // Fetch bottle details from database
      const bottles = [];
      logger.debug('🔍 Summary - Scanned barcodes found:', scannedBarcodes.size, Array.from(scannedBarcodes));
      logger.debug('🔍 Organization ID:', organization?.id);
      
      if (scannedBarcodes.size > 0 && organization?.id) {
        const barcodeArray = Array.from(scannedBarcodes);
        logger.debug('🔍 Fetching bottles for', barcodeArray.length, 'barcodes:', barcodeArray);
        
        const { data: bottleData, error: bottleError } = await supabase
          .from('bottles')
          .select('*')
          .in('barcode_number', barcodeArray)
          .eq('organization_id', organization.id);
        
        if (bottleError) {
          logger.error('❌ Error fetching bottles:', bottleError);
          setError('Failed to fetch bottles: ' + bottleError.message);
        } else if (bottleData) {
          logger.debug('✅ Found bottles in database:', bottleData.length, 'bottles');
          logger.debug('✅ Bottle barcodes found:', bottleData.map(b => b.barcode_number));
          
          // Build per-barcode "best" scan - most recent wins (same as card Trk and detail Delivered/Returned lists)
          const getBarcode = (s) => (s.barcode_number || s.bottle_barcode || s.cylinder_barcode)?.toString().trim();
          const isReturnScan = (s) => {
            const mode = (s.mode || '').toString().toUpperCase();
            const action = (s.action || '').toString().toLowerCase();
            const st = (s.scan_type || '').toString().toLowerCase();
            return mode === 'RETURN' || mode === 'PICKUP' || st === 'pickup' || (action === 'in' && mode !== 'SHIP' && mode !== 'DELIVERY');
          };
          const barcodeToBestScan = new Map();
          [...(scans || []), ...(bottleScans || [])].forEach(s => {
            const b = getBarcode(s);
            if (!b) return;
            const thisIsReturn = isReturnScan(s);
            const time = new Date(s.created_at || s.timestamp || 0).getTime();
            const existing = barcodeToBestScan.get(b);
            if (!existing || time >= existing.time) {
              barcodeToBestScan.set(b, {
                action: s.action,
                mode: s.mode,
                created_at: s.created_at,
                customer_name: s.customer_name,
                isReturn: thisIsReturn,
                time
              });
            }
          });

          // Match bottles with scan information (most recent wins so View Bottles matches card Trk)
          bottleData.forEach(bottle => {
            const b = bottle.barcode_number?.toString().trim();
            const best = b ? barcodeToBestScan.get(b) : null;
            const scanAction = best ? (best.action || best.mode) : 'unknown';
            const scanDate = best?.created_at ?? null;
            const customer_name = bottle.customer_name || best?.customer_name || null;
            
            bottles.push({
              ...bottle,
              customer_name,
              scanAction,
              scanDate
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
      
      logger.debug(`✅ Fetched ${bottles.length} bottles for order ${orderNumber} (from ${scannedBarcodes.size} scanned barcodes)`);
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
  function handleViewBottles(orderNumber, record = null) {
    const isScannedOnly = record && (record.is_scanned_only || (typeof record.id === 'string' && record.id.startsWith('scanned_')));
    const data = record && parseDataField(record.data);
    const customerName = isScannedOnly && data ? (data.customer_name || data.CustomerName || data.Customer || '') : '';
    const customerId = isScannedOnly && data ? (data.customer_id || data.CustomerId || data.CustomerListID || '') : '';
    setBottleInfoDialog({
      open: true,
      orderNumber: orderNumber,
      bottles: [],
      scannedBarcodes: [],
      loading: true,
      customerFilter: isScannedOnly ? { customerName: (customerName || '').toString().trim(), customerId: (customerId || '').toString().trim() } : null
    });
    fetchCustomers();
    fetchBottleInfoForOrder(orderNumber, isScannedOnly ? { customerName, customerId } : null);
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

  // Responsive qrbox for small iOS/small phones: use viewfinder dimensions so scan area fits viewport
  const getQrboxDimensions = (viewfinderWidth, viewfinderHeight) => {
    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
    const maxEdge = Math.max(viewfinderWidth, viewfinderHeight);
    const width = Math.min(Math.floor(maxEdge * 0.85), Math.floor(minEdge * 0.95));
    const height = Math.max(120, Math.floor(width * 0.4));
    return { width, height };
  };

  // Automatic scanning functions
  const initializeScanner = () => {
    try {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 20,
          qrbox: getQrboxDimensions,
          aspectRatio: 1.0,
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
            logger.debug(`✅ Updated bottle ${scan.cylinder_barcode} - Customer: ${customer.CustomerListID}, Location: ${deliveryLocation}`);
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
            logger.debug(`✅ Updated bottle ${scan.cylinder_barcode} - Customer: ${customer.CustomerListID}, Location: ${deliveryLocation}`);
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
    
    // For scanned-only records, sum by product with most-recent scan wins: same barcode SHIP then RETURN (or vice versa) = correction, count only the latest
    if (isScannedOnly && lineItems.length > 0) {
      const normBarcode = (b) => (b == null || b === '') ? '' : String(b).trim().replace(/^0+/, '') || String(b).trim();
      const finalAggregated = {};
      // Per product, per barcode: track latest scan type by created_at
      const productBarcodeLatest = {}; // productCode -> Map(normBarcode -> { type: 'SHIP'|'RETURN', time })
      lineItems.forEach(item => {
        const productInfo = getProductInfo(item);
        const productCode = productInfo.productCode;
        const qty_out = parseInt(item.qty_out || 0, 10);
        const qty_in = parseInt(item.qty_in || 0, 10);
        const barcode = normBarcode(item.barcode || item.barcode_number || item.bottle_barcode);
        const time = new Date(item.created_at || item.date || 0).getTime();
        if (!finalAggregated[productCode]) {
          finalAggregated[productCode] = {
            ...item,
            productInfo,
            shipped: 0,
            returned: 0,
            scannedShipped: 0,
            scannedReturned: 0
          };
          productBarcodeLatest[productCode] = new Map();
        }
        const latestMap = productBarcodeLatest[productCode];
        if (barcode) {
          const rowType = qty_in ? 'RETURN' : 'SHIP';
          const existing = latestMap.get(barcode);
          if (!existing || time >= existing.time) {
            latestMap.set(barcode, { type: rowType, time });
          }
        } else {
          finalAggregated[productCode].scannedShipped += qty_out;
          finalAggregated[productCode].scannedReturned += qty_in;
        }
      });
      // Apply most-recent wins per barcode
      Object.entries(productBarcodeLatest).forEach(([productCode, latestMap]) => {
        latestMap.forEach(({ type }) => {
          if (type === 'RETURN') {
            finalAggregated[productCode].scannedReturned += 1;
          } else {
            finalAggregated[productCode].scannedShipped += 1;
          }
        });
      });

      // Include product lines from allScannedRows so products that didn't make the merge (e.g. BCS62-300) still show on the card
      const orderNum = getOrderNumber(data);
      if (orderNum && allScannedRows && allScannedRows.length > 0) {
        const normOrder = (n) => {
          if (n == null || n === '') return '';
          const s = String(n).trim();
          if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
          return s;
        };
        const ordTrim = normOrder(orderNum);
        const productCodesFromScans = new Set();
        allScannedRows.forEach(row => {
          if (row.status === 'rejected') return;
          if (normOrder(row.order_number) !== ordTrim) return;
          let pc = row.product_code;
          if (!pc) {
            const b = String(row.bottle_barcode || row.barcode_number || '').trim();
            if (b) {
              const nb = b.replace(/^0+/, '') || b;
              const info = productCodeToAssetInfo[b] || productCodeToAssetInfo[nb];
              pc = (info && info.product_code) ? info.product_code : b;
            }
          }
          if (pc) productCodesFromScans.add(String(pc).trim());
        });
        const soCustomerName = data.customer_name || data.CustomerName || data.Customer || (lineItems[0] && (lineItems[0].customer_name || lineItems[0].customerName)) || '';
        const soCustomerId = data.customer_id || data.CustomerListID || data.CustomerId || (lineItems[0] && (lineItems[0].customer_id || lineItems[0].customerId || lineItems[0].CustomerListID)) || '';
        productCodesFromScans.forEach(productCode => {
          if (finalAggregated[productCode]) return;
          const productInfo = getProductInfo({ product_code: productCode });
          const scannedShipped = getScannedQty(orderNum, productInfo.productCode || productCode, 'out', null);
          const scannedReturned = getScannedQty(orderNum, productInfo.productCode || productCode, 'in', null);
          if (scannedShipped === 0 && scannedReturned === 0) return;
          finalAggregated[productCode] = {
            product_code: productCode,
            productInfo,
            shipped: 0,
            returned: 0,
            scannedShipped,
            scannedReturned,
            order_number: orderNum,
            customer_name: soCustomerName,
            customer_id: soCustomerId,
            CustomerListID: soCustomerId,
            highlight: getHighlightInfo({ qty_out: scannedShipped, qty_in: scannedReturned }, productInfo)
          };
        });
      }

      const result = Object.values(finalAggregated).map(item => {
        const highlight = item.highlight || getHighlightInfo(item, item.productInfo);
        return { ...item, highlight };
      });
      return result;
    }
    
    // For regular invoices: map invoice rows, then augment with any product from scans not on the invoice (e.g. BCS62-300 only in View Bottles)
    const baseItems = lineItems.map(item => {
      const productInfo = getProductInfo(item);
      const shipped = getShippedQuantity(item);
      const returned = getReturnedQuantity(item);
      const highlight = getHighlightInfo(item, productInfo);
      return { ...item, productInfo, shipped, returned, highlight };
    });
    const orderNum = getOrderNumber(data);
    const existingProductCodes = new Set(baseItems.map(item => (item.productInfo && item.productInfo.productCode) ? item.productInfo.productCode : (item.product_code || item.ProductCode || item.productCode || '').toString().trim()).filter(Boolean));
    if (orderNum && allScannedRows && allScannedRows.length > 0) {
      const normOrder = (n) => {
        if (n == null || n === '') return '';
        const s = String(n).trim();
        if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
        return s;
      };
      const ordTrim = normOrder(orderNum);
      const productCodesFromScans = new Set();
      allScannedRows.forEach(row => {
        if (row.status === 'rejected') return;
        if (normOrder(row.order_number) !== ordTrim) return;
        let pc = row.product_code;
        if (!pc) {
          const b = String(row.bottle_barcode || row.barcode_number || '').trim();
          if (b) {
            const nb = b.replace(/^0+/, '') || b;
            const info = productCodeToAssetInfo[b] || productCodeToAssetInfo[nb];
            pc = (info && info.product_code) ? info.product_code : b;
          }
        }
        if (pc) productCodesFromScans.add(String(pc).trim());
      });
      // Inherit customer info from the invoice data so augmented items survive the customer filter in card rendering
      const augCustomerName = data.customer_name || data.CustomerName || data.Customer || (lineItems[0] && (lineItems[0].customer_name || lineItems[0].customerName)) || '';
      const augCustomerId = data.customer_id || data.CustomerListID || data.CustomerId || (lineItems[0] && (lineItems[0].customer_id || lineItems[0].customerId || lineItems[0].CustomerListID)) || '';
      productCodesFromScans.forEach(productCode => {
        if (existingProductCodes.has(productCode)) return;
        const productInfo = getProductInfo({ product_code: productCode });
        const scannedShipped = getScannedQty(orderNum, productInfo.productCode || productCode, 'out', null);
        const scannedReturned = getScannedQty(orderNum, productInfo.productCode || productCode, 'in', null);
        if (scannedShipped === 0 && scannedReturned === 0) return;
        baseItems.push({
          product_code: productCode,
          productInfo,
          shipped: 0,
          returned: 0,
          order_number: orderNum,
          customer_name: augCustomerName,
          customer_id: augCustomerId,
          CustomerListID: augCustomerId,
          highlight: getHighlightInfo({ qty_out: scannedShipped, qty_in: scannedReturned }, productInfo)
        });
      });
    }
    return baseItems;
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
    // Try rows array first (main case for imports)
    if (data.rows && Array.isArray(data.rows)) {
      logger.debug('Found rows array with length:', data.rows.length);
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
    
    logger.debug('No line items found, returning empty array');
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
      
      logger.debug('🔍 Auto-verifying order:', { orderNumber, customerName, customerId });
      
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
      
      logger.debug('📦 Found scanned data:', scannedData?.length || 0);
      
      // Process each scanned item
      for (const scan of scannedData || []) {
        const barcode = scan.bottle_barcode || scan.barcode_number;
        const mode = scan.mode;
        
        logger.debug('🔍 Processing scan:', { barcode, mode, customerName });
        
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
      
      logger.debug('✅ Auto-verification completed');
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
      
      const { error: updateError } = await supabase
        .from('bottles')
        .update({
          status: 'rented',
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
      
      logger.debug('✅ Asset assigned to customer:', { barcode, customerName });
      
    } catch (error) {
      logger.error('❌ Error assigning asset:', error);
    }
  };
  
  // Return asset to inventory (in-house/available)
  const returnAssetToInventory = async (barcode, orderNumber, customerId = null) => {
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

      // VALIDATION: Check if asset is on customer balance
      const balanceCheck = await validateReturnBalance(bottle, orderNumber, organization);

      // If asset is NOT on balance, create exception and mark as physically returned only
      if (!balanceCheck.isOnBalance) {
        // Still mark asset as physically returned (status update only)
        // But DO NOT update customer assignment or rental records
        const { error: statusUpdateError } = await supabase
          .from('bottles')
          .update({
            status: 'empty', // Mark as empty when returned
            last_location_update: new Date().toISOString()
            // NOTE: We intentionally do NOT unassign customer or update rental records
            // since the asset was not on balance
          })
          .eq('id', bottle.id);
        
        if (statusUpdateError) {
          logger.error('❌ Error updating bottle status:', statusUpdateError);
        } else {
          logger.debug('✅ Asset marked as physically returned (no balance adjustment)');
        }
        
        return; // Exit early - no balance adjustments made
      }
      
      // NORMAL RETURN FLOW: Asset WAS on balance, proceed with standard return processing
      // Update bottle status to AVAILABLE
      const { error: updateError } = await supabase
        .from('bottles')
        .update({
          status: 'empty', // Mark as empty when returned
          assigned_customer: null,
          customer_id: null,
          rental_start_date: null,
          last_location_update: new Date().toISOString()
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
      
      logger.debug('✅ Asset returned to inventory:', { barcode });
      
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
            Order Verification
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
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
          <SearchInputWithIcon
            placeholder="Search Records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            className="min-w-[300px]"
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
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={() => setRestoreRejectedDialog({ open: true, orderNumber: '', loading: false })}
          >
            Restore rejected scans
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setReassignOrderDialog({ open: true, oldOrder: '', newOrder: '', customerPattern: '', loading: false })}
          >
            Reassign order number
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
      {visibleSelectedRecords.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'action.selected' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2">
              {visibleSelectedRecords.length} record(s) selected
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
            logger.debug('Verification completed:', data);
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
        maxWidth="xl"
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
                                .select('*')
                                .eq('barcode_number', barcode)
                                .eq('organization_id', organization.id)
                                .limit(1)
                                .maybeSingle();
                              
                              if (bottleData) {
                                // Bottle exists, open edit dialog
                                setEditBottleDialog({
                                  open: true,
                                  bottle: bottleData,
                                  barcode: null,
                                  isNew: false
                                });
                              } else {
                                // Bottle doesn't exist, open create dialog
                                setEditBottleDialog({
                                  open: true,
                                  bottle: null,
                                  barcode: barcode,
                                  isNew: true
                                });
                              }
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
                      <TableCell><strong>Actions</strong></TableCell>
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
                              {bottle.customer_name || (bottle.assigned_customer && customerIdToName[String(bottle.assigned_customer)]) || (bottle.assigned_customer ? 'Assigned' : 'Available')}
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
                        <TableCell>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setEditBottleDialog({
                              open: true,
                              bottle: bottle,
                              barcode: null,
                              isNew: false
                            })}
                            title="Edit bottle"
                          >
                            <EditIcon />
                          </IconButton>
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

      {/* Edit/Create Bottle Dialog */}
      <EditBottleDialog
        open={editBottleDialog.open}
        bottle={editBottleDialog.bottle}
        barcode={editBottleDialog.barcode}
        isNew={editBottleDialog.isNew}
        organizationId={organization?.id}
        onClose={() => setEditBottleDialog({ open: false, bottle: null, barcode: null, isNew: false })}
        onSave={async (bottleData) => {
          try {
            if (editBottleDialog.isNew) {
              // Create new bottle
              const { error } = await supabase
                .from('bottles')
                .insert([{
                  ...bottleData,
                  organization_id: organization.id,
                  barcode_number: editBottleDialog.barcode,
                  status: bottleData.status || 'available'
                }]);
              
              if (error) throw error;
              setSnackbar('Bottle created successfully');
            } else {
              // Update existing bottle
              const { error } = await supabase
                .from('bottles')
                .update(bottleData)
                .eq('id', editBottleDialog.bottle.id);
              
              if (error) throw error;
              setSnackbar('Bottle updated successfully');
            }
            
            // Refresh bottle info dialog
            if (bottleInfoDialog.orderNumber) {
              await fetchBottleInfoForOrder(bottleInfoDialog.orderNumber, bottleInfoDialog.customerFilter || null);
            }
            
            setEditBottleDialog({ open: false, bottle: null, barcode: null, isNew: false });
          } catch (error) {
            logger.error('Error saving bottle:', error);
            setSnackbar(`Failed to save bottle: ${error.message}`);
          }
        }}
      />

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

      {/* Restore rejected scans dialog */}
      <Dialog
        open={restoreRejectedDialog.open}
        onClose={() => !restoreRejectedDialog.loading && setRestoreRejectedDialog({ open: false, orderNumber: '', loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restore rejected scans</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the order number for scans you rejected by accident. They will show again in Order Verification. (Note: bottle_scans for that order were removed when rejected; data will come from the scans table.)
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Order number"
            value={restoreRejectedDialog.orderNumber}
            onChange={(e) => setRestoreRejectedDialog(prev => ({ ...prev, orderNumber: e.target.value }))}
            placeholder="e.g. S47658 or 71896"
            disabled={restoreRejectedDialog.loading}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRestoreRejectedDialog({ open: false, orderNumber: '', loading: false })}
            disabled={restoreRejectedDialog.loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmRestoreRejectedScans}
            disabled={restoreRejectedDialog.loading || !restoreRejectedDialog.orderNumber.trim()}
          >
            {restoreRejectedDialog.loading ? 'Restoring…' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign order number dialog */}
      <Dialog
        open={reassignOrderDialog.open}
        onClose={() => !reassignOrderDialog.loading && setReassignOrderDialog({ open: false, oldOrder: '', newOrder: '', customerPattern: '', loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reassign order number</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Move scans from one order number to another. Use &quot;Only for customer&quot; to move just one customer&apos;s scans (e.g. %industrial machine% or %800005BE%).
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Current order number"
            value={reassignOrderDialog.oldOrder}
            onChange={(e) => setReassignOrderDialog(prev => ({ ...prev, oldOrder: e.target.value }))}
            placeholder="e.g. S47658"
            disabled={reassignOrderDialog.loading}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Reassign to order number"
            value={reassignOrderDialog.newOrder}
            onChange={(e) => setReassignOrderDialog(prev => ({ ...prev, newOrder: e.target.value }))}
            placeholder="e.g. 71671A"
            disabled={reassignOrderDialog.loading}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Only for customer (optional)"
            value={reassignOrderDialog.customerPattern}
            onChange={(e) => setReassignOrderDialog(prev => ({ ...prev, customerPattern: e.target.value }))}
            placeholder="e.g. %industrial machine% or leave blank for all"
            disabled={reassignOrderDialog.loading}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setReassignOrderDialog({ open: false, oldOrder: '', newOrder: '', customerPattern: '', loading: false })}
            disabled={reassignOrderDialog.loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmReassignOrderNumber}
            disabled={reassignOrderDialog.loading || !reassignOrderDialog.oldOrder.trim() || !reassignOrderDialog.newOrder.trim()}
          >
            {reassignOrderDialog.loading ? 'Reassigning…' : 'Reassign'}
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
            Are you sure you want to {bulkActionDialog.action?.label?.toLowerCase()} {visibleSelectedRecords.length} selected record(s)?
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
                const recordCount = visibleSelectedRecords.length;
                
                if (actionId === 'bulk_investigate') {
                  const recordsToInvestigate = filteredInvoices.filter(invoice => 
                    visibleSelectedRecords.includes(invoice.id) && 
                    !(typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'))
                  );
                  await handleBulkInvestigate(recordsToInvestigate);
                } else if (actionId === 'bulk_export') {
                  const recordsToExport = filteredInvoices.filter(invoice => 
                    visibleSelectedRecords.includes(invoice.id) && 
                    !(typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'))
                  );
                  await handleBulkExport(recordsToExport);
                } else if (actionId === 'bulk_reject') {
                  const recordsToReject = filteredInvoices.filter(invoice => 
                    visibleSelectedRecords.includes(invoice.id)
                  );
                  await handleBulkReject(recordsToReject);
                } else {
                  logger.debug('Unknown bulk action:', actionId);
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
                const { type, record } = confirmationDialog;
                if (confirmationDialog.action === 'approve') {
                  setConfirmationDialog({ open: false, action: null, record: null, type: null });
                  setLoading(false);
                  const orderNumber = record.data?.order_number ?? record.data?.reference_number;
                  const normalizeON = (n) => {
                    if (n == null || n === '') return '';
                    const s = String(n).trim();
                    return /^\d+$/.test(s) ? (s.replace(/^0+/, '') || '0') : s;
                  };
                  const normTarget = normalizeON(orderNumber);
                  // Remove ALL records for this order number (including duplicates from re-imports)
                  const matchesOrder = (inv) => {
                    const on = inv.data?.order_number ?? inv.data?.reference_number;
                    return normTarget && normalizeON(on) === normTarget;
                  };
                  setPendingInvoices(prev => prev.filter(inv => !matchesOrder(inv)));
                  setPendingReceipts(prev => prev.filter(r => !matchesOrder(r)));
                  setSnackbar('Approving record…');
                  confirmApprove(type, record);
                  return;
                } else if (confirmationDialog.action === 'reject') {
                  setConfirmationDialog({ open: false, action: null, record: null, type: null });
                  setLoading(false);
                  if (type === 'invoice') {
                    setPendingInvoices(prev => prev.filter(r => r.id !== record.id && r.originalId !== record.id));
                  } else {
                    setPendingReceipts(prev => prev.filter(r => r.id !== record.id && r.originalId !== record.id));
                  }
                  setSnackbar('Rejecting record…');
                  confirmReject(type, record);
                  return;
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
        <DialogTitle>Order Verification Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography color="text.secondary">No additional settings.</Typography>
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
      <PortalSnackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ marginTop: '80px' }}
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
        {sortedFilteredInvoices.map(invoice => {
          const data = parseDataField(invoice.data);
          const orderNum = String(getOrderNumber(data)).trim();
          const customerInfo = getCustomerInfo(data);
          const customerId = getCustomerId(data);
          const recordDate = getRecordDate(data);
          
          // Only show line items that match this card's order AND customer (same logic as detail page)
          const allDetailedItems = getDetailedLineItems(data);
          const normOrd = (v) => (v != null && v !== '') ? String(v).trim() : '';
          const cardCustomerName = (customerInfo || '').toString().trim();
          const cardCustomerId = (customerId != null && customerId !== '') ? String(customerId).trim() : '';
          const detailedItems = allDetailedItems.filter(item => {
            const itemOrder = item.order_number ?? item.reference_number ?? item.invoice_number ?? item.InvoiceNumber ?? item.ReferenceNumber ?? '';
            const o = normOrd(itemOrder);
            const orderMatch = !orderNum || o === '' || o === orderNum;
            const itemCustomerName = (item.customer_name ?? item.customerName ?? '').toString().trim();
            const itemCustomerId = (item.customer_id ?? item.customerId ?? '').toString().trim();
            const customerMatch = !cardCustomerName && !cardCustomerId ||
              (cardCustomerName && itemCustomerName === cardCustomerName) ||
              (cardCustomerId && itemCustomerId === cardCustomerId);
            return orderMatch && customerMatch;
          });
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
                        logger.debug('Customer click - Name:', customerInfo, 'ID:', customerId, 'Data:', data);
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
                    <Badge
                      badgeContent="!"
                      color="error"
                      invisible={!ordersWithBottlesAtCustomers.has(orderNum)}
                      overlap="rectangular"
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      sx={{
                        '& .MuiBadge-badge': {
                          right: 4,
                          top: 4,
                          minWidth: 18,
                          height: 18,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '0 4px',
                          borderRadius: '50%',
                          border: '2px solid white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          zIndex: 1
                        }
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<InventoryIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          logger.debug('View Bottles clicked for order:', orderNum);
                          logger.debug('Orders with bottles at customers:', Array.from(ordersWithBottlesAtCustomers));
                          logger.debug('Has bottles at customers?', ordersWithBottlesAtCustomers.has(orderNum));
                          if (orderNum) {
                            handleViewBottles(orderNum, invoice);
                          } else {
                            setError('Order number not found');
                          }
                        }}
                      >
                        View Bottles
                      </Button>
                    </Badge>
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
                    
                    // Use getScannedQty so card counts match detail page; pass invoice so scanned-only cards filter by customer
                    const invoiceForCount = invoice;
                    const scannedOut = getScannedQty(orderNum, item.productInfo.productCode, 'out', invoiceForCount);
                    const scannedIn = getScannedQty(orderNum, item.productInfo.productCode, 'in', invoiceForCount);
                    if (isScannedOnlyRecord) {
                      logger.debug(`📊 Scanned-only record display: orderNum=${orderNum}, productCode=${item.productInfo.productCode}, scannedOut=${scannedOut}, scannedIn=${scannedIn}`);
                    }
                    
                    const shipped = isScannedOnlyRecord ? 0 : (item.shipped || 0);
                    const returned = isScannedOnlyRecord ? 0 : (item.returned || 0);
                    const shippedMismatch = shipped !== scannedOut;
                    const returnedMismatch = returned !== scannedIn;
                    // DNS = Delivered Not Scanned: only when user has verified/approved the order without scanned bottles (inv > 0, trk = 0). Do NOT show for "invoice imported before scanning" – that is pending scan, not DNS.
                    const isVerifiedOrApproved = determineVerificationStatus(invoice) === 'VERIFIED' || invoice.status === 'approved' || invoice.status === 'verified';
                    const isDNS = !isScannedOnlyRecord && hasInvoiceData && shipped > 0 && scannedOut === 0 && isVerifiedOrApproved;
                    
                    return (
                      <Paper 
                        key={itemIndex}
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          border: isDNS ? '2px solid #ed6c02' : '1px solid #f0f0f0',
                          borderRadius: 1,
                          backgroundColor: isDNS ? '#fff4e5' : '#fafafa',
                          '&:hover': {
                            backgroundColor: isDNS ? '#ffecd2' : '#f5f5f5',
                            borderColor: isDNS ? '#ed6c02' : '#e0e0e0'
                          }
                        }}
                      >
                        {isDNS && (
                          <Chip 
                            label="DNS (Delivered Not Scanned)" 
                            size="small" 
                            color="warning" 
                            sx={{ mb: 1.5, fontWeight: 600 }}
                          />
                        )}
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
                                  <Typography 
                                    variant="body2" 
                                    color={!hasInvoiceData ? 'text.secondary' : (shippedMismatch ? 'error.main' : 'success.main')}
                                    fontWeight={600}
                                  >
                                    Trk: {scannedOut}
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    color={!hasInvoiceData ? 'text.secondary' : (shippedMismatch ? 'error.main' : 'success.main')}
                                    fontWeight={600}
                                  >
                                    Inv: {!hasInvoiceData ? '?' : shipped}
                                  </Typography>
                                  {isDNS && (
                                    <Typography variant="caption" color="warning.main" fontWeight={600} sx={{ mt: 0.5 }}>
                                      Customer charged rental
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Box sx={{ textAlign: 'center', minWidth: '60px' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  RTN
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  <Typography 
                                    variant="body2" 
                                    color={!hasInvoiceData ? 'text.secondary' : (returnedMismatch ? 'error.main' : 'success.main')}
                                    fontWeight={600}
                                  >
                                    Trk: {scannedIn}
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    color={!hasInvoiceData ? 'text.secondary' : (returnedMismatch ? 'error.main' : 'success.main')}
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
    logger.debug('renderInvoicesGrid called with filteredInvoices:', filteredInvoices);
    
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
        {sortedFilteredInvoices.map((invoice) => {
          const data = parseDataField(invoice.data);
          const detailedItems = getDetailedLineItems(data);
          const orderNum = String(getOrderNumber(data)).trim();
          const customerInfo = getCustomerInfo(data);
          const customerId = getCustomerId(data);
          const recordDate = getRecordDate(data);
          const status = determineVerificationStatus(invoice);
          
          logger.debug('Processing invoice:', { 
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
                        logger.debug('Grid customer click - Info:', customerInfo, 'ID:', customerId, 'Data:', data);
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
                    {detailedItems.slice(0, 3).map((item, index) => {
                      // Get scanned quantities (pass invoice so scanned-only cards filter by customer)
                      const isScannedOnlyRecord = invoice.is_scanned_only || (typeof invoice.id === 'string' && invoice.id.startsWith('scanned_'));
                      const invoiceForCount = invoice;
                      const scannedOut = getScannedQty(orderNum, item.productInfo.productCode, 'out', invoiceForCount);
                      const scannedIn = getScannedQty(orderNum, item.productInfo.productCode, 'in', invoiceForCount);
                      const shipped = isScannedOnlyRecord ? 0 : (item.shipped || 0);
                      const returned = isScannedOnlyRecord ? 0 : (item.returned || 0);
                      
                      return (
                        <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" display="block" fontWeight={600}>
                            {item.productInfo.productCode || item.barcode || '-'}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Cat: {item.productInfo.category || '-'} | 
                            Grp: {item.productInfo.group || '-'} | 
                            Type: {item.productInfo.type || '-'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="primary">
                              SHP: {shipped}
                              <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                (Trk: {scannedOut})
                              </Typography>
                            </Typography>
                            <Typography variant="caption" color="primary">
                              RTN: {returned}
                              <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                (Trk: {scannedIn})
                              </Typography>
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                    {detailedItems.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{detailedItems.length - 3} more items...
                      </Typography>
                    )}
                  </Box>
                  
                  {/* Quantity Display */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                    <QuantityDiscrepancyDetector 
                      orderNumber={orderNum}
                      customerId={customerId}
                      organizationId={invoice.organization_id || organization?.id}
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
                    <Badge
                      badgeContent="!"
                      color="error"
                      invisible={!ordersWithBottlesAtCustomers.has(orderNum)}
                      overlap="rectangular"
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      sx={{
                        '& .MuiBadge-badge': {
                          right: 4,
                          top: 4,
                          minWidth: 18,
                          height: 18,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '0 4px',
                          borderRadius: '50%',
                          border: '2px solid white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          zIndex: 1,
                          position: 'absolute'
                        }
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<InventoryIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          logger.debug('View Bottles clicked for order:', orderNum);
                          logger.debug('Orders with bottles at customers:', Array.from(ordersWithBottlesAtCustomers));
                          logger.debug('Has bottles at customers?', ordersWithBottlesAtCustomers.has(orderNum));
                          if (orderNum) {
                            handleViewBottles(orderNum, invoice);
                          } else {
                            setError('Order number not found');
                          }
                        }}
                        sx={{ position: 'relative' }}
                      >
                        View Bottles
                      </Button>
                    </Badge>
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
    
    return (
      <Box>
        {sortedFilteredInvoices.map((invoice, index) => {
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
                {index < sortedFilteredInvoices.length - 1 && (
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
                  <Typography variant="caption" color="text.secondary" title="Scan time (local)">
                    {formatDate(invoice.created_at)}
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
                    organizationId={invoice.organization_id || organization?.id}
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
        {sortedFilteredReceipts.map((receipt) => {
          const data = parseDataField(receipt.data);
          const detailedItems = getDetailedLineItems(data);
          const orderNum = String(getOrderNumber(data)).trim();
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
    return (
      <Box>
        {sortedFilteredReceipts.map((receipt, index) => {
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
                {index < sortedFilteredReceipts.length - 1 && (
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
                  <Typography variant="caption" color="text.secondary" title="Scan time (local)">
                    {formatDate(receipt.created_at)}
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
                      logger.debug('Receipt customer click - Info:', customerInfo, 'ID:', customerId, 'Data:', data);
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
        logger.debug('🔍 Approving scanned-only record:', row.id);
        
        const orderNumber = row.id.replace('scanned_', '');
        
        // Mark all scans in scans table for this order as approved/verified
        logger.debug(`🔄 Updating scans table for order ${orderNumber}, org: ${organization?.id}`);
        
        // First, check if there are any scans to update
        const { data: existingScans, error: checkError } = await supabase
          .from('scans')
          .select('id')
          .eq('order_number', orderNumber)
          .eq('organization_id', organization?.id);
        
        if (checkError) {
          logger.error('❌ Error checking scans:', checkError);
        } else {
          logger.debug(`📋 Found ${existingScans?.length || 0} scans in scans table for order ${orderNumber}`);
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
            logger.debug(`✅ Marked ${updatedScans?.length || 0} scans as approved for order ${orderNumber}`, updatedScans);
          }
        } else {
          logger.debug(`ℹ️ No scans in scans table for order ${orderNumber} - this is a bottle_scans-only record`);
        }
        
        // For scanned-only records, assign bottles to customers FIRST
        // We need to do this BEFORE updating scans because assignBottlesToCustomer relies on those records
        logger.debug(`🔄 Assigning bottles to customer for order ${orderNumber}`);
        await assignBottlesToCustomer(row);
        
        // DON'T delete bottle_scans - keep them for history/verification
        // The scans table status='approved' is used to filter them out from showing as new orders
        // This allows verified orders to display the bottles that were scanned
        logger.debug(`✅ Keeping bottle_scans for order ${orderNumber} for history/verification purposes`);
        
        setSnackbar('Scanned record approved and bottles assigned to customers');
        return;
      }
      
      const tableName = type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts';
      
      // Use originalId for split records, otherwise use id
      const recordId = row.originalId || row.id;
      const orderNumber = row.data?.order_number || row.data?.reference_number;
      
      logger.debug('🔍 Record details for approval:', {
        rowId: row.id,
        originalId: row.originalId,
        recordId: recordId,
        orderNumber,
        type: type,
        tableName: tableName
      });
      
      if (!recordId || (typeof recordId === 'string' && recordId.startsWith('scanned_'))) {
        logger.error('❌ Invalid record ID:', recordId);
        throw new Error('Invalid record ID for database update');
      }
      
      // Per-order verification: one import row can contain many orders; only mark THIS order as verified
      const { data: existingRow, error: fetchError } = await supabase
        .from(tableName)
        .select('id, data, status')
        .eq('id', recordId)
        .single();
      
      if (fetchError || !existingRow) {
        logger.error('❌ Failed to fetch record for per-order update:', fetchError);
        throw new Error('Failed to load record for approval');
      }
      
      const existingData = typeof existingRow.data === 'string' ? JSON.parse(existingRow.data || '{}') : (existingRow.data || {});
      const verifiedOrderNumbers = Array.isArray(existingData.verified_order_numbers) ? [...existingData.verified_order_numbers] : [];
      
      if (orderNumber && !verifiedOrderNumbers.includes(orderNumber)) {
        verifiedOrderNumbers.push(orderNumber);
      }
      
      const rows = existingData.rows || [];
      const distinctOrderNumbers = [...new Set(rows.map(r => r.reference_number || r.order_number || r.invoice_number || r.sales_receipt_number).filter(Boolean))];
      const allOrdersVerified = distinctOrderNumbers.length > 0 && distinctOrderNumbers.every(on => verifiedOrderNumbers.includes(on));
      
      const newData = { ...existingData, verified_order_numbers: verifiedOrderNumbers };
      const updatePayload = allOrdersVerified
        ? { data: newData, status: 'approved', approved_at: new Date().toISOString() }
        : { data: newData };
      
      logger.debug('🔍 Per-order approval:', { orderNumber, verifiedOrderNumbers, distinctOrderNumbers, allOrdersVerified });
      
      const { data: updateResult, error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq('id', recordId)
        .select();
      
      if (error) {
        logger.error('❌ Error approving record:', error);
        throw new Error(`Failed to approve: ${error.message}`);
      }
      
      if (!updateResult || updateResult.length === 0) {
        logger.error('❌ No records were updated! Check if ID exists:', recordId);
        throw new Error(`No records were updated. Record with ID ${recordId} may not exist.`);
      }
      
      logger.debug('✅ Order approved successfully (per-order verification)');

      const normalizeOrderNum = (num) => {
        if (num == null || num === '') return '';
        const s = String(num).trim();
        if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
        return s;
      };

      // Also approve ALL other duplicate import records for the same order number (from re-imports).
      // Without this, duplicate pending records keep reappearing after verification.
      if (orderNumber && organization?.id) {
        const targetNorm = normalizeOrderNum(orderNumber);
        if (targetNorm) {
          for (const tbl of ['imported_invoices', 'imported_sales_receipts']) {
            const { data: allRecords } = await supabase
              .from(tbl)
              .select('id, data, status')
              .eq('organization_id', organization.id)
              .neq('status', 'approved')
              .neq('status', 'verified')
              .neq('status', 'rejected');
            if (allRecords && allRecords.length > 0) {
              const duplicateIds = allRecords.filter(rec => {
                if (rec.id === recordId) return false;
                const d = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
                if (!d) return false;
                const rows = d.rows || [];
                const orderNums = rows.map(r => normalizeOrderNum(r.reference_number || r.order_number || r.invoice_number || r.sales_receipt_number));
                const topOrder = normalizeOrderNum(d.order_number || d.reference_number || d.invoice_number || d.summary?.reference_number);
                return orderNums.includes(targetNorm) || topOrder === targetNorm;
              }).map(rec => rec.id);
              if (duplicateIds.length > 0) {
                const { error: dupErr } = await supabase
                  .from(tbl)
                  .update({ status: 'approved', approved_at: new Date().toISOString() })
                  .in('id', duplicateIds);
                if (dupErr) {
                  logger.warn(`Could not mark ${duplicateIds.length} duplicate ${tbl} record(s) as approved:`, dupErr);
                } else {
                  logger.debug(`Marked ${duplicateIds.length} duplicate ${tbl} record(s) for order ${orderNumber} as approved`);
                }
              }
            }
          }

          // Mark scans for this order as approved so it doesn't reappear as a scanned-only card
          const { data: orgScans, error: fetchErr } = await supabase
            .from('scans')
            .select('id, order_number')
            .eq('organization_id', organization.id)
            .not('order_number', 'is', null);
          if (!fetchErr && orgScans && orgScans.length > 0) {
            const idsToUpdate = orgScans
              .filter(s => normalizeOrderNum(s.order_number) === targetNorm)
              .map(s => s.id);
            if (idsToUpdate.length > 0) {
              const { error: scanUpdateErr } = await supabase
                .from('scans')
                .update({ status: 'approved' })
                .in('id', idsToUpdate);
              if (scanUpdateErr) {
                logger.warn('Could not mark scans as approved:', scanUpdateErr);
              } else {
                logger.debug(`Marked ${idsToUpdate.length} scan(s) as approved for order ${targetNorm}`);
              }
            }
          }
        }
      }

      // Assign bottles to customers after approval
      await assignBottlesToCustomer(row);
      
      setSnackbar('Record approved successfully and bottles assigned to customers');
      await fetchData();
    } catch (error) {
      logger.error('❌ Failed to approve record:', error);
      setError('Failed to approve record: ' + error.message);
      setSnackbar('Failed to approve record: ' + error.message);
      await fetchData();
    }
  }

  async function confirmReject(type, row) {
    try {
      // Handle scanned-only records
      if (typeof row.id === 'string' && row.id.startsWith('scanned_')) {
        const data = parseDataField(row?.data);
        const orderNumber = data?.order_number || data?.rows?.[0]?.order_number || (() => {
          const s = (row.id || '').replace(/^scanned_/, '');
          const i = s.indexOf('_');
          return i >= 0 ? s.slice(0, i) : s;
        })();
        if (!orderNumber) {
          setSnackbar('Could not determine order number for this record');
          return;
        }
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        // Revert bottles that were marked empty when return was scanned (before we reject)
        if (organization?.id) {
          await revertBottlesForRejectedReturn(orderNumber, organization.id);
        }
        
        // Mark all scans for this order as rejected in scans table (scope by org)
        const { error: scanError } = await supabase
          .from('scans')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: currentUser.id
          })
          .eq('order_number', orderNumber)
          .eq('organization_id', organization.id);
        
        if (scanError) throw scanError;
        
        // Delete bottle_scans for this order (scope by org; table has no status column)
        const { error: bottleScanError } = await supabase
          .from('bottle_scans')
          .delete()
          .eq('order_number', orderNumber)
          .eq('organization_id', organization.id);
        
        if (bottleScanError) {
          logger.error('Error deleting bottle_scans:', bottleScanError);
        }
        
        setSnackbar('Scanned records rejected successfully');
        return;
      }
      
      // Handle regular imported records - revert bottles for return scans in this import
      const data = parseDataField(row.data);
      const orderNumber = data?.order_number || data?.reference_number || data?.invoice_number;
      if (orderNumber && organization?.id) {
        await revertBottlesForRejectedReturn(orderNumber, organization.id);
      }
      
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
    } catch (error) {
      setError('Failed to reject record: ' + error.message);
      setSnackbar('Failed to reject record: ' + error.message);
      await fetchData();
    }
  }

  // Restore accidentally rejected scans (scanned-only): set status back to pending so they show in Order Verification again.
  // Note: bottle_scans rows for this order were deleted on reject and are not recreated; data will come from scans table.
  async function confirmRestoreRejectedScans() {
    const orderNumber = (restoreRejectedDialog.orderNumber || '').toString().trim();
    if (!orderNumber || !organization?.id) {
      setSnackbar('Please enter an order number.');
      return;
    }
    setRestoreRejectedDialog(prev => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase
        .from('scans')
        .update({
          status: 'pending',
          rejected_at: null,
          rejected_by: null
        })
        .eq('order_number', orderNumber)
        .eq('organization_id', organization.id)
        .select('id');
      if (error) throw error;
      const count = data?.length ?? 0;
      setRestoreRejectedDialog({ open: false, orderNumber: '', loading: false });
      setSnackbar(count > 0 ? `Restored ${count} scan(s) for order ${orderNumber}. Refresh to see them.` : `No rejected scans found for order ${orderNumber}.`);
      await fetchData();
    } catch (err) {
      logger.error('Restore rejected scans failed:', err);
      setSnackbar('Failed to restore: ' + (err?.message || err));
      setRestoreRejectedDialog(prev => ({ ...prev, loading: false }));
    }
  }

  // Reassign scans from one order number to another (optionally only for a customer pattern, e.g. Industrial Machine).
  async function confirmReassignOrderNumber() {
    const oldOrder = (reassignOrderDialog.oldOrder || '').toString().trim();
    const newOrder = (reassignOrderDialog.newOrder || '').toString().trim();
    const customerPattern = (reassignOrderDialog.customerPattern || '').toString().trim() || null;
    if (!oldOrder || !newOrder || !organization?.id) {
      setSnackbar('Please enter both old and new order numbers.');
      return;
    }
    setReassignOrderDialog(prev => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.rpc('update_scans_order_number_for_customer', {
        p_old_order: oldOrder,
        p_new_order: newOrder,
        p_org_id: organization.id,
        p_customer_pattern: customerPattern
      });
      if (error) throw error;
      if (data && !data.ok) {
        setSnackbar(data.error || 'Reassign failed');
        setReassignOrderDialog(prev => ({ ...prev, loading: false }));
        return;
      }
      const scansCount = data?.scans_updated ?? 0;
      const bottleCount = data?.bottle_scans_updated ?? 0;
      setReassignOrderDialog({ open: false, oldOrder: '', newOrder: '', customerPattern: '', loading: false });
      setSnackbar(`Reassigned ${scansCount} scan(s) and ${bottleCount} bottle_scan(s) from ${oldOrder} to ${newOrder}.`);
      await fetchData();
    } catch (err) {
      logger.error('Reassign order number failed:', err);
      setSnackbar('Failed to reassign: ' + (err?.message || err));
      setReassignOrderDialog(prev => ({ ...prev, loading: false }));
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
        logger.debug('No order number found for quantity check');
        return false;
      }

      // Get scanned quantities for this order
      const { data: scannedData, error: scannedError } = await supabase
        .from('scans')
        .select('id, barcode_number, order_number, "mode", action, status, organization_id, customer_name, customer_id, product_code, created_at')
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
          logger.debug(`Quantity mismatch for ${productCode}: Invoice(${invoiceShipped}/${invoiceReturned}) vs Scanned(${scannedQty.shipped}/${scannedQty.returned})`);
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

  // Check bottles at customers for all orders (used to show indicators on buttons)
  // Optimized to batch queries for better performance
  async function checkBottlesAtCustomersForAllOrders(records) {
    try {
      const ordersWithBottles = new Set();
      
      if (!records || records.length === 0) {
        setOrdersWithBottlesAtCustomers(ordersWithBottles);
        return;
      }
      
      // Extract all unique order numbers first
      const orderNumbers = new Set();
      records.forEach(record => {
        const data = parseDataField(record.data);
        const orderNumber = getOrderNumber(data);
        if (orderNumber) {
          orderNumbers.add(String(orderNumber).trim());
        }
      });
      
      if (orderNumbers.size === 0) {
        setOrdersWithBottlesAtCustomers(ordersWithBottles);
        return;
      }
      
      logger.debug('🔍 Checking bottles at customers for', orderNumbers.size, 'orders...');
      
      // Get all scanned barcodes for all orders at once (more efficient)
      // Need to handle both string and number formats for order numbers
      const orderNumbersArray = Array.from(orderNumbers);
      const orderNumbersNumeric = orderNumbersArray
        .map(on => {
          const num = parseInt(on, 10);
          return isNaN(num) ? null : num;
        })
        .filter(Boolean);
      
      // Try both string and number formats
      let allScans = [];
      let allBottleScans = [];
      
      // Query with string order numbers
      if (orderNumbersArray.length > 0) {
        const { data: scansStr } = await supabase
          .from('scans')
          .select('barcode_number, order_number')
          .in('order_number', orderNumbersArray)
          .eq('organization_id', organization?.id)
          .or('"mode".eq.SHIP,"mode".eq.delivery,action.eq.out');
        
        if (scansStr) allScans = scansStr;
        
        const { data: bottleScansStr } = await supabase
          .from('bottle_scans')
          .select('bottle_barcode, order_number')
          .in('order_number', orderNumbersArray);
        
        if (bottleScansStr) allBottleScans = bottleScansStr;
      }
      
      // Also try with numeric order numbers if we have any
      if (orderNumbersNumeric.length > 0) {
        const { data: scansNum } = await supabase
          .from('scans')
          .select('barcode_number, order_number')
          .in('order_number', orderNumbersNumeric)
          .eq('organization_id', organization?.id)
          .or('"mode".eq.SHIP,"mode".eq.delivery,action.eq.out');
        
        if (scansNum) {
          // Merge with existing scans, avoiding duplicates
          const existingOrderNums = new Set(allScans.map(s => String(s.order_number).trim()));
          scansNum.forEach(scan => {
            const orderNum = String(scan.order_number).trim();
            if (!existingOrderNums.has(orderNum)) {
              allScans.push(scan);
              existingOrderNums.add(orderNum);
            }
          });
        }
        
        const { data: bottleScansNum } = await supabase
          .from('bottle_scans')
          .select('bottle_barcode, order_number')
          .in('order_number', orderNumbersNumeric);
        
        if (bottleScansNum) {
          // Merge with existing bottle scans, avoiding duplicates
          const existingOrderNums = new Set(allBottleScans.map(bs => String(bs.order_number).trim()));
          bottleScansNum.forEach(scan => {
            const orderNum = String(scan.order_number).trim();
            if (!existingOrderNums.has(orderNum)) {
              allBottleScans.push(scan);
              existingOrderNums.add(orderNum);
            }
          });
        }
      }
      
      // Group barcodes by order number
      const barcodesByOrder = new Map();
      (allScans || []).forEach(scan => {
        if (scan.barcode_number && scan.order_number) {
          const orderNum = String(scan.order_number).trim();
          if (!barcodesByOrder.has(orderNum)) {
            barcodesByOrder.set(orderNum, new Set());
          }
          barcodesByOrder.get(orderNum).add(scan.barcode_number);
        }
      });
      
      (allBottleScans || []).forEach(scan => {
        if (scan.bottle_barcode && scan.order_number) {
          const orderNum = String(scan.order_number).trim();
          if (!barcodesByOrder.has(orderNum)) {
            barcodesByOrder.set(orderNum, new Set());
          }
          barcodesByOrder.get(orderNum).add(scan.bottle_barcode);
        }
      });
      
      // Collect all unique barcodes to check
      const allBarcodes = new Set();
      barcodesByOrder.forEach(barcodes => {
        barcodes.forEach(barcode => allBarcodes.add(barcode));
      });
      
      // Check all bottles at once (batch query)
      // Only flag orders where bottles being shipped are already at customers (warning condition)
      if (allBarcodes.size > 0) {
        const barcodesArray = Array.from(allBarcodes);
        const { data: allBottles } = await supabase
          .from('bottles')
          .select('barcode_number, customer_name, assigned_customer, status')
          .in('barcode_number', barcodesArray)
          .eq('organization_id', organization?.id);
        
        // Create a map of barcodes to customer status
        // Only flag if bottle has a customer assigned (warning: being shipped but already at customer)
        const bottleCustomerMap = new Map();
        (allBottles || []).forEach(bottle => {
          const customerName = bottle.customer_name || bottle.assigned_customer;
          // Only consider it "at customer" if there's actually a customer name assigned
          // Empty strings, null, or undefined mean the bottle is at home/available
          const isAtCustomer = customerName && 
                               customerName !== '' && 
                               customerName !== null && 
                               customerName !== undefined &&
                               String(customerName).trim() !== '';
          bottleCustomerMap.set(bottle.barcode_number, isAtCustomer);
        });
        
        // Check each order to see if any bottles being shipped are already at customers
        // This is the warning condition: shipping bottles that are already assigned to customers
        barcodesByOrder.forEach((barcodes, orderNum) => {
          for (const barcode of barcodes) {
            if (bottleCustomerMap.get(barcode) === true) {
              ordersWithBottles.add(orderNum);
              break; // Found at least one warning condition, no need to check more for this order
            }
          }
        });
      }
      
      setOrdersWithBottlesAtCustomers(ordersWithBottles);
      logger.debug('✅ Checked bottles at customers for all orders. Found', ordersWithBottles.size, 'orders with bottles at customers:', Array.from(ordersWithBottles));
    } catch (error) {
      logger.error('Error checking bottles at customers for all orders:', error);
      // Set empty set on error so UI doesn't break
      setOrdersWithBottlesAtCustomers(new Set());
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
        .or('"mode".eq.SHIP,"mode".eq.delivery,action.eq.out');
      
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
        logger.debug(`❌ Not auto-approving record ${record.id} - quantities don't match`);
        return false;
      }
      
      // Check if any bottles are currently at customers (not home)
      const { hasBottlesAtCustomers, bottlesAtCustomers } = await checkBottlesAtCustomers(record);
      
      if (hasBottlesAtCustomers) {
        logger.debug(`⚠️ Not auto-approving record ${record.id} - bottles are at customers:`, bottlesAtCustomers);
        return false; // Require manual verification when bottles are at customers
      }
      
      // Quantities match AND all bottles are at home - safe to auto-approve
      logger.debug(`✅ Auto-approving record ${record.id} - quantities match and all bottles are at home`);
      
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

  // Collect SHIP and RETURN barcodes for a given order from scans + bottle_scans tables (and optionally from record rows)
  async function collectBarcodesForOrder(orderNumber, recordRows = null) {
    const shippedBarcodes = new Set();
    const returnedBarcodes = new Set();

    const normalizeOrderNum = (num) => {
      if (num == null || num === '') return '';
      const s = String(num).trim();
      if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
      return s;
    };

    const isDelivered = (mode, action) => {
      const modeUpper = (mode || '').toString().toUpperCase();
      const actionLower = (action || '').toString().toLowerCase();
      if (modeUpper === 'SHIP' || modeUpper === 'DELIVERY') return true;
      if (modeUpper === 'RETURN' || modeUpper === 'PICKUP') return false;
      if (actionLower === 'out') return true;
      if (actionLower === 'in') return false;
      return true;
    };

    const orderNumStr = String(orderNumber).trim();
    const orderNumNorm = normalizeOrderNum(orderNumStr);
    const orderVariants = [...new Set([orderNumStr, orderNumNorm].filter(Boolean))];

    // Fetch from scans table (match raw or normalized order number so we don't miss return scans)
    if (orderVariants.length > 0) {
      let scansQuery = supabase.from('scans').select('barcode_number, "mode", action').in('order_number', orderVariants);
      if (organization?.id) scansQuery = scansQuery.eq('organization_id', organization.id);
      const { data: scans, error: scansError } = await scansQuery;
      if (scansError) logger.error('Error fetching scans:', scansError);
      if (scans && scans.length > 0) {
        const scanMap = new Map();
        scans.forEach(scan => {
          const barcode = scan.barcode_number;
          if (!barcode) return;
          const isDeliveredScan = isDelivered(scan.mode, scan.action);
          const existing = scanMap.get(barcode);
          if (!existing || (existing.isDelivered && !isDeliveredScan)) {
            scanMap.set(barcode, { mode: scan.mode, action: scan.action, isDelivered: isDeliveredScan });
          }
        });
        scanMap.forEach((scanInfo, barcode) => {
          if (scanInfo.isDelivered) shippedBarcodes.add(barcode);
          else returnedBarcodes.add(barcode);
        });
      }

      // Fetch from bottle_scans table (same order number variants)
      let bottleScansQuery = supabase.from('bottle_scans').select('bottle_barcode, mode').in('order_number', orderVariants);
      if (organization?.id) bottleScansQuery = bottleScansQuery.eq('organization_id', organization.id);
      const { data: bottleScans, error: bottleScansError } = await bottleScansQuery;
      if (bottleScansError) logger.error('Error fetching bottle_scans:', bottleScansError);
      if (bottleScans && bottleScans.length > 0) {
        const bottleScanMap = new Map();
        bottleScans.forEach(scan => {
          const barcode = scan.bottle_barcode;
          if (!barcode) return;
          const isDeliveredScan = isDelivered(scan.mode, null);
          const existing = bottleScanMap.get(barcode);
          if (!existing || (existing.isDelivered && !isDeliveredScan)) {
            bottleScanMap.set(barcode, { mode: scan.mode, isDelivered: isDeliveredScan });
          }
        });
        bottleScanMap.forEach((scanInfo, barcode) => {
          if (scanInfo.isDelivered) shippedBarcodes.add(barcode);
          else returnedBarcodes.add(barcode);
        });
      }
    }

    // Also add return/ship barcodes from the record's rows (e.g. when record was built from scans with barcode + qty_in/qty_out)
    if (recordRows && recordRows.length > 0) {
      recordRows.forEach(row => {
        const barcode = row.barcode || row.barcode_number || row.bottle_barcode;
        if (!barcode) return;
        const bc = String(barcode).trim();
        const qtyIn = parseInt(row.qty_in || row.QtyIn || row.returned || 0, 10);
        const qtyOut = parseInt(row.qty_out || row.shipped || row.quantity || 0, 10);
        const isReturn = row.mode === 'RETURN' || (row.action || '').toString().toLowerCase() === 'in';
        const isShip = row.mode === 'SHIP' || row.mode === 'DELIVERY' || (row.action || '').toString().toLowerCase() === 'out';
        if (qtyIn > 0) {
          for (let i = 0; i < qtyIn; i++) returnedBarcodes.add(bc);
        } else if (isReturn) {
          returnedBarcodes.add(bc);
        }
        if (qtyOut > 0) {
          for (let i = 0; i < qtyOut; i++) shippedBarcodes.add(bc);
        } else if (isShip) {
          shippedBarcodes.add(bc);
        }
      });
    }

    // RETURN takes precedence over SHIP for the same barcode
    returnedBarcodes.forEach(barcode => shippedBarcodes.delete(barcode));

    return { shippedBarcodes, returnedBarcodes };
  }

  // Assign bottles to customers after approval using the transactional RPC
  async function assignBottlesToCustomer(record) {
    try {
      logger.debug('assignBottlesToCustomer called with record:', { id: record.id, is_scanned_only: record.is_scanned_only });

      const data = parseDataField(record.data);
      const rows = data.rows || data.line_items || [];
      const newCustomerName = getCustomerInfo(data);

      let orderNumber = data.order_number || data.reference_number || data.invoice_number;
      if (!orderNumber && typeof record.id === 'string' && record.id.startsWith('scanned_')) {
        orderNumber = record.id.replace('scanned_', '');
      }
      if (!orderNumber && rows.length > 0 && rows[0].order_number) {
        orderNumber = rows[0].order_number;
      }
      if (!orderNumber) throw new Error('No order number found in record');

      // Use CustomerListID from record first so DNS and assignments match Customer Detail page (which queries by customer_id = CustomerListID)
      let newCustomerId = getCustomerId(data) || null;
      if (!newCustomerId && newCustomerName) {
        const { data: customer } = await supabase
          .from('customers')
          .select('CustomerListID')
          .eq('name', newCustomerName)
          .eq('organization_id', organization?.id)
          .limit(1)
          .single();
        if (customer) newCustomerId = customer.CustomerListID;
      }

      const { shippedBarcodes, returnedBarcodes } = await collectBarcodesForOrder(orderNumber, rows);
      logger.debug(`Collected barcodes for order ${orderNumber}: ${shippedBarcodes.size} SHIP, ${returnedBarcodes.size} RETURN`);

      // Try transactional RPC first (does not mark import record - confirmApprove handles that)
      const rpcResult = await bottleAssignmentService.assignBottles({
        organizationId: organization?.id,
        customerId: newCustomerId || newCustomerName,
        customerName: newCustomerName,
        shipBarcodes: Array.from(shippedBarcodes),
        returnBarcodes: Array.from(returnedBarcodes),
        orderNumber: orderNumber,
      });

      if (rpcResult.success) {
        const d = rpcResult.data || {};
        logger.debug(`RPC assignment succeeded: ${d.shipped || 0} shipped, ${d.returned || 0} returned, ${d.skipped || 0} skipped, ${d.created || 0} created`);
        if (d.errors && d.errors.length > 0) {
          logger.warn('RPC assignment warnings:', d.errors);
          setSnackbar(`Bottles assigned (${d.shipped || 0} shipped, ${d.returned || 0} returned). ${d.errors.length} warning(s) - see logs.`);
        }
      } else {
        logger.warn('RPC assignment failed, falling back to inline logic:', rpcResult.error);
        await assignBottlesToCustomerInline(record, newCustomerName, newCustomerId, orderNumber, shippedBarcodes, returnedBarcodes, rows);
      }

      // DNS (Delivered Not Scanned) records are not handled by the RPC
      for (const row of rows) {
        const invShipped = parseInt(row.qty_out || row.shipped || row.quantity || 0, 10);
        if (invShipped <= 0) continue;
        const productCode = (row.product_code || row.bottle_barcode || row.barcode || row.description || 'DNS').toString().trim() || 'DNS';
        const scannedOut = getScannedQty(orderNumber, productCode, 'out', record);
        const dnsCount = Math.max(0, invShipped - scannedOut);
        for (let i = 0; i < dnsCount; i++) {
          await createDNSRentalRecord(record, row, newCustomerName, newCustomerId, orderNumber);
        }
      }
    } catch (error) {
      logger.error('Error assigning bottles to customer:', error);
      setError('Failed to assign bottles: ' + error.message);
    }
  }

  // Fallback inline bottle assignment when the RPC is unavailable
  async function assignBottlesToCustomerInline(record, newCustomerName, newCustomerId, orderNumber, shippedBarcodes, returnedBarcodes, rows) {
    const assignmentWarnings = [];
    const assignmentSuccesses = [];
    const processedBarcodes = new Set();

    for (const barcode of returnedBarcodes) {
      if (processedBarcodes.has(barcode)) continue;
      processedBarcodes.add(barcode);

      const { data: bottles, error: bottleError } = await supabase
        .from('bottles').select('*').eq('barcode_number', barcode).eq('organization_id', organization?.id).limit(1);
      if (bottleError) { logger.error('Error finding bottle:', bottleError); continue; }
      if (!bottles || bottles.length === 0) { assignmentWarnings.push(`Bottle not found: ${barcode}`); continue; }

      const bottle = bottles[0];
      const currentCustomer = bottle.assigned_customer || bottle.customer_name;
      if (!currentCustomer) continue;

      const balanceCheck = await validateReturnBalance(bottle, orderNumber, organization);
      if (!balanceCheck.isOnBalance) {
        await supabase.from('bottles').update({ status: 'empty', last_location_update: new Date().toISOString() }).eq('id', bottle.id);
        assignmentWarnings.push(`Bottle ${bottle.barcode_number} returned but was not on customer balance.`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('bottles')
        .update({
          previous_assigned_customer: bottle.assigned_customer,
          previous_status: bottle.status,
          assigned_customer: null,
          customer_name: null,
          status: 'empty',
          days_at_location: 0,
          last_verified_order: orderNumber,
        })
        .eq('id', bottle.id);
      if (updateError) { assignmentWarnings.push(`Failed to unassign bottle ${bottle.barcode_number}`); continue; }

      assignmentSuccesses.push(`Bottle ${bottle.barcode_number} returned from ${currentCustomer}`);
      await resetDaysAtLocation(bottle.id);

      const { data: activeRentals } = await supabase
        .from('rentals').select('id').eq('bottle_barcode', barcode).eq('organization_id', organization?.id).is('rental_end_date', null).limit(1);
      if (activeRentals?.length > 0) {
        await supabase.from('rentals').update({
          rental_end_date: new Date().toISOString().split('T')[0],
          closed_by_order: orderNumber,
        }).eq('id', activeRentals[0].id);
      }

      // Insert return scan so bottle Movement History shows "Return" from customer (e.g. Prairie Wheel)
      const { error: scanErr } = await supabase.from('scans').insert({
        organization_id: organization?.id,
        barcode_number: bottle.barcode_number,
        location: 'Warehouse',
        mode: 'RETURN',
        action: 'in',
        order_number: orderNumber,
        customer_id: bottle.assigned_customer || null,
        customer_name: bottle.customer_name || null,
        status: 'approved',
      });
      if (scanErr) logger.warn('Return scan insert for history:', scanErr);
    }

    for (const barcode of shippedBarcodes) {
      if (processedBarcodes.has(barcode)) continue;
      processedBarcodes.add(barcode);

      const { data: bottles, error: bottleError } = await supabase
        .from('bottles').select('*').eq('barcode_number', barcode).eq('organization_id', organization?.id).limit(1);
      if (bottleError) { logger.error('Error finding bottle:', bottleError); continue; }
      if (!bottles || bottles.length === 0) { assignmentWarnings.push(`Bottle not found: ${barcode}`); continue; }

      const bottle = bottles[0];
      const currentCustomer = bottle.assigned_customer || bottle.customer_name;
      const isAtHome = !currentCustomer;
      const isSameCustomer = currentCustomer === newCustomerName || currentCustomer === newCustomerId;

      if (isAtHome) {
        const { error: updateError } = await supabase
          .from('bottles')
          .update({
            previous_assigned_customer: bottle.assigned_customer,
            previous_status: bottle.status,
            assigned_customer: newCustomerId || newCustomerName,
            customer_name: newCustomerName,
            status: 'rented',
            rental_start_date: new Date().toISOString().split('T')[0],
            last_verified_order: orderNumber,
          })
          .eq('id', bottle.id);
        if (updateError) { assignmentWarnings.push(`Failed to assign bottle ${bottle.barcode_number}`); continue; }
        assignmentSuccesses.push(`Bottle ${bottle.barcode_number} assigned to ${newCustomerName}`);
        await insertDeliveryScan(bottle.barcode_number, newCustomerName);
        await createRentalRecord(bottle, newCustomerName, newCustomerId, null, orderNumber);
      } else if (isSameCustomer) {
        if (bottle.status !== 'rented') {
          await supabase.from('bottles').update({ status: 'rented', last_verified_order: orderNumber }).eq('id', bottle.id);
          assignmentSuccesses.push(`Bottle ${bottle.barcode_number} status corrected to rented`);
        }
        await createRentalRecord(bottle, newCustomerName, newCustomerId, null, orderNumber);
      } else {
        assignmentWarnings.push(`Bottle ${bottle.barcode_number} already at another customer (${currentCustomer}); not reassigning.`);
      }
    }

    // Fallback: process import rows for items without scan barcodes
    for (const row of rows) {
      if (row.qty_out > 0 && (row.product_code || row.bottle_barcode || row.barcode)) {
        const barcode = row.bottle_barcode || row.barcode;
        if (barcode && processedBarcodes.has(barcode)) continue;
        const bottleQuery = barcode ? { barcode_number: barcode } : { product_code: row.product_code };
        const { data: bottles } = await supabase.from('bottles').select('*').match(bottleQuery).eq('organization_id', organization?.id).limit(1);
        if (bottles?.length > 0) {
          const bottle = bottles[0];
          if (barcode) processedBarcodes.add(barcode);
          const currentCustomer = bottle.assigned_customer || bottle.customer_name;
          const isSameCustomer = currentCustomer === newCustomerName || currentCustomer === newCustomerId;
          if (!currentCustomer) {
            await supabase.from('bottles').update({
              previous_assigned_customer: bottle.assigned_customer,
              previous_status: bottle.status,
              assigned_customer: newCustomerId || newCustomerName,
              customer_name: newCustomerName,
              status: 'rented',
              last_verified_order: orderNumber,
            }).eq('id', bottle.id);
            assignmentSuccesses.push(`Bottle ${bottle.barcode_number} assigned to ${newCustomerName}`);
            await insertDeliveryScan(bottle.barcode_number, newCustomerName);
            await createRentalRecord(bottle, newCustomerName, newCustomerId, row, orderNumber);
          } else if (isSameCustomer) {
            if (bottle.status !== 'rented') await supabase.from('bottles').update({ status: 'rented', last_verified_order: orderNumber }).eq('id', bottle.id);
            await createRentalRecord(bottle, newCustomerName, newCustomerId, row, orderNumber);
          } else {
            assignmentWarnings.push(`Bottle ${bottle.barcode_number} already at another customer; not reassigning.`);
          }
        }
      }
    }

    if (assignmentSuccesses.length > 0) logger.debug(`Inline: assigned ${assignmentSuccesses.length} bottle(s)`);
    if (assignmentWarnings.length > 0) {
      logger.warn(`Inline: ${assignmentWarnings.length} warning(s):`, assignmentWarnings);
      setSnackbar(`Assigned ${assignmentSuccesses.length} bottle(s). ${assignmentWarnings.length} warning(s) - see logs.`);
    }
  }


  // Insert a scan record so bottle Movement History shows the delivery (inline path has no RPC audit trail)
  async function insertDeliveryScan(barcodeNumber, customerName) {
    if (!organization?.id || !barcodeNumber) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('scans').insert({
        organization_id: organization.id,
        barcode_number: barcodeNumber,
        location: customerName || 'Customer',
        scanned_by: user?.id ?? null,
        scanned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        mode: 'SHIP',
        action: 'out'
      });
    } catch (e) {
      logger.warn('Could not insert delivery scan for history:', e);
    }
  }

  // Create rental record for assigned bottle (orderNumber so unverify can delete by rental_order_number)
  async function createRentalRecord(bottle, customerName, customerId, row, orderNumber = null) {
    try {
      const { data: existingRental } = await supabase
        .from('rentals')
        .select('id')
        .eq('bottle_barcode', bottle.barcode_number)
        .eq('organization_id', organization?.id)
        .is('rental_end_date', null)
        .limit(1);

      if (existingRental && existingRental.length > 0) {
        logger.debug(`Rental record already exists for bottle ${bottle.barcode_number}`);
        return;
      }

      const insertPayload = {
        organization_id: organization?.id,
        bottle_id: bottle.id,
        bottle_barcode: bottle.barcode_number,
        customer_id: customerId || customerName,
        customer_name: customerName,
        rental_start_date: new Date().toISOString().split('T')[0],
        rental_end_date: null,
        rental_amount: 10,
        rental_type: 'monthly',
        tax_code: 'GST+PST',
        tax_rate: 0.11,
        location: bottle.location || 'SASKATOON',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (orderNumber != null) insertPayload.rental_order_number = orderNumber;

      const { error: rentalError } = await supabase
        .from('rentals')
        .insert(insertPayload);

      if (rentalError) {
        logger.error('Error creating rental record:', rentalError);
      } else {
        logger.debug(`Created rental record for bottle ${bottle.barcode_number}, customer_id: ${customerId || customerName}`);
      }
    } catch (error) {
      logger.error('Error creating rental record:', error);
    }
  }

  // Create DNS (Delivered Not Scanned) rental – invoice says delivered but no scan; customer is charged rental
  // customer_id must be CustomerListID so Customer Detail page finds it (that page queries by customer_id = CustomerListID)
  async function createDNSRentalRecord(record, row, customerName, customerId, orderNumber, assignmentSuccesses = [], assignmentWarnings = []) {
    if (!organization?.id || !customerName) {
      logger.warn('createDNSRentalRecord: missing organization or customer');
      return;
    }
    try {
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId && customerName) {
        const { data: cust } = await supabase
          .from('customers')
          .select('CustomerListID')
          .eq('name', customerName)
          .eq('organization_id', organization.id)
          .limit(1)
          .maybeSingle();
        if (cust?.CustomerListID) resolvedCustomerId = cust.CustomerListID;
      }
      if (!resolvedCustomerId) {
        logger.warn('createDNSRentalRecord: could not resolve CustomerListID for customer – DNS may not show on Customer Detail', { customerName });
        resolvedCustomerId = customerName; // fallback so record exists; Customer Detail will match by customer_name
      }
      const productCode = row.product_code || row.bottle_barcode || row.barcode || 'DNS';
      const description = row.description || row.product_code || 'Delivered Not Scanned';
      const { error } = await supabase
        .from('rentals')
        .insert({
          organization_id: organization.id,
          customer_id: resolvedCustomerId,
          customer_name: customerName,
          is_dns: true,
          dns_product_code: productCode,
          dns_description: description,
          dns_order_number: orderNumber,
          bottle_id: null,
          bottle_barcode: null,
          rental_start_date: new Date().toISOString().split('T')[0],
          rental_end_date: null,
          rental_amount: 10,
          rental_type: 'monthly',
          tax_code: 'GST+PST',
          tax_rate: 0.11,
          location: 'SASKATOON',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (error) {
        logger.error('Error creating DNS rental:', error);
        assignmentWarnings.push(`Failed to create DNS rental for ${productCode}: ${error.message}`);
      } else {
        logger.debug(`✅ Created DNS rental for order ${orderNumber} product ${productCode} – customer charged rental`);
        assignmentSuccesses.push(`DNS: ${productCode} – ${description} (customer charged rental)`);
      }
    } catch (error) {
      logger.error('Error in createDNSRentalRecord:', error);
      assignmentWarnings.push(`DNS rental error: ${error?.message || error}`);
    }
  }

  // Bulk verify records (per-order: only mark selected orders as verified, not entire import rows)
  async function handleBulkVerify(records) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('User not authenticated');

    const scannedOnly = records.filter(r => typeof r.id === 'string' && r.id.startsWith('scanned_'));
    const imported = records.filter(r => !(typeof r.id === 'string' && r.id.startsWith('scanned_')));

    for (const record of scannedOnly) {
      logger.debug('Skipping scanned-only record in bulk verify:', record.id);
    }

    // Group by (table, import row id) so we update each import row once with all verified order numbers
    const byKey = {};
    for (const record of imported) {
      const recordId = record.originalId ?? record.id;
      if (recordId == null || (typeof recordId === 'string' && recordId.startsWith('scanned_'))) continue;
      const orderNumber = record.data?.order_number || record.data?.reference_number;
      if (!orderNumber) continue;
      const tableName = record._sourceTable || 'imported_invoices';
      const key = `${tableName}:${recordId}`;
      if (!byKey[key]) byKey[key] = { tableName, recordId, orderNumbers: [] };
      if (!byKey[key].orderNumbers.includes(orderNumber)) byKey[key].orderNumbers.push(orderNumber);
    }

    for (const key of Object.keys(byKey)) {
      const { tableName, recordId, orderNumbers: orderNumbersToVerify } = byKey[key];
      const { data: existingRow, error: fetchErr } = await supabase
        .from(tableName)
        .select('id, data, status')
        .eq('id', recordId)
        .single();
      if (fetchErr || !existingRow) {
        logger.error('Bulk verify: failed to fetch row:', tableName, recordId, fetchErr);
        continue;
      }
      const existingData = typeof existingRow.data === 'string' ? JSON.parse(existingRow.data || '{}') : (existingRow.data || {});
      const verifiedOrderNumbers = Array.isArray(existingData.verified_order_numbers) ? [...existingData.verified_order_numbers] : [];
      for (const on of orderNumbersToVerify) {
        if (!verifiedOrderNumbers.includes(on)) verifiedOrderNumbers.push(on);
      }
      const rows = existingData.rows || [];
      const distinctOrderNumbers = [...new Set(rows.map(r => r.reference_number || r.order_number || r.invoice_number || r.sales_receipt_number).filter(Boolean))];
      const allOrdersVerified = distinctOrderNumbers.length > 0 && distinctOrderNumbers.every(on => verifiedOrderNumbers.includes(on));
      const newData = { ...existingData, verified_order_numbers: verifiedOrderNumbers };
      const updatePayload = allOrdersVerified
        ? { data: newData, status: 'verified', verified_at: new Date().toISOString(), verified_by: currentUser.id }
        : { data: newData };
      const { error } = await supabase.from(tableName).update(updatePayload).eq('id', recordId);
      if (error) logger.error('Bulk verify: update error for', recordId, error);
    }

    for (const record of records) {
      await assignBottlesToCustomer(record);
    }
    await fetchData();
  }

  // Bulk reject records
  async function handleBulkReject(records) {
    logger.debug('Starting bulk reject for records:', records);
    
    // Get current user ID
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    logger.debug('Current user ID:', currentUser.id);

    // Update each record individually to avoid upsert issues
    for (const record of records) {
      logger.debug('Processing record:', record);
      logger.debug('Record ID:', record.id, 'Type:', typeof record.id);
      
      // Check if this is a scanned-only record that needs special handling
      if (typeof record.id === 'string' && record.id.startsWith('scanned_')) {
        logger.debug('Processing scanned-only record:', record.id);
        
        // Extract order number from scanned_ prefix
        const orderNumber = record.id.replace('scanned_', '');
        
        // Revert bottles that were marked empty when return was scanned (before we reject)
        if (organization?.id) {
          await revertBottlesForRejectedReturn(orderNumber, organization.id);
        }
        
        // Mark all scans for this order as rejected
        logger.debug('Attempting to reject scans for order:', orderNumber);
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
          logger.debug('Successfully marked scans as rejected for order:', orderNumber, 'Updated records:', updateData);
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
      
      logger.debug('Converted ID:', recordId, 'Type:', typeof recordId);
      
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
          logger.debug('Checking other tables for record:', recordId);
          
          // Check bottle_scans table
          const { data: bottleScanRecord, error: bottleScanError } = await supabase
            .from('bottle_scans')
            .select('id, action')
            .eq('id', recordId)
            .single();
          
          if (!bottleScanError) {
            logger.debug('Found record in bottle_scans table:', bottleScanRecord);
            logger.debug('Skipping bottle_scan record:', recordId);
            continue;
          }
          
          // Check sales_orders table
          const { data: salesOrderRecord, error: salesOrderError } = await supabase
            .from('sales_orders')
            .select('id, sales_order_number')
            .eq('id', recordId)
            .single();
          
          if (!salesOrderError) {
            logger.debug('Found record in sales_orders table:', salesOrderRecord);
            logger.debug('Skipping sales_order record:', recordId);
            continue;
          }
          
          // Check imported_sales_receipts table
          const { data: receiptRecord, error: receiptError } = await supabase
            .from('imported_sales_receipts')
            .select('id, status')
            .eq('id', recordId)
            .single();
          
          if (!receiptError) {
            logger.debug('Found record in imported_sales_receipts table:', receiptRecord);
            logger.debug('Skipping sales_receipt record:', recordId);
            continue;
          }
          
          logger.error('Record not found in any table:', recordId);
          
          // Check if this might be a "scanned only" record that shouldn't be rejected
          if (record.displayId && record.displayId.startsWith('scanned_')) {
            logger.debug('This appears to be a scanned-only record, skipping rejection:', recordId);
            continue;
          }
          
          throw new Error(`Record with ID ${recordId} not found in any table`);
        }
        
        logger.debug('Found record in scans table:', scanRecord);
        // Skip this record as it's not an imported invoice
        logger.debug('Skipping scan record:', recordId);
        continue;
      }
      
      logger.debug('Found existing record in imported_invoices:', existingRecord);
      
      // Revert bottles for return scans in this import before rejecting
      const recordData = parseDataField(record.data);
      const orderNum = recordData?.order_number || recordData?.reference_number || recordData?.invoice_number;
      if (orderNum && organization?.id) {
        await revertBottlesForRejectedReturn(orderNum, organization.id);
      }
      
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
      logger.debug('Successfully updated record:', recordId);
    }
  }

  // Individual reject record
  async function handleIndividualReject(record) {
    logger.debug('Starting individual reject for record:', record);
    
    // Get current user ID
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    logger.debug('Current user ID:', currentUser.id);

    // Check if this is a scanned-only record
    if (typeof record.id === 'string' && record.id.startsWith('scanned_')) {
      logger.debug('Cannot reject scanned-only record:', record.id);
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
    
    logger.debug('Converted ID:', recordId, 'Type:', typeof recordId);
    
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

      // Revert bottles for return scans in this import before rejecting
      const recordData = parseDataField(record.data);
      const orderNum = recordData?.order_number || recordData?.reference_number || recordData?.invoice_number;
      if (orderNum && organization?.id) {
        await revertBottlesForRejectedReturn(orderNum, organization.id);
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
      
      logger.debug('Successfully rejected record:', recordId);
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
        logger.debug('Skipping scanned-only record:', record.id);
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
        'Scan time': record.created_at ? new Date(record.created_at).toLocaleString() : ''
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
    logger.debug('Sidebar action:', option);
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
    logger.debug('Processing invoice:', invoiceData);
  }

  // Process receipt data for verification
  async function processReceipt(receiptData) {
    // Implementation for processing receipt data
    logger.debug('Processing receipt:', receiptData);
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
    
    if (!rows || rows.length === 0) return [importRecord];

    // Top-level order number — set when user changes the sales order number
    const topLevelOrder = (data.order_number || data.reference_number || data.invoice_number || '').toString().trim();

    // Group rows by order + customer so each card shows only one order and one customer
    const norm = (v) => (v != null && v !== '') ? String(v).trim() : '';
    const topLevelCustomerName = norm(data.customer_name || data.CustomerName || data.Customer);
    const topLevelCustomerId = norm(data.customer_id || data.CustomerId || data.CustomerListID);
    const groupedByOrderAndCustomer = {};
    rows.forEach(row => {
      const orderNumber = row.reference_number || row.order_number || row.invoice_number || row.sales_receipt_number || 'UNKNOWN';
      const customerName = norm(row.customer_name || row.customerName || row.Customer) || topLevelCustomerName;
      const customerId = norm(row.customer_id || row.customerId || row.CustomerListID) || topLevelCustomerId;
      const groupKey = `${orderNumber}\t${customerName}\t${customerId}`;
      if (!groupedByOrderAndCustomer[groupKey]) {
        groupedByOrderAndCustomer[groupKey] = [];
      }
      groupedByOrderAndCustomer[groupKey].push(row);
    });

    // If a single group has top-level order override (e.g. user changed sales order), normalise that group's key
    const groupedKeys = Object.keys(groupedByOrderAndCustomer);
    if (groupedKeys.length === 1 && topLevelOrder) {
      const onlyKey = groupedKeys[0];
      const parts = onlyKey.split('\t');
      if (parts[0] !== topLevelOrder) {
        const newKey = `${topLevelOrder}\t${parts[1] || ''}\t${parts[2] || ''}`;
        groupedByOrderAndCustomer[newKey] = groupedByOrderAndCustomer[onlyKey];
        delete groupedByOrderAndCustomer[onlyKey];
      }
    }

    // Create individual records for each order+customer
    const individualRecords = [];
    Object.keys(groupedByOrderAndCustomer).forEach((groupKey, index) => {
      const orderRows = groupedByOrderAndCustomer[groupKey];
      const firstRow = orderRows[0];
      const orderNumber = (groupKey.split('\t')[0] || '').trim() || 'UNKNOWN';
      
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
          rows: orderRows, // All rows for this specific order+customer
          order_number: orderNumber,
          customer_name: firstRow.customer_name || firstRow.customerName || firstRow.Customer || data.customer_name || data.CustomerName || data.Customer,
          customer_id: firstRow.customer_id || firstRow.customerId || firstRow.CustomerListID || data.customer_id || data.CustomerId || data.CustomerListID,
          CustomerName: firstRow.customer_name || firstRow.customerName || data.customer_name || data.CustomerName,
          CustomerListID: firstRow.customer_id || firstRow.customerId || data.customer_id || data.CustomerListID,
          date: firstRow.date,
          reference_number: orderNumber
        }
      });
    });
    
    return individualRecords;
  }

  // Helper to get scanned SHP/RTN for a given order and product code
  function getScannedQty(orderNum, productCode, type, invoiceRecord = null) {
    if (!orderNum || !productCode) return 0;
    // Resolve barcode to product code when needed
    let resolvedProductCode = productCode;
    if (/^\d+$/.test(productCode)) {
      // This might be a barcode, look it up
      const bottleInfo = productCodeToAssetInfo[productCode];
      if (bottleInfo && bottleInfo.product_code) {
        resolvedProductCode = bottleInfo.product_code;
      }
    }
    
    // Get the actual barcode from the invoice record if available (for scanned-only records)
    const invoiceBarcodes = new Set();
    const normBarcodeForSet = (b) => (b == null || b === '') ? '' : (String(b).trim().replace(/^0+/, '') || String(b).trim());
    if (invoiceRecord?.data?.rows) {
      invoiceRecord.data.rows.forEach(row => {
        const barcode = row.barcode || row.barcode_number || row.bottle_barcode;
        if (barcode) {
          const t = String(barcode).trim();
          invoiceBarcodes.add(t);
          const nb = normBarcodeForSet(barcode);
          if (nb && nb !== t) invoiceBarcodes.add(nb);
        }
      });
    }
    
    // Order number: trim and normalize so "71760", 71760, "071760" all match
    const normalizeOrderNum = (num) => {
      if (num == null || num === '') return '';
      const s = String(num).trim();
      if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
      return s;
    };
    const normalizedSearchOrderNum = normalizeOrderNum(orderNum);
    const orderNumVariants = new Set([
      normalizedSearchOrderNum,
      orderNum != null ? String(orderNum).trim() : '',
      normalizedSearchOrderNum.replace(/^0+/, '') || '0'
    ]);
    const normalizeBarcodeForWins = (b) => (b == null || b === '') ? '' : String(b).trim().replace(/^0+/, '') || String(b).trim();

    // For scanned-only cards: only count scans for this card's customer (same order number can have multiple customers)
    let rowsToUse = allScannedRows;
    const isScannedOnly = invoiceRecord?.is_scanned_only || (typeof invoiceRecord?.id === 'string' && invoiceRecord?.id?.startsWith('scanned_'));
    if (isScannedOnly && invoiceRecord?.data) {
      const data = typeof invoiceRecord.data === 'string' ? JSON.parse(invoiceRecord.data) : invoiceRecord.data;
      const wantName = (data.customer_name || data.CustomerName || data.Customer || '').toString().trim().toLowerCase();
      const wantId = (data.customer_id || data.CustomerId || data.CustomerListID || '').toString().trim().toLowerCase();
      if (wantName || wantId) {
        rowsToUse = allScannedRows.filter(row => {
          const sn = (row.customer_name || row.customer || '').toString().trim().toLowerCase();
          const si = (row.customer_id || row.CustomerID || row.CustomerId || row.CustomerListID || '').toString().trim().toLowerCase();
          return (wantName && sn === wantName) || (wantId && si === wantId);
        });
      }
    }

    // Most recent scan wins: per barcode on this order+product, determine latest type (out/in) by created_at; only count that type
    const barcodeToLatestType = new Map(); // normBarcode -> { type, time }
    rowsToUse.forEach(row => {
      if (row.status === 'rejected') return;
      if (!orderNumVariants.has(normalizeOrderNum(row.order_number))) return;
      const scannedBarcode = String(row.bottle_barcode || row.barcode_number || '').trim();
      let productMatch = row.product_code === resolvedProductCode || row.bottle_barcode === resolvedProductCode || row.barcode_number === resolvedProductCode;
      if (!productMatch && scannedBarcode) {
        const normBarcodeScan = String(scannedBarcode).trim().replace(/^0+/, '') || String(scannedBarcode).trim();
        const bottleInfo = productCodeToAssetInfo[scannedBarcode] || productCodeToAssetInfo[normBarcodeScan];
        if (bottleInfo && bottleInfo.product_code === resolvedProductCode) productMatch = true;
      }
      if (!productMatch) return;
      const nb = normalizeBarcodeForWins(scannedBarcode);
      if (!nb) return;
      const mode = (row.mode || '').toString().toUpperCase();
      const action = (row.action || '').toString().toLowerCase();
      const st = (row.scan_type || '').toString().toLowerCase();
      const isReturn = mode === 'RETURN' || mode === 'PICKUP' || st === 'pickup' || (action === 'in' && mode !== 'SHIP' && mode !== 'DELIVERY');
      const rowType = isReturn ? 'in' : 'out';
      const time = new Date(row.created_at || row.timestamp || 0).getTime();
      const existing = barcodeToLatestType.get(nb);
      if (!existing || time >= existing.time) {
        barcodeToLatestType.set(nb, { type: rowType, time });
      }
    });

    const matches = rowsToUse.filter(row => {
      if (row.status === 'rejected') return false;
      if (!orderNumVariants.has(normalizeOrderNum(row.order_number))) return false;
      
      // Get the barcode from the scan
      const scannedBarcode = String(row.bottle_barcode || row.barcode_number || '').trim();
      const nb = normalizeBarcodeForWins(scannedBarcode);
      // Most recent wins: do not count if this barcode's latest scan on this order was the other type (correction)
      const latest = barcodeToLatestType.get(nb);
      if (latest && latest.type !== type) return false;
      
      // For scanned-only records only: restrict to barcodes on the invoice. For imported invoices, Trk = what was scanned for this order (no barcode filter).
      const isScannedOnly = invoiceRecord?.is_scanned_only || (typeof invoiceRecord?.id === 'string' && invoiceRecord?.id?.startsWith('scanned_'));
      if (isScannedOnly && invoiceBarcodes.size > 0 && scannedBarcode) {
        const normScan = normBarcodeForSet(scannedBarcode);
        if (!invoiceBarcodes.has(scannedBarcode) && !invoiceBarcodes.has(normScan)) return false;
      }
      
      // Go by what was scanned for type (SHIP vs RETURN). For product line: use scan's product_code if present;
      // bottle_scans often has no product_code, so use barcode→bottle product from DB to assign to the right line.
      let productMatch =
        row.product_code === resolvedProductCode ||
        row.bottle_barcode === resolvedProductCode ||
        row.barcode_number === resolvedProductCode;
      if (!productMatch && scannedBarcode) {
        const normBarcodeScan = String(scannedBarcode).trim().replace(/^0+/, '') || String(scannedBarcode).trim();
        const bottleInfo = productCodeToAssetInfo[scannedBarcode] || productCodeToAssetInfo[normBarcodeScan];
        if (bottleInfo && bottleInfo.product_code === resolvedProductCode) {
          productMatch = true;
        }
      }
      if (!productMatch) {
        return false;
      }
      
      // Updated to match the mobile app's mode values - STRICT matching
      // Priority: mode field takes precedence - if mode is RETURN, it can NEVER be 'out', and vice versa
      const mode = (row.mode || '').toString().toUpperCase();
      const scanType = (row.scan_type || '').toString().toLowerCase();
      const action = (row.action || '').toString().toLowerCase();
      
      let typeMatch = false;
      
      // If mode is explicitly RETURN, it can ONLY match 'in' type
      if (mode === 'RETURN') {
        if (type !== 'in') return false;
        typeMatch = true;
      }
      else if (mode === 'SHIP') {
        if (type !== 'out') return false;
        typeMatch = true;
      }
      // If mode is 'pickup' or scan_type is 'pickup', it can ONLY match 'in' type
      else if (mode === 'PICKUP' || scanType === 'pickup') {
        typeMatch = type === 'in';
      }
      // If mode is 'delivery' or scan_type is 'delivery', it can ONLY match 'out' type
      else if (mode === 'DELIVERY' || scanType === 'delivery') {
        typeMatch = type === 'out';
      }
      // Fallback to action field if mode is not set or doesn't match known values
      else {
        typeMatch = (type === 'out' && action === 'out') || (type === 'in' && action === 'in');
      }
      
      return productMatch && typeMatch;
    });
    
    // Deduplicate by barcode per type - same barcode can count in both SHP and RTN (actual scan counts: 8 ship, 6 return)
    // Normalize barcode so "012345" and "12345" count as one (same bottle from bottle_scans vs scans)
    const normalizeBarcode = (b) => (b == null || b === '') ? '' : String(b).trim().replace(/^0+/, '') || String(b).trim();
    const uniqueMatches = [];
    const seenBarcodes = new Set();
    
    matches.forEach(match => {
      // Use any barcode field so we dedupe same bottle from bottle_scans vs scans or different column names
      const rawBarcode = match.bottle_barcode || match.barcode_number || match.cylinder_barcode;
      const barcode = rawBarcode ? normalizeBarcode(rawBarcode) : '';
      
      // If we have a barcode, only count it once per type (same barcode can appear in both SHP and RTN)
      if (barcode) {
        if (seenBarcodes.has(barcode)) return;
        seenBarcodes.add(barcode);
      } else {
        // No barcode: dedupe by order+product+type+created_at (round to second) so we don't double-count no-barcode rows
        const ts = match.created_at || match.timestamp;
        const roundedTime = ts ? Math.floor(new Date(ts).getTime() / 1000) : 0;
        const key = `no_barcode_${orderNum}_${resolvedProductCode}_${type}_${roundedTime}`;
        if (seenBarcodes.has(key)) {
          return;
        }
        seenBarcodes.add(key);
      }
      
      uniqueMatches.push(match);
    });
    
    return uniqueMatches.length;
  }
} 