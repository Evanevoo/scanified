import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase/client';
import { 
  Box, Paper, Typography, Button, Alert, Snackbar, CircularProgress, Divider, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, 
  MenuItem, Select, FormControl, InputLabel, TableContainer, Table, TableHead, 
  TableBody, TableRow, TableCell, Chip, Checkbox, Autocomplete, Tooltip, Fab, 
  Zoom, Card, CardContent, CardHeader, Grid, Tabs, Tab, Badge, LinearProgress,
  Stepper, Step, StepLabel, StepContent, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon, Switch, FormControlLabel, Stack,
  ButtonGroup, SpeedDial, SpeedDialAction, SpeedDialIcon
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
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
  Assessment as AssessmentIcon,
  BugReport as BugReportIcon,
  Security as SecurityIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  PersonAdd as PersonAddIcon,
  SwapHoriz as SwapIcon,
  Transform as TransformIcon,
  Merge as MergeIcon,
  CallSplit as SplitIcon,
  Link as LinkIcon,
  Unarchive as UnarchiveIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import ImportApprovalDetail from './ImportApprovalDetail';

// Enhanced status definitions matching TrackAbout's verification states
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
  REJECTED: { 
    label: 'Rejected', 
    color: 'error', 
    icon: <ErrorIcon />,
    description: 'Rejected and requires correction'
  }
};

// Enhanced verification actions matching TrackAbout's workflow
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
      console.log('JSON parse error for data:', data);
      return { _raw: data, _error: 'Malformed JSON' };
    }
  }
  return data;
}

// Enhanced status determination with TrackAbout-style logic
function determineVerificationStatus(record) {
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
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditDialog, setAuditDialog] = useState({ open: false, logs: [], title: '' });
  const navigate = useNavigate();
  
  // Enhanced state management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'timeline'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [verificationDialog, setVerificationDialog] = useState({ open: false, record: null, step: 0 });
  const [bulkActionDialog, setBulkActionDialog] = useState({ open: false, action: null });
  const [filterDialog, setFilterDialog] = useState({ open: false });
  const [settingsDialog, setSettingsDialog] = useState({ open: false });
  const [workflowDialog, setWorkflowDialog] = useState({ open: false, record: null });
  
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
  const [detailDialog, setDetailDialog] = useState({ open: false, row: null });
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

  // Define handleSelectAll early to avoid initialization errors
  const handleSelectAll = () => {
    setSelectedRecords(
      selectedRecords.length === pendingInvoices.length 
        ? [] 
        : pendingInvoices.map(invoice => invoice.id)
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

  // Initialize component
  useEffect(() => {
    fetchData();
    fetchCylinders();
    fetchCustomers();
    fetchScannedCounts();
    fetchAllScanned();
    fetchScannedOrders();
    fetchGasTypes();
    fetchBottles();
  }, []);

  // Enhanced data fetching with statistics
  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPendingInvoices(),
        fetchPendingReceipts(),
        fetchVerificationStats()
      ]);
    } catch (error) {
      setError('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
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
      
      // Status filter
      if (statusFilter !== 'all') {
        const recordStatus = determineVerificationStatus(record);
        if (statusFilter === 'pending' && recordStatus !== 'PENDING') return false;
        if (statusFilter === 'verified' && recordStatus !== 'VERIFIED') return false;
        if (statusFilter === 'exception' && recordStatus !== 'EXCEPTION') return false;
        if (statusFilter === 'investigation' && recordStatus !== 'INVESTIGATION') return false;
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

  // Get unique locations from all records
  const getUniqueLocations = () => {
    const locations = new Set(['All']);
    [...pendingInvoices, ...pendingReceipts].forEach(record => {
      const data = parseDataField(record.data);
      const location = data.location || data.summary?.location || 'Unknown';
      locations.add(location);
    });
    return Array.from(locations);
  };

  // Enhanced data fetching functions
  async function fetchPendingInvoices() {
    try {
      const { data, error } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('status', 'pending');
      
      if (error) throw error;
      
      // Split grouped imports into individual records (TrackAbout style)
      const individualRecords = [];
      (data || []).forEach(importRecord => {
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        individualRecords.push(...splitRecords);
      });
      
      console.log('Split invoices into individual records:', individualRecords.length);
      setPendingInvoices(individualRecords);
    } catch (error) {
      console.error('Error fetching pending invoices:', error);
      setError('Failed to fetch pending invoices');
    }
  }

  async function fetchPendingReceipts() {
    try {
      const { data, error } = await supabase
        .from('imported_sales_receipts')
        .select('*')
        .eq('status', 'pending');
      
      if (error) throw error;
      
      // Split grouped imports into individual records (TrackAbout style)
      const individualRecords = [];
      (data || []).forEach(importRecord => {
        const splitRecords = splitImportIntoIndividualRecords(importRecord);
        individualRecords.push(...splitRecords);
      });
      
      console.log('Split receipts into individual records:', individualRecords.length);
      setPendingReceipts(individualRecords);
    } catch (error) {
      console.error('Error fetching pending receipts:', error);
      setError('Failed to fetch pending receipts');
    }
  }

  async function fetchVerificationStats() {
    try {
      const { data: invoices } = await supabase.from('imported_invoices').select('*').eq('status', 'pending');
      const { data: receipts } = await supabase.from('imported_sales_receipts').select('*').eq('status', 'pending');
      
      const allRecords = [...(invoices || []), ...(receipts || [])];
      
      const stats = {
        total: allRecords.length,
        pending: 0,
        verified: 0,
        exceptions: 0,
        investigating: 0,
        processing: 0
      };
      
      allRecords.forEach(record => {
        const status = determineVerificationStatus(record);
        switch (status) {
          case 'PENDING': stats.pending++; break;
          case 'VERIFIED': stats.verified++; break;
          case 'EXCEPTION': stats.exceptions++; break;
          case 'INVESTIGATION': stats.investigating++; break;
          case 'IN_PROGRESS': stats.processing++; break;
        }
      });
      
      setVerificationStats(stats);
    } catch (error) {
      console.error('Error fetching verification stats:', error);
    }
  }

  // Fetch all cylinders for group lookup
  async function fetchCylinders() {
    const { data: cylinders } = await supabase.from('bottles').select('product_code, group_name');
    const map = {};
    (cylinders || []).forEach(c => {
      if (c.product_code) map[c.product_code.trim()] = c.group_name || '';
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
      console.error('Error fetching customers:', error);
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
      console.error('Error fetching scanned counts:', error);
    }
  }

  // Batch fetch all relevant bottles for all pending invoices
  async function fetchAllScanned() {
    try {
      const { data: scannedRows, error } = await supabase.from('bottle_scans').select('*');
      if (error) throw error;
      setAllScannedRows(scannedRows || []);
    } catch (error) {
      console.error('Error fetching all scanned rows:', error);
    }
  }

  // Fetch scanned orders (cylinder_scans)
  async function fetchScannedOrders() {
    try {
      const { data: orders, error } = await supabase.from('sales_orders').select('*');
      if (error) throw error;
      setScannedOrders(orders || []);
    } catch (error) {
      console.error('Error fetching scanned orders:', error);
    }
  }

  // Fetch gas types for dropdown
  async function fetchGasTypes() {
    try {
      const { data: gasTypes, error } = await supabase.from('gas_types').select('*');
      if (error) throw error;
      setGasTypes(gasTypes || []);
    } catch (error) {
      console.error('Error fetching gas types:', error);
    }
  }

  // Fetch all bottles for product code lookup
  async function fetchBottles() {
    try {
      const { data: bottles, error } = await supabase.from('bottles').select('*');
      if (error) throw error;
      const assetMap = {};
      (bottles || []).forEach(bottle => {
        if (bottle.product_code) {
          assetMap[bottle.product_code] = {
            description: bottle.description || '',
            type: bottle.type || '',
            size: bottle.size || '',
            group: bottle.group_name || ''
          };
        }
      });
      setProductCodeToAssetInfo(assetMap);
    } catch (error) {
      console.error('Error fetching bottles:', error);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (!userProfile?.organization_id) {
        return { success: false, error: 'User not assigned to an organization' };
      }
      
      // First, try to find customer by ID within the organization
      if (customerId) {
        const { data: existing } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('CustomerListID', customerId)
          .eq('organization_id', userProfile.organization_id);
        
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
          .eq('organization_id', userProfile.organization_id);
        
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
          console.error('Error creating line item:', lineItemError);
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
            console.error('Error assigning bottle to customer:', bottleError);
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
              console.warn('Could not fetch tax rate for location:', rentalLocation);
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
              console.error('Error creating rental record:', rentalError);
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
              console.error('Error ending rental record:', rentalUpdateError);
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
              console.error('Error unassigning bottle from customer:', bottleUnassignError);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (!userProfile?.organization_id) {
        return { success: false, error: 'User not assigned to an organization' };
      }
      
      // First, try to find customer by ID within the organization
      if (customerId) {
        const { data: existing } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('CustomerListID', customerId)
          .eq('organization_id', userProfile.organization_id);
        
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
          .eq('organization_id', userProfile.organization_id);
        
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
          console.error('Error creating line item:', lineItemError);
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
            console.error('Error assigning bottle to customer:', bottleError);
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
              console.warn('Could not fetch tax rate for location:', rentalLocation);
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
              console.error('Error creating rental record:', rentalError);
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
              console.error('Error ending rental record:', rentalUpdateError);
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
              console.error('Error unassigning bottle from customer:', bottleUnassignError);
            }
          }
        }
      }

      return { success: true, warnings: warnings };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Enhanced utility functions for TrackAbout-style display
  function getProductInfo(lineItem) {
    if (!lineItem) return {};
    
    const productCode = lineItem.product_code || lineItem.ProductCode || lineItem.Item || '';
    const assetInfo = productCodeToAssetInfo[productCode] || {};
    
    return {
      productCode: productCode,
      category: assetInfo.category || lineItem.category || 'BULK TANKS',
      group: assetInfo.group || lineItem.group || assetInfo.type || 'PROPYLENE',
      type: assetInfo.type || lineItem.type || '1000 GALLON',
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

  function getLineItems(data) {
    if (!data) return [];
    
    console.log('getLineItems called with:', data);
    
    // Try rows array first (THIS IS THE MAIN CASE for your imports)
    if (data.rows && Array.isArray(data.rows)) {
      console.log('Found rows array with length:', data.rows.length);
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
    
    console.log('No line items found, returning empty array');
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
              Manual verification required
            </Typography>
            <ButtonGroup>
              <Button 
                startIcon={<CheckCircleIcon />}
                onClick={() => onComplete(index, { verified: true })}
              >
                Approve
              </Button>
              <Button 
                startIcon={<ErrorIcon />}
                onClick={() => onComplete(index, { verified: false })}
              >
                Reject
              </Button>
            </ButtonGroup>
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
          <Typography variant="subtitle1" color="textSecondary">
            TrackAbout-style verification workflow for import approvals
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
        <Grid item xs={12} sm={6} md={2}>
          <StatisticsCard
            title="Total Records"
            value={verificationStats.total}
            color="primary.main"
            icon={<AssignmentIcon fontSize="large" />}
            percentage={100}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatisticsCard
            title="Pending"
            value={verificationStats.pending}
            color="warning.main"
            icon={<ScheduleIcon fontSize="large" />}
            percentage={verificationStats.total ? Math.round((verificationStats.pending / verificationStats.total) * 100) : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatisticsCard
            title="Verified"
            value={verificationStats.verified}
            color="success.main"
            icon={<CheckCircleIcon fontSize="large" />}
            percentage={verificationStats.total ? Math.round((verificationStats.verified / verificationStats.total) * 100) : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatisticsCard
            title="Exceptions"
            value={verificationStats.exceptions}
            color="error.main"
            icon={<ErrorIcon fontSize="large" />}
            percentage={verificationStats.total ? Math.round((verificationStats.exceptions / verificationStats.total) * 100) : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatisticsCard
            title="Investigating"
            value={verificationStats.investigating}
            color="secondary.main"
            icon={<BugReportIcon fontSize="large" />}
            percentage={verificationStats.total ? Math.round((verificationStats.investigating / verificationStats.total) * 100) : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatisticsCard
            title="Processing"
            value={verificationStats.processing}
            color="info.main"
            icon={<PlayArrowIcon fontSize="large" />}
            percentage={verificationStats.total ? Math.round((verificationStats.processing / verificationStats.total) * 100) : 0}
          />
        </Grid>
      </Grid>

      {/* Enhanced Filters and Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <TextField
            label="Search Records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <SearchIcon />
            }}
            sx={{ minWidth: 200 }}
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
            startIcon={<FilterListIcon />}
            onClick={() => setFilterDialog({ open: true })}
          >
            Advanced Filters
          </Button>
        </Box>
      </Paper>

      {/* Enhanced Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={
              <Badge badgeContent={pendingInvoices.length} color="primary">
                Invoices
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={pendingReceipts.length} color="primary">
                Receipts
              </Badge>
            } 
          />
          <Tab label="Audit Trail" />
          <Tab label="Analytics" />
        </Tabs>
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
            console.log('Verification completed:', data);
            setVerificationDialog({ open: false, record: null });
            fetchData();
          }}
        />
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Box>
  );

  function renderMainContent() {
    switch (activeTab) {
      case 0:
        return viewMode === 'grid' ? renderInvoicesGrid() : 
               viewMode === 'timeline' ? renderInvoicesTimeline() : 
               renderInvoicesTab();
      case 1:
        return viewMode === 'grid' ? renderReceiptsGrid() : 
               viewMode === 'timeline' ? renderReceiptsTimeline() : 
               renderReceiptsTab();
      case 2:
        return renderAuditTrailTab();
      case 3:
        return renderAnalyticsTab();
      default:
        return renderInvoicesTab();
    }
  }

  function renderInvoicesTab() {
    return (
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRecords.length > 0 && selectedRecords.length < filteredInvoices.length}
                    checked={selectedRecords.length === filteredInvoices.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Order #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Product Code</TableCell>
                <TableCell>Billing Code</TableCell>
                <TableCell align="center">SHP</TableCell>
                <TableCell align="center">RTN</TableCell>
                <TableCell>Highlight</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const data = parseDataField(invoice.data);
                const detailedItems = getDetailedLineItems(data);
                const orderNum = getOrderNumber(data);
                
                return detailedItems.map((item, itemIndex) => {
                  const scannedOut = getScannedQty(orderNum, item.productInfo.productCode, 'out');
                  const scannedIn = getScannedQty(orderNum, item.productInfo.productCode, 'in');
                  const shipped = item.shipped;
                  const returned = item.returned;
                  const shippedMismatch = shipped !== scannedOut;
                  const returnedMismatch = returned !== scannedIn;
                  
                  return (
                    <TableRow key={`${invoice.id}_${itemIndex}`} hover>
                      <TableCell padding="checkbox">
                        {itemIndex === 0 && (
                          <Checkbox
                            checked={selectedRecords.includes(invoice.id)}
                            onChange={() => handleSelectRecord(invoice.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {itemIndex === 0 && (
                          <Chip
                            label={VERIFICATION_STATES[determineVerificationStatus(invoice)].label}
                            color={VERIFICATION_STATES[determineVerificationStatus(invoice)].color}
                            size="small"
                            icon={VERIFICATION_STATES[determineVerificationStatus(invoice)].icon}
                          />
                        )}
                      </TableCell>
                      <TableCell>{itemIndex === 0 && orderNum}</TableCell>
                      <TableCell>{itemIndex === 0 && getCustomerInfo(data)}</TableCell>
                      <TableCell>{itemIndex === 0 && getRecordDate(data)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.productInfo.category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.productInfo.group}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.productInfo.type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          {item.productInfo.productCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.productInfo.billingCode}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Ord: <b style={{ color: shippedMismatch ? 'red' : 'inherit' }}>{shipped}</b>
                          </Typography>
                          <br/>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Trk: <b style={{ color: shippedMismatch ? 'red' : 'green' }}>{scannedOut}</b>
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Ord: <b style={{ color: returnedMismatch ? 'red' : 'inherit' }}>{returned}</b>
                          </Typography>
                          <br/>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Trk: <b style={{ color: returnedMismatch ? 'red' : 'green' }}>{scannedIn}</b>
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.highlight.text}
                          color={item.highlight.color}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {itemIndex === 0 && (
                          <ButtonGroup size="small">
                            <Button
                              startIcon={<ViewIcon />}
                              onClick={() => setDetailDialog({ open: true, row: invoice })}
                            >
                              View
                            </Button>
                            <Button
                              startIcon={<ApprovalIcon />}
                              onClick={() => setVerificationDialog({ open: true, record: invoice })}
                            >
                              Verify
                            </Button>
                          </ButtonGroup>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }

  function renderReceiptsTab() {
    return (
      <Paper>
        <Typography variant="h6" sx={{ p: 2 }}>
          Sales Receipts Verification
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox />
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Receipt #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Product Code</TableCell>
                <TableCell>Billing Code</TableCell>
                <TableCell align="center">SHP</TableCell>
                <TableCell align="center">RTN</TableCell>
                <TableCell>Highlight</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReceipts.map((receipt) => {
                const data = parseDataField(receipt.data);
                const detailedItems = getDetailedLineItems(data);
                const orderNum = getOrderNumber(data);
                
                return detailedItems.map((item, itemIndex) => {
                  const scannedOut = getScannedQty(orderNum, item.productInfo.productCode, 'out');
                  const scannedIn = getScannedQty(orderNum, item.productInfo.productCode, 'in');
                  const shipped = item.shipped;
                  const returned = item.returned;
                  const shippedMismatch = shipped !== scannedOut;
                  const returnedMismatch = returned !== scannedIn;
                  
                  return (
                    <TableRow key={`${receipt.id}_${itemIndex}`} hover>
                      <TableCell padding="checkbox">
                        {itemIndex === 0 && <Checkbox />}
                      </TableCell>
                      <TableCell>
                        {itemIndex === 0 && (
                          <Chip
                            label={VERIFICATION_STATES[determineVerificationStatus(receipt)].label}
                            color={VERIFICATION_STATES[determineVerificationStatus(receipt)].color}
                            size="small"
                            icon={VERIFICATION_STATES[determineVerificationStatus(receipt)].icon}
                          />
                        )}
                      </TableCell>
                      <TableCell>{itemIndex === 0 && orderNum}</TableCell>
                      <TableCell>{itemIndex === 0 && getCustomerInfo(data)}</TableCell>
                      <TableCell>{itemIndex === 0 && getRecordDate(data)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.productInfo.category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.productInfo.group}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.productInfo.type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          {item.productInfo.productCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.productInfo.billingCode}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Ord: <b style={{ color: shippedMismatch ? 'red' : 'inherit' }}>{shipped}</b>
                          </Typography>
                          <br/>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Trk: <b style={{ color: shippedMismatch ? 'red' : 'green' }}>{scannedOut}</b>
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Ord: <b style={{ color: returnedMismatch ? 'red' : 'inherit' }}>{returned}</b>
                          </Typography>
                          <br/>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Trk: <b style={{ color: returnedMismatch ? 'red' : 'green' }}>{scannedIn}</b>
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.highlight.text}
                          color={item.highlight.color}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {itemIndex === 0 && (
                          <ButtonGroup size="small">
                            <Button startIcon={<ViewIcon />}>View</Button>
                            <Button startIcon={<ApprovalIcon />}>Verify</Button>
                          </ButtonGroup>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }

  function renderAuditTrailTab() {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Verification Audit Trail
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Complete audit trail of all verification activities
        </Typography>
        {/* Audit trail implementation */}
      </Paper>
    );
  }

  function renderAnalyticsTab() {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Verification Analytics
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Analytics and insights on verification performance
        </Typography>
        {/* Analytics implementation */}
      </Paper>
    );
  }

  // Enhanced action handlers
  async function handleApprove(type, row) {
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
      
      setSnackbar('Record approved successfully');
      fetchData();
    } catch (error) {
      setError('Failed to approve record: ' + error.message);
    }
  }

  async function handleReject(type, row) {
    try {
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
      fetchData();
    } catch (error) {
      setError('Failed to reject record: ' + error.message);
    }
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
      fetchData();
    } catch (error) {
      setError('Failed to delete record: ' + error.message);
    }
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
        .eq('organization_id', user.organization_id)
        .ilike('name', `%${query}%`)
        .limit(10);
      
      if (error) throw error;
      return customers || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    } finally {
      setCustomerSearchLoading(false);
    }
  }

  async function handleSidebarAction(option) {
    console.log('Sidebar action:', option);
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
    console.log('Processing invoice:', invoiceData);
  }

  // Process receipt data for verification
  async function processReceipt(receiptData) {
    // Implementation for processing receipt data
    console.log('Processing receipt:', receiptData);
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

  // Function to split grouped import data into individual records (TrackAbout style)
  function splitImportIntoIndividualRecords(importRecord) {
    const data = parseDataField(importRecord.data);
    const rows = data.rows || [];
    
    if (!rows || rows.length === 0) return [importRecord];
    
    // Group rows by order/receipt number
    const groupedByOrder = {};
    rows.forEach(row => {
      const orderNumber = row.reference_number || row.order_number || row.invoice_number || row.sales_receipt_number || 'UNKNOWN';
      if (!groupedByOrder[orderNumber]) {
        groupedByOrder[orderNumber] = [];
      }
      groupedByOrder[orderNumber].push(row);
    });
    
    // Create individual records for each order/receipt
    const individualRecords = [];
    Object.keys(groupedByOrder).forEach((orderNumber, index) => {
      const orderRows = groupedByOrder[orderNumber];
      const firstRow = orderRows[0];
      
      individualRecords.push({
        ...importRecord,
        id: `${importRecord.id}_${index}`, // Create unique ID for each split record
        data: {
          ...data,
          rows: orderRows, // Only the rows for this specific order
          order_number: orderNumber,
          customer_name: firstRow.customer_name,
          customer_id: firstRow.customer_id,
          date: firstRow.date,
          reference_number: orderNumber
        }
      });
    });
    
    return individualRecords;
  }

  // Helper to get scanned (TrackAbout) SHP/RTN for a given order and product code
  function getScannedQty(orderNum, productCode, type) {
    // type: 'out' (delivered/shipped) or 'in' (returned)
    if (!orderNum || !productCode) return 0;
    // allScannedRows is an array of scan records
    // Assume scan_type: 'delivery' or 'pickup' or similar
    return allScannedRows.filter(row =>
      (row.order_number === orderNum || row.invoice_number === orderNum) &&
      (row.product_code === productCode || row.bottle_barcode === productCode)
      && ((type === 'out' && (row.scan_type === 'delivery' || row.mode === 'delivery')) ||
          (type === 'in' && (row.scan_type === 'pickup' || row.mode === 'pickup')))
    ).length;
  }
} 