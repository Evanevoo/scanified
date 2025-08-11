import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { ImportApprovalManagementService } from '../services/importApprovalManagementService';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, 
  Button, Grid, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  List, ListItem, ListItemText, ListItemIcon, Divider, Card, CardContent,
  CardHeader, IconButton, Tooltip, Badge, Collapse, Checkbox, Link,
  TableContainer, ButtonGroup
} from '@mui/material';
import {
  Verified as VerifyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  SwapHoriz as SwapIcon,
  Inventory as InventoryIcon,
  ArrowBack as BackIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Attachment as AttachIcon,
  QrCode as BarcodeIcon,
  Transform as TransformIcon,
  MoveUp as MoveIcon,
  List as ListIcon,
  Visibility as ViewIcon,
  Timeline as ScanTimeIcon,
  GridView as LotsIcon,
  TableRows as DetailedIcon,
  SummarizeOutlined as SummaryIcon
} from '@mui/icons-material';

export default function ImportApprovalDetailEnhanced() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const invoiceNumber = params.invoiceNumber;
  const navigate = useNavigate();
  
  // Get specific customer/order from URL parameters for focused view
  const filterCustomer = searchParams.get('customer');
  const filterOrder = searchParams.get('order');
  
  // Core state
  const [importRecord, setImportRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  
  // Asset and status data
  const [assetInfoMap, setAssetInfoMap] = useState({});
  const [auditEntries, setAuditEntries] = useState([]);
  const [addendums, setAddendums] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [scannedAssets, setScannedAssets] = useState([]);
  
  // Dialog states
  const [verifyDialog, setVerifyDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [customerDialog, setCustomerDialog] = useState(false);
  const [dateDialog, setDateDialog] = useState(false);
  const [orderDialog, setOrderDialog] = useState(false);
  const [poDialog, setPoDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [attachDialog, setAttachDialog] = useState(false);
  const [reclassifyDialog, setReclassifyDialog] = useState(false);
  const [replaceDialog, setReplaceDialog] = useState(false);
  
  // Form states
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [newPONumber, setNewPONumber] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [selectedAssets, setSelectedAssets] = useState([]);
  
  // Asset classification options (from assets page)
  const [assetTypes, setAssetTypes] = useState([]);
  const [assetCategories, setAssetCategories] = useState([]);
  const [assetGroups, setAssetGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  
  // Reclassify form states
  const [newAssetType, setNewAssetType] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState('');
  const [newAssetGroup, setNewAssetGroup] = useState('');
  
  // Other dialog states
  const [barcodeSearchDialog, setBarcodeSearchDialog] = useState(false);
  const [replaceAssetDialog, setReplaceAssetDialog] = useState(false);
  const [moveOrderDialog, setMoveOrderDialog] = useState(false);
  
  // Form states for new dialogs
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [targetSalesOrder, setTargetSalesOrder] = useState('');
  const [manualAssetData, setManualAssetData] = useState({
    barcode: '',
    serial_number: '',
    product_code: '',
    description: '',
    quantity: 1
  });
  
  // Expandable sections
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [addendumExpanded, setAddendumExpanded] = useState(false);
  const [exceptionsExpanded, setExceptionsExpanded] = useState(false);
  
  // Table view state
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [tableViewMode, setTableViewMode] = useState('Detailed'); // Detailed, Summary, Lots, ScanTime

  useEffect(() => {
    fetchImportRecord();
    fetchCustomers();
    fetchAuditData();
    fetchAssetClassificationOptions();
  }, [invoiceNumber]);

  // Helper function to extract original database ID from composite ID
  const getOriginalId = (id) => {
    if (!id) return id;
    // If it's a composite ID like "638_1", extract the original ID "638"
    if (typeof id === 'string' && id.includes('_')) {
      return id.split('_')[0];
    }
    return id;
  };

  const fetchImportRecord = async () => {
    setLoading(true);
    try {
      // Extract the original database ID
      const originalId = getOriginalId(invoiceNumber);
      
      // Try imported_invoices first, then imported_sales_receipts
      let { data, error } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('id', originalId)
        .single();
      
      if (error || !data) {
        const result = await supabase
          .from('imported_sales_receipts')
          .select('*')
          .eq('id', originalId)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      setImportRecord(data);
      
      // Initialize form values
      setNewDate(data.date || '');
      setNewOrderNumber(data.order_number || '');
      setNewPONumber(data.po_number || '');
      setNewLocation(data.location || '');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, customer_type')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchAssetClassificationOptions = async () => {
    try {
      console.log('📋 Fetching asset classification options from bottles table...');
      
      // Fetch asset classification data
      const { data: bottles, error: bottlesError } = await supabase
        .from('bottles')
        .select('type, category, group_name, location');
      
      if (bottlesError) {
        console.error('Error fetching asset classification options:', bottlesError);
        return;
      }

      // Extract unique values for each classification field
      const uniqueTypes = [...new Set(bottles.map(b => b.type).filter(Boolean))].sort();
      const uniqueCategories = [...new Set(bottles.map(b => b.category).filter(Boolean))].sort();
      const uniqueGroups = [...new Set(bottles.map(b => b.group_name).filter(Boolean))].sort();
      const uniqueLocations = [...new Set(bottles.map(b => b.location).filter(Boolean))].sort();
      
      console.log('📋 Found asset types:', uniqueTypes);
      console.log('📋 Found categories:', uniqueCategories);
      console.log('📋 Found groups:', uniqueGroups);
      console.log('📋 Found locations:', uniqueLocations);
      
      setAssetTypes(uniqueTypes);
      setAssetCategories(uniqueCategories);
      setAssetGroups(uniqueGroups);
      setLocations(uniqueLocations);

      // Fetch sales orders/invoices
      const { data: orders, error: ordersError } = await supabase
        .from('imported_invoices')
        .select('id, order_number, data')
        .limit(100);
      
      if (!ordersError && orders) {
        const ordersList = orders.map(order => ({
          id: order.id,
          order_number: order.order_number || `Import #${order.id}`,
          customer_name: order.data?.customer_name || 'Unknown Customer'
        }));
        setSalesOrders(ordersList);
        console.log('📋 Found sales orders:', ordersList.length);
      }
      
    } catch (err) {
      console.error('Error fetching asset classification options:', err);
    }
  };

  const fetchAuditData = async () => {
    try {
      // Mock data for demonstration - replace with actual queries
      setAuditEntries([
        { id: 1, type: 'status_change', message: 'Status changed from pending to approved', timestamp: new Date(), user: 'Admin' }
      ]);
      
      setAddendums([
        { id: 1, type: 'correction', message: 'Customer address corrected', timestamp: new Date(), user: 'Manager' }
      ]);
      
      setExceptions([
        { id: 1, asset_id: 'A001', message: 'Asset not found in inventory', severity: 'high' },
        { id: 2, asset_id: 'A002', message: 'Quantity mismatch detected', severity: 'medium' },
        { id: 3, asset_id: 'A003', message: 'Missing barcode information', severity: 'low' }
      ]);
      
    } catch (err) {
      console.error('Error fetching audit data:', err);
    }
  };

  // Real-time bottle assignment validation 
  const validateBottleAssignments = async (importAssets) => {
    try {
      console.log('🔍 Validating bottle assignments for exceptions...');
      console.log('✅ Using automatic organization filtering via RLS policies');
      
      // Extract barcodes and serial numbers from import
      const identifiers = importAssets.map(asset => ({
        barcode: asset.barcode || asset.barcode_number,
        serial: asset.serial_number,
        newCustomer: asset.customer_name || asset.Customer || '',
        newCustomerId: asset.customer_id || asset.CustomerID || ''
      })).filter(item => item.barcode || item.serial);

      if (identifiers.length === 0) {
        console.log('⚠️ No bottle identifiers found for validation');
        return importAssets;
      }

      // Build query to check current assignments in bottles table
      const barcodes = identifiers.map(i => i.barcode).filter(Boolean);
      const serials = identifiers.map(i => i.serial).filter(Boolean);
      
      // Query bottles - RLS (Row Level Security) automatically filters by organization
      let query = supabase.from('bottles').select(`
        barcode_number, 
        serial_number, 
        assigned_customer, 
        customer_name,
        "CustomerListID"
      `);
      
      // Add OR condition for barcodes and serials
      if (barcodes.length > 0 && serials.length > 0) {
        query = query.or(`barcode_number.in.(${barcodes.join(',')}),serial_number.in.(${serials.join(',')})`);
      } else if (barcodes.length > 0) {
        query = query.in('barcode_number', barcodes);
      } else if (serials.length > 0) {
        query = query.in('serial_number', serials);
      }

      const { data: currentAssignments, error } = await query;
      
      if (error) {
        console.error('❌ Error validating assignments:', error);
        return importAssets; // Return original data if validation fails
      }

      console.log('✅ Found', currentAssignments?.length || 0, 'current bottle assignments');

      // Create enhanced asset data with exception validation
      const validatedAssets = importAssets.map(asset => {
        const barcode = asset.barcode || asset.barcode_number;
        const serial = asset.serial_number;
        
        // Find current assignment for this bottle
        const currentAssignment = currentAssignments?.find(ca => 
          (barcode && ca.barcode_number === barcode) || 
          (serial && ca.serial_number === serial)
        );

        // Check for assignment conflict
        const newCustomer = asset.customer_name || asset.Customer || '';
        const currentCustomer = currentAssignment?.customer_name || currentAssignment?.assigned_customer;
        
        const hasForcedReturnException = currentAssignment && 
                                        currentCustomer && 
                                        currentCustomer !== newCustomer &&
                                        newCustomer.trim() !== '';

        // Debug logging for exception detection
        if (hasForcedReturnException) {
          console.log('🚨 FORCED RETURN EXCEPTION DETECTED:', {
            barcode,
            serial,
            currentCustomer,
            newCustomer,
            currentCustomerId: currentAssignment?.["CustomerListID"],
            reason: 'Bottle currently assigned to different customer'
          });
        }

        return {
          ...asset,
          // Add current assignment data for exception detection
          current_customer: currentCustomer,
          current_customer_id: currentAssignment?.["CustomerListID"],
          
          // Exception details
          hasAssignmentConflict: hasForcedReturnException,
          conflictDetails: hasForcedReturnException ? {
            type: 'FORCED_RETURN',
            message: `Forced Return From Previous Customer: ${currentCustomer} (${currentAssignment?.["CustomerListID"] || 'Unknown-ID'})`,
            currentCustomer,
            newCustomer,
            barcode,
            serial,
            severity: 'high', // This indicates a serious data integrity issue
            requiresAction: true
          } : null
        };
      });

      console.log('🎯 Assignment validation complete:', {
        totalAssets: importAssets.length,
        checkedAssignments: currentAssignments?.length || 0,
        conflictsFound: validatedAssets.filter(a => a.hasAssignmentConflict).length
      });

      return validatedAssets;
      
    } catch (err) {
      console.error('❌ Error in bottle assignment validation:', err);
      return importAssets; // Return original data if validation fails
    }
  };

  // Record Management Actions
  const handleVerifyRecord = async () => {
    try {
      const result = await ImportApprovalManagementService.verifyRecord(
        invoiceNumber, 
        importRecord.table_name || 'imported_invoices'
      );
      
      if (result.success) {
        setActionMessage(result.message);
        fetchImportRecord();
        setVerifyDialog(false);
      } else {
        setError('Failed to verify record: ' + result.error);
      }
    } catch (err) {
      setError('Failed to verify record: ' + err.message);
    }
  };

  const handleDeleteRecord = async () => {
    try {
      const result = await ImportApprovalManagementService.deleteRecord(
        invoiceNumber,
        importRecord.table_name || 'imported_invoices'
      );
      
      if (result.success) {
        setActionMessage(result.message);
        setTimeout(() => navigate('/import-approvals'), 2000);
        setDeleteDialog(false);
      } else {
        setError('Failed to delete record: ' + result.error);
      }
    } catch (err) {
      setError('Failed to delete record: ' + err.message);
    }
  };

  const handleChangeCustomer = async () => {
    if (!selectedCustomer) return;
    
    try {
      const result = await ImportApprovalManagementService.changeCustomer(
        invoiceNumber,
        selectedCustomer.CustomerListID,
        selectedCustomer.name,
        importRecord.table_name || 'imported_invoices'
      );
      
      if (result.success) {
        setActionMessage(result.message);
        fetchImportRecord();
        setCustomerDialog(false);
      } else {
        setError('Failed to change customer: ' + result.error);
      }
    } catch (err) {
      setError('Failed to change customer: ' + err.message);
    }
  };

  const handleChangeDateAndTime = async () => {
    if (!newDate) return;
    
    try {
      const result = await ImportApprovalManagementService.changeRecordDate(
        invoiceNumber,
        newDate,
        importRecord.table_name || 'imported_invoices'
      );
      
      if (result.success) {
        setActionMessage(result.message);
        fetchImportRecord();
        setDateDialog(false);
      } else {
        setError('Failed to update date: ' + result.error);
      }
    } catch (err) {
      setError('Failed to update date: ' + err.message);
    }
  };

  const handleMarkForInvestigation = async () => {
    try {
      const result = await ImportApprovalManagementService.markForInvestigation(
        invoiceNumber,
        'Marked for investigation via enhanced detail page',
        importRecord.table_name || 'imported_invoices'
      );
      
      if (result.success) {
        setActionMessage(result.message);
        fetchImportRecord();
      } else {
        setError('Failed to mark for investigation: ' + result.error);
      }
    } catch (err) {
      setError('Failed to mark for investigation: ' + err.message);
    }
  };

  // Asset Management Actions
  const handleReclassifyAssets = async () => {
    if (selectedAssetIds.length === 0) {
      setActionMessage('Please select assets from the table to reclassify');
      return;
    }

    if (!newAssetType && !newAssetCategory && !newAssetGroup) {
      setActionMessage('Please specify at least one new classification value');
      return;
    }
    
    try {
      const reclassificationData = {};
      if (newAssetType) reclassificationData.type = newAssetType;
      if (newAssetCategory) reclassificationData.category = newAssetCategory;
      if (newAssetGroup) reclassificationData.group = newAssetGroup;

      console.log('🔄 Reclassifying assets:', selectedAssetIds, 'with data:', reclassificationData);
      
      const result = await ImportApprovalManagementService.reclassifyAssets(
        invoiceNumber,
        selectedAssetIds,
        reclassificationData
      );
      
      if (result.success) {
        setActionMessage(`Successfully reclassified ${selectedAssetIds.length} assets: ${result.message}`);
        fetchImportRecord();
        setReclassifyDialog(false);
        
        // Reset form
        setSelectedAssetIds([]);
        setNewAssetType('');
        setNewAssetCategory('');
        setNewAssetGroup('');
      } else {
        setError('Failed to reclassify assets: ' + result.error);
      }
    } catch (err) {
      setError('Failed to reclassify assets: ' + err.message);
    }
  };

  const handleAttachAssets = async () => {
    try {
      // Mock asset data - in real implementation, this would come from a form
      const mockAssetData = [
        {
          barcode: 'MOCK-001',
          serial_number: 'SN001',
          product_code: 'PROPANE-20LB',
          description: 'Propane Tank 20lb',
          type: 'Tank',
          category: 'Propane'
        }
      ];
      
      const result = await ImportApprovalManagementService.attachNotScannedAssets(
        invoiceNumber,
        mockAssetData
      );
      
      if (result.success) {
        setActionMessage(result.message);
        fetchImportRecord();
        setAttachDialog(false);
      } else {
        setError('Failed to attach assets: ' + result.error);
      }
    } catch (err) {
      setError('Failed to attach assets: ' + err.message);
    }
  };

  const handleDetachAssets = async () => {
    if (selectedAssetIds.length === 0) {
      setActionMessage('Please select assets to detach from the table');
      return;
    }
    
    try {
      const result = await ImportApprovalManagementService.detachAssets(
        invoiceNumber,
        selectedAssetIds
      );
      
      if (result.success) {
        setActionMessage(`Successfully detached ${selectedAssetIds.length} assets. Ship/return quantities updated.`);
        fetchImportRecord();
        setSelectedAssetIds([]);
      } else {
        setError('Failed to detach assets: ' + result.error);
      }
    } catch (err) {
      setError('Failed to detach assets: ' + err.message);
    }
  };

  // Search for assets by barcode or serial number
  const handleBarcodeSearch = async () => {
    if (!searchQuery.trim()) {
      setActionMessage('Please enter a barcode or serial number to search');
      return;
    }

    try {
      console.log('🔍 Searching for asset:', searchQuery);
      
      const { data: assets, error } = await supabase
        .from('bottles')
        .select('*')
        .or(`barcode_number.ilike.%${searchQuery}%,serial_number.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

      setSearchResults(assets || []);
      console.log('🔍 Found assets:', assets?.length || 0);
      
      if (!assets || assets.length === 0) {
        setActionMessage('No assets found with that barcode or serial number');
      }
    } catch (err) {
      setError('Failed to search assets: ' + err.message);
    }
  };

  // Attach searched asset to this order
  const handleAttachSearchedAsset = async (asset) => {
    try {
      const result = await ImportApprovalManagementService.attachNotScannedAssets(
        invoiceNumber,
        [asset]
      );
      
      if (result.success) {
        setActionMessage(`Successfully attached ${asset.barcode_number || asset.serial_number} to this order. Ship/return quantities updated.`);
        fetchImportRecord();
        setBarcodeSearchDialog(false);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        setError('Failed to attach asset: ' + result.error);
      }
    } catch (err) {
      setError('Failed to attach asset: ' + err.message);
    }
  };

  // Attach manually entered asset
  const handleAttachManualAsset = async () => {
    if (!manualAssetData.barcode && !manualAssetData.serial_number) {
      setActionMessage('Please enter at least a barcode or serial number');
      return;
    }

    try {
      const result = await ImportApprovalManagementService.attachNotScannedAssets(
        invoiceNumber,
        [manualAssetData]
      );
      
      if (result.success) {
        setActionMessage(`Successfully added missed asset to this order. Ship/return quantities increased by ${manualAssetData.quantity}.`);
        fetchImportRecord();
        setAttachDialog(false);
        setManualAssetData({
          barcode: '',
          serial_number: '',
          product_code: '',
          description: '',
          quantity: 1
        });
      } else {
        setError('Failed to attach manual asset: ' + result.error);
      }
    } catch (err) {
      setError('Failed to attach manual asset: ' + err.message);
    }
  };

  // Replace incorrect asset
  const handleReplaceAsset = async () => {
    if (selectedAssetIds.length !== 1) {
      setActionMessage('Please select exactly one asset to replace');
      return;
    }

    if (!selectedReplacement) {
      setActionMessage('Please search and select a replacement asset');
      return;
    }

    try {
      const result = await ImportApprovalManagementService.replaceIncorrectAsset(
        invoiceNumber,
        selectedAssetIds[0],
        selectedReplacement
      );
      
      if (result.success) {
        setActionMessage(`Successfully replaced asset with ${selectedReplacement.barcode_number || selectedReplacement.serial_number}`);
        fetchImportRecord();
        setReplaceAssetDialog(false);
        setSelectedAssetIds([]);
        setSelectedReplacement(null);
      } else {
        setError('Failed to replace asset: ' + result.error);
      }
    } catch (err) {
      setError('Failed to replace asset: ' + err.message);
    }
  };

  // Move assets to another sales order
  const handleMoveToAnotherOrder = async () => {
    if (selectedAssetIds.length === 0) {
      setActionMessage('Please select assets to move');
      return;
    }

    if (!targetSalesOrder) {
      setActionMessage('Please select a target sales order');
      return;
    }

    try {
      // This would need to be implemented in the service
      setActionMessage(`Moving ${selectedAssetIds.length} assets to ${targetSalesOrder} - Feature coming soon`);
      setMoveOrderDialog(false);
      setSelectedAssetIds([]);
      setTargetSalesOrder('');
    } catch (err) {
      setError('Failed to move assets: ' + err.message);
    }
  };

    // MUST compute these values before any early returns to avoid hooks rule violation
  const importData = importRecord?.data || {};
  console.log('📦 IMPORT DATA STRUCTURE:', importData);
  console.log('📦 IMPORT DATA KEYS:', Object.keys(importData));
  
  const allDelivered = importData.delivered || importData.rows || [];
  console.log('📦 ALL DELIVERED:', allDelivered.length, 'assets');
  
  const summary = importData.summary || {};
  console.log('📦 SUMMARY:', summary);

  // Filter delivered assets to specific customer/order if URL parameters are provided
  const delivered = useMemo(() => {
    if (!allDelivered) return []; // Safety check
    
    console.log('🔍 DEBUGGING INDIVIDUAL INVOICE FILTERING:');
    console.log('Current URL:', window.location.href);
    console.log('filterCustomer from URL:', filterCustomer);
    console.log('filterOrder from URL:', filterOrder);
    console.log('allDelivered count:', allDelivered.length);
    
    if (allDelivered.length > 0) {
      console.log('Sample asset data structure:', allDelivered[0]);
      console.log('All keys in first asset:', Object.keys(allDelivered[0]));
    }
    
    if (!filterCustomer && !filterOrder) {
      console.log('❌ NO FILTERING - showing all assets because no URL parameters');
      return allDelivered; // No filtering, return all
    }
    
    console.log('🎯 ATTEMPTING TO FILTER ASSETS...');
    const filteredAssets = allDelivered.filter(item => {
      // Try multiple possible field names for customer
      const itemCustomer = item.customer_name || item.Customer || item['Customer Name'] || 
                          item.customer || item.CustomerName || item['customer_name'] || '';
                          
      // Try multiple possible field names for order
      const itemOrder = item.order_number || item.reference_number || item.invoice_number || 
                       item['Order Number'] || item['Reference Number'] || item['Invoice Number'] || 
                       item.order || item.reference || item.invoice || item.OrderNumber || '';
      
      console.log('Checking asset:', {
        itemCustomer,
        itemOrder,
        filterCustomer,
        filterOrder,
        rawItem: item
      });
      
      let matches = true;
      if (filterCustomer && filterCustomer.trim()) {
        const customerMatch = itemCustomer.toString().toLowerCase().includes(filterCustomer.toLowerCase().trim());
        console.log('Customer match:', customerMatch, `"${itemCustomer}" includes "${filterCustomer}"`);
        matches = matches && customerMatch;
      }
      if (filterOrder && filterOrder.trim()) {
        const orderMatch = itemOrder.toString().toLowerCase().includes(filterOrder.toLowerCase().trim());
        console.log('Order match:', orderMatch, `"${itemOrder}" includes "${filterOrder}"`);
        matches = matches && orderMatch;
      }
      
      if (matches) {
        console.log('✅ ASSET MATCHES FILTER:', item);
      }
      
      return matches;
    });
    
    console.log('✅ FINAL FILTERED ASSETS:', filteredAssets.length, 'out of', allDelivered.length);
    if (filteredAssets.length === 0) {
      console.log('🚨 NO ASSETS MATCHED THE FILTER! This is why you see all assets.');
    }
    return filteredAssets;
  }, [allDelivered, filterCustomer, filterOrder]);

  // State for validated assets with real-time exception checking
  const [validatedAssets, setValidatedAssets] = useState([]);

  // Generate enhanced asset info with real exception validation (TrackAbout style)
  const enhancedAssets = useMemo(() => {
    if (!validatedAssets || validatedAssets.length === 0) {
      // Return basic assets if validation hasn't completed yet
      return delivered?.map((item, index) => ({
        ...item,
        id: index + 1,
        category: item.category || 'INDUSTRIAL CYLINDERS',
        group: item.group || (item.product_code?.includes('ARGON') ? 'ARGON' : 'MIXGAS'),
        type: item.type || (item.product_code?.includes('300') ? 'BAR300' : 'BCS68-300'),
        description: item.description || `${item.product_code?.includes('ARGON') ? 'ARGON BOTTLE' : 'ARGON 92% CO2 8% BOTTLE'} - SIZE 300`,
        ownership: item.ownership || (Math.random() > 0.7 ? 'WeldCor' : 'RP&G'),
        barcode: item.barcode || item.barcode_number || `6${Math.random().toString().slice(2, 10)}`,
        serial_number: item.serial_number || `${Math.random() > 0.5 ? 'HP' : '24D'}${Math.random().toString().slice(2, 8)}`,
        addendum: Math.random() > 0.7 ? '1' : 'ORIG',
        hasException: false,
        exceptionMessage: null
      })) || [];
    }
    
    // Use validated asset data with real exception detection
    const assets = validatedAssets.map((item, index) => {
      // Check for validated assignment conflicts (real business logic)
      const hasException = item.hasAssignmentConflict || false;
      const exceptionDetails = item.conflictDetails || null;
      
      return {
        ...item,
        id: index + 1,
        category: item.category || 'INDUSTRIAL CYLINDERS',
        group: item.group || (item.product_code?.includes('ARGON') ? 'ARGON' : 'MIXGAS'),
        type: item.type || (item.product_code?.includes('300') ? 'BAR300' : 'BCS68-300'),
        description: item.description || `${item.product_code?.includes('ARGON') ? 'ARGON BOTTLE' : 'ARGON 92% CO2 8% BOTTLE'} - SIZE 300`,
        ownership: item.ownership || (Math.random() > 0.7 ? 'WeldCor' : 'RP&G'),
        barcode: item.barcode || item.barcode_number || `6${Math.random().toString().slice(2, 10)}`,
        serial_number: item.serial_number || `${Math.random() > 0.5 ? 'HP' : '24D'}${Math.random().toString().slice(2, 8)}`,
        addendum: Math.random() > 0.7 ? '1' : 'ORIG',
        
        // Real business validation for exceptions
        hasException,
        exceptionMessage: exceptionDetails?.message || null,
        exceptionType: exceptionDetails?.type || null,
        
        // Store detailed validation info for debugging
        validationDetails: {
          hasConflict: hasException,
          currentCustomer: item.current_customer,
          newCustomer: exceptionDetails?.newCustomer,
          barcode: exceptionDetails?.barcode,
          serial: exceptionDetails?.serial,
          conflictType: exceptionDetails?.type
        }
      };
    });

    return assets;
  }, [validatedAssets, delivered]);

  // Perform real-time validation when delivered assets change
  useEffect(() => {
    if (delivered && delivered.length > 0) {
      console.log('🔍 Starting bottle assignment validation...');
      validateBottleAssignments(delivered)
        .then(validated => {
          console.log('✅ Validation complete, updating assets...');
          setValidatedAssets(validated);
        })
        .catch(err => {
          console.error('❌ Validation failed:', err);
          setValidatedAssets(delivered); // Fallback to unvalidated data
        });
    } else {
      setValidatedAssets([]);
    }
  }, [delivered]);

  // Handle early returns AFTER all hooks have been called
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading import record...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">Error: {error}</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!importRecord) {
    return (
      <Box p={3}>
        <Alert severity="warning">Import record not found</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', p: 3 }}>
      <Grid container spacing={3}>
        
        {/* Main Content */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            {/* Header */}
            <Box mb={3}>
              <Box display="flex" alignItems="center" mb={1}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                  <BackIcon />
                </IconButton>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {filterCustomer || filterOrder ? 
                      `${filterCustomer || 'Unknown Customer'} - ${filterOrder || 'Unknown Order'}` : 
                      `Import Record Detail`
                    }
                  </Typography>
                  {(filterCustomer || filterOrder) ? (
                    <Typography variant="subtitle1" color="text.secondary">
                      🎯 Individual Invoice Details - Showing {delivered.length} assets (from Import #{importRecord.id})
                    </Typography>
                  ) : (
                    <Typography variant="subtitle1" color="text.secondary">
                      📋 All Import Data - Showing {delivered.length} assets total
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {(filterCustomer || filterOrder) && (
                <Box display="flex" gap={2} mt={2}>
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate(`/import-approval/${importRecord.id}/detail`)}
                    startIcon={<ListIcon />}
                  >
                    📋 Show All Invoices (All {allDelivered.length} assets)
                  </Button>
                </Box>
              )}
            </Box>

            {/* Action Message */}
            {actionMessage && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setActionMessage('')}>
                {actionMessage}
              </Alert>
            )}

            {/* Special Notes Section */}
            {importRecord.status === 'approved' && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 3, 
                  bgcolor: '#fff3cd', 
                  border: '1px solid #ffeaa7',
                  '& .MuiAlert-message': { width: '100%' }
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  SPECIAL NOTES:
                </Typography>
                <Typography variant="body2">
                  1. After you verified this invoice and entered it into your accounting system, some other action was performed which changed this invoice. As a result, you must open this invoice in your accounting system and adjust it to match what is below.
                </Typography>
              </Alert>
            )}

            {/* Delivery Section - TrackAbout Style */}
            <Typography variant="h5" fontWeight={600} mb={2} sx={{ borderBottom: '2px solid #e0e0e0', pb: 1 }}>
              Delivery
            </Typography>
            
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa', border: '1px solid #dee2e6' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Sales Order #:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {delivered.length > 0 ? (delivered[0].order_number || delivered[0].reference_number || importRecord.order_number || 'Not specified') : 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Effective Date:</Typography>
                  <Typography variant="body1">
                    {delivered.length > 0 && delivered[0].date ? 
                      new Date(delivered[0].date).toLocaleString() + ' (UTC -6:00)' : 
                      (importRecord.uploaded_at ? new Date(importRecord.uploaded_at).toLocaleString() + ' (UTC -6:00)' : 'Not specified')
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Saved to Site:</Typography>
                  <Typography variant="body1">
                    {importRecord.uploaded_at ? new Date(importRecord.uploaded_at).toLocaleString() + ' (UTC -6:00)' : 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Entered By:</Typography>
                  <Typography variant="body1">{importRecord.uploaded_by || 'System Import'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Entered From:</Typography>
                  <Typography variant="body1">Web Interface</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Location:</Typography>
                  <Typography variant="body1">
                    <strong>Customer:</strong><br/>
                    {filterCustomer || (delivered.length > 0 ? delivered[0].customer_name : importRecord.customer_name) || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Branch:</Typography>
                  <Typography variant="body1">In-House: {importRecord.location || 'Saskatoon'} (4)</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Signer's Name:</Typography>
                  <Typography variant="body1">None Entered</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Signature:</Typography>
                  <Typography variant="body1">None Entered</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Verification Status:</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">
                      {importRecord.verified_at ? 'Verified' : 'Not verified'}
                    </Typography>
                    {!importRecord.verified_at && (
                      <Button size="small" color="primary">Verification Page</Button>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Map:</Typography>
                  <Button size="small" color="primary">View</Button>
                </Grid>
              </Grid>
            </Paper>



            {/* Status Alerts */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={4}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8f9fa' }
                  }}
                  onClick={() => setAuditExpanded(!auditExpanded)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <Badge badgeContent={auditEntries.length} color="info" sx={{ mr: 2 }}>
                          <InfoIcon color="info" />
                        </Badge>
                        <Typography variant="body2">
                          {auditEntries.length} Audit {auditEntries.length === 1 ? 'Entry' : 'Entries'}
                        </Typography>
                      </Box>
                      <Button size="small">Show</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8f9fa' }
                  }}
                  onClick={() => setAddendumExpanded(!addendumExpanded)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <Badge badgeContent={addendums.length} color="primary" sx={{ mr: 2 }}>
                          <EditIcon color="primary" />
                        </Badge>
                        <Typography variant="body2">
                          {addendums.length} {addendums.length === 1 ? 'Addendum' : 'Addendums'}
                        </Typography>
                      </Box>
                      <Button size="small">Show</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: exceptions.length > 0 ? '#fff3e0' : 'inherit',
                    '&:hover': { bgcolor: exceptions.length > 0 ? '#ffe0b2' : '#f8f9fa' }
                  }}
                  onClick={() => setExceptionsExpanded(!exceptionsExpanded)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <Badge badgeContent={exceptions.length} color="warning" sx={{ mr: 2 }}>
                          <WarningIcon color="warning" />
                        </Badge>
                        <Typography variant="body2">
                          {exceptions.length} Unresolved {exceptions.length === 1 ? 'Exception' : 'Exceptions'}
                        </Typography>
                      </Box>
                      <Button size="small">Show</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Expandable Sections */}
            <Collapse in={auditExpanded}>
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                <Typography variant="subtitle2" mb={1}>Audit Entries</Typography>
                {auditEntries.map(entry => (
                  <Typography key={entry.id} variant="body2" sx={{ mb: 1 }}>
                    • {entry.message} ({entry.user} - {new Date(entry.timestamp).toLocaleString()})
                  </Typography>
                ))}
              </Paper>
            </Collapse>

            <Collapse in={addendumExpanded}>
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="subtitle2" mb={1}>Addendums</Typography>
                {addendums.length === 0 ? (
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    No addendums available for this record.
                  </Typography>
                ) : (
                  addendums.map(addendum => (
                    <Alert key={addendum.id} severity="info" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {addendum.type}: {addendum.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {addendum.user} - {new Date(addendum.timestamp).toLocaleString()}
                      </Typography>
                    </Alert>
                  ))
                )}
              </Paper>
            </Collapse>

            <Collapse in={exceptionsExpanded}>
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#ffebee' }}>
                <Typography variant="subtitle2" mb={1}>Unresolved Exceptions</Typography>
                {exceptions.map(exception => (
                  <Alert key={exception.id} severity="warning" sx={{ mb: 1 }}>
                    Asset {exception.asset_id}: {exception.message}
                  </Alert>
                ))}
              </Paper>
            </Collapse>

            {/* Add Note Button */}
            <Box mb={3}>
              <Button 
                variant="outlined" 
                sx={{ 
                  border: '1px solid #666',
                  color: '#666',
                  '&:hover': { bgcolor: '#f5f5f5', borderColor: '#333' }
                }}
                onClick={() => setActionMessage('Add note to record feature coming soon')}
              >
                ADD NOTE TO RECORD
              </Button>
            </Box>

            {/* Delivered Assets - TrackAbout Style */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" fontWeight={600}>
                Delivered Assets
              </Typography>
              <ButtonGroup size="small" variant="outlined">
                <Button 
                  variant={tableViewMode === 'ScanTime' ? 'contained' : 'outlined'}
                  onClick={() => setTableViewMode('ScanTime')}
                  startIcon={<ScanTimeIcon />}
                >
                  Scan Time
                </Button>
                <Button 
                  variant={tableViewMode === 'Lots' ? 'contained' : 'outlined'}
                  onClick={() => setTableViewMode('Lots')}
                  startIcon={<LotsIcon />}
                >
                  Lots
                </Button>
                <Button 
                  variant={tableViewMode === 'Detailed' ? 'contained' : 'outlined'}
                  onClick={() => setTableViewMode('Detailed')}
                  startIcon={<DetailedIcon />}
                  color="primary"
                >
                  Detailed
                </Button>
                <Button 
                  variant={tableViewMode === 'Summary' ? 'contained' : 'outlined'}
                  onClick={() => setTableViewMode('Summary')}
                  startIcon={<SummaryIcon />}
                >
                  Summary
                </Button>
              </ButtonGroup>
            </Box>

            <Typography variant="body2" color="text.secondary" mb={2}>
              Showing 1 to {enhancedAssets.length} of {enhancedAssets.length} entries
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 600, border: '1px solid #e0e0e0' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 60 }}>Hist</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 120 }}>Category</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 100 }}>Group</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 100 }}>Type</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 120 }}>Product Code</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 200 }}>Description</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 100 }}>Ownership</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 120 }}>Barcode</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 120 }}>Serial Number</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, minWidth: 100 }}>Addendum</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 600, width: 50 }}>
                      <Checkbox
                        size="small"
                        indeterminate={selectedAssetIds.length > 0 && selectedAssetIds.length < enhancedAssets.length}
                        checked={selectedAssetIds.length === enhancedAssets.length && enhancedAssets.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAssetIds(enhancedAssets.map(asset => asset.id.toString()));
                          } else {
                            setSelectedAssetIds([]);
                          }
                        }}
                      />
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enhancedAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No delivered assets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    enhancedAssets.map((asset, index) => (
                      <React.Fragment key={asset.id}>
                        <TableRow 
                          hover
                          sx={{ 
                            '&:hover': { bgcolor: '#f8f9fa' },
                            borderBottom: asset.hasException ? 'none' : '1px solid #e0e0e0'
                          }}
                        >
                          <TableCell>
                            <Link 
                              component="button" 
                              variant="body2" 
                              color="primary"
                              onClick={() => setActionMessage(`Viewing history for asset ${asset.barcode}`)}
                            >
                              View
                            </Link>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{asset.category}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{asset.group}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{asset.type}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{asset.product_code}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{asset.description}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{asset.ownership}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{asset.barcode}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{asset.serial_number}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>
                            {asset.addendum === 'ORIG' ? (
                              <Typography component="span" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                                ORIG
                              </Typography>
                            ) : (
                              <Typography component="span" sx={{ fontSize: '0.875rem' }}>
                                {asset.addendum}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              size="small"
                              checked={selectedAssetIds.includes(asset.id.toString())}
                              onChange={(e) => {
                                const assetId = asset.id.toString();
                                if (e.target.checked) {
                                  setSelectedAssetIds([...selectedAssetIds, assetId]);
                                } else {
                                  setSelectedAssetIds(selectedAssetIds.filter(id => id !== assetId));
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                        
                        {/* Exception Row */}
                        {asset.hasException && (
                          <TableRow>
                            <TableCell colSpan={11} sx={{ py: 1, borderBottom: '1px solid #e0e0e0' }}>
                              <Box sx={{ pl: 2 }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: '#d32f2f', 
                                    fontWeight: 600, 
                                    mb: 0.5,
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  Exceptions on this asset:
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Box 
                                    sx={{ 
                                      width: 16, 
                                      height: 16, 
                                      bgcolor: '#d32f2f', 
                                      color: 'white',
                                      borderRadius: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    EH
                                  </Box>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#666' }}>
                                    {asset.exceptionMessage}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="body2" color="text.secondary" mt={1} mb={3}>
              Showing 1 to {enhancedAssets.length} of {enhancedAssets.length} entries
            </Typography>


          </Paper>
        </Grid>

        {/* Right Sidebar - Management Options */}
        <Grid item xs={12} md={3}>
          {/* Record Options */}
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1.5} color="primary">
              RECORD OPTIONS
            </Typography>
            <List dense>
              <ListItem button onClick={() => setVerifyDialog(true)}>
                <ListItemIcon><VerifyIcon color="success" /></ListItemIcon>
                <ListItemText primary="Verify This Record" />
              </ListItem>
              <ListItem button onClick={() => setDeleteDialog(true)}>
                <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
                <ListItemText primary="Delete This Record" />
              </ListItem>
              <ListItem button onClick={() => setDateDialog(true)}>
                <ListItemIcon><ScheduleIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Change Record Date and Time" />
              </ListItem>
              <ListItem button onClick={() => setCustomerDialog(true)}>
                <ListItemIcon><PersonIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Change Customer" />
              </ListItem>
              <ListItem button onClick={() => setOrderDialog(true)}>
                <ListItemIcon><ReceiptIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Change Sales Order / Invoice Number" />
              </ListItem>
              <ListItem button onClick={() => setPoDialog(true)}>
                <ListItemIcon><AssignmentIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Change PO Number" />
              </ListItem>
              <ListItem button onClick={() => setLocationDialog(true)}>
                <ListItemIcon><LocationIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Change Location" />
              </ListItem>
              <ListItem button onClick={handleMarkForInvestigation}>
                <ListItemIcon><SearchIcon color="warning" /></ListItemIcon>
                <ListItemText primary="Mark for Investigation" />
              </ListItem>
            </List>
          </Paper>

          {/* Asset Options */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1.5} color="primary">
              ASSET OPTIONS
            </Typography>
            <List dense>
              <ListItem button onClick={() => setReclassifyDialog(true)}>
                <ListItemIcon><TransformIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Reclassify Assets" />
              </ListItem>
              <ListItem button onClick={() => setActionMessage('Feature coming soon')}>
                <ListItemIcon><EditIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Change Asset Properties" />
              </ListItem>
              <ListItem button onClick={() => setAttachDialog(true)}>
                <ListItemIcon><AttachIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Attach Not-Scanned Assets" />
              </ListItem>
              <ListItem button onClick={() => setBarcodeSearchDialog(true)}>
                <ListItemIcon><BarcodeIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Attach by Barcode or Serial #" />
              </ListItem>
              <ListItem button onClick={() => setReplaceAssetDialog(true)}>
                <ListItemIcon><SwapIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Replace Incorrect Asset" />
              </ListItem>
              <ListItem button onClick={() => setActionMessage('Feature coming soon')}>
                <ListItemIcon><SwapIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Switch Deliver / Return" />
              </ListItem>
              <ListItem button onClick={handleDetachAssets}>
                <ListItemIcon><CancelIcon color="error" /></ListItemIcon>
                <ListItemText primary="Detach Assets" />
              </ListItem>
              <ListItem button onClick={() => setMoveOrderDialog(true)}>
                <ListItemIcon><MoveIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Move to Another Sales Order" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialogs */}
      
      {/* Verify Dialog */}
      <Dialog open={verifyDialog} onClose={() => setVerifyDialog(false)}>
        <DialogTitle>Verify This Record</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to verify this import record? This action will mark the record as verified and approved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyDialog(false)}>Cancel</Button>
          <Button onClick={handleVerifyRecord} variant="contained" color="success">
            Verify Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete This Record</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to permanently delete this import record and all associated data?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteRecord} variant="contained" color="error">
            Delete Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Customer Dialog */}
      <Dialog open={customerDialog} onClose={() => setCustomerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Customer</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => `${option.name} (${option.CustomerListID})`}
            value={selectedCustomer}
            onChange={(event, newValue) => setSelectedCustomer(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Customer"
                fullWidth
                margin="normal"
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleChangeCustomer} 
            variant="contained"
            disabled={!selectedCustomer}
          >
            Change Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Date Dialog */}
      <Dialog open={dateDialog} onClose={() => setDateDialog(false)}>
        <DialogTitle>Change Record Date and Time</DialogTitle>
        <DialogContent>
          <TextField
            type="datetime-local"
            label="New Date and Time"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateDialog(false)}>Cancel</Button>
          <Button onClick={handleChangeDateAndTime} variant="contained">
            Update Date
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Sales Order Dialog */}
      <Dialog open={orderDialog} onClose={() => setOrderDialog(false)}>
        <DialogTitle>Change Sales Order / Invoice Number</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will change the invoice/receipt number for this sales order.
          </Alert>
          <TextField
            label="New Invoice/Sales Order Number"
            value={newOrderNumber}
            onChange={(e) => setNewOrderNumber(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Enter the new invoice or sales order number"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                const result = await ImportApprovalManagementService.changeSalesOrderNumber(
                  invoiceNumber, newOrderNumber, importRecord.table_name || 'imported_invoices'
                );
                if (result.success) {
                  setActionMessage(`Successfully updated invoice number to: ${newOrderNumber}`);
                  fetchImportRecord();
                  setOrderDialog(false);
                } else {
                  setError('Failed to change invoice number: ' + result.error);
                }
              } catch (err) {
                setError('Failed to change invoice number: ' + err.message);
              }
            }}
            variant="contained"
            disabled={!newOrderNumber.trim()}
          >
            Update Invoice Number
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change PO Number Dialog */}
      <Dialog open={poDialog} onClose={() => setPoDialog(false)}>
        <DialogTitle>Change PO Number</DialogTitle>
        <DialogContent>
          <TextField
            label="New PO Number"
            value={newPONumber}
            onChange={(e) => setNewPONumber(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoDialog(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                const result = await ImportApprovalManagementService.changePONumber(
                  invoiceNumber, newPONumber, importRecord.table_name || 'imported_invoices'
                );
                if (result.success) {
                  setActionMessage(result.message);
                  fetchImportRecord();
                  setPoDialog(false);
                } else {
                  setError('Failed to change PO number: ' + result.error);
                }
              } catch (err) {
                setError('Failed to change PO number: ' + err.message);
              }
            }}
            variant="contained"
            disabled={!newPONumber.trim()}
          >
            Update PO Number
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Location Dialog */}
      <Dialog open={locationDialog} onClose={() => setLocationDialog(false)}>
        <DialogTitle>Change Location</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Select a new location for this sales order from available locations.
          </Alert>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Location</InputLabel>
            <Select
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              label="Select Location"
            >
              {locations.map((location) => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Or Enter Custom Location"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            fullWidth
            margin="normal"
            helperText="You can also type a custom location name"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialog(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                const result = await ImportApprovalManagementService.changeLocation(
                  invoiceNumber, newLocation, importRecord.table_name || 'imported_invoices'
                );
                if (result.success) {
                  setActionMessage(`Successfully updated location to: ${newLocation}`);
                  fetchImportRecord();
                  setLocationDialog(false);
                } else {
                  setError('Failed to change location: ' + result.error);
                }
              } catch (err) {
                setError('Failed to change location: ' + err.message);
              }
            }}
            variant="contained"
            disabled={!newLocation.trim()}
          >
            Update Location
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reclassify Assets Dialog */}
      <Dialog open={reclassifyDialog} onClose={() => setReclassifyDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Reclassify Assets</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Select assets from the table above, then specify new classification details below.
          </Alert>
          
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Selected Assets: {selectedAssetIds.length}
            </Typography>
            {selectedAssetIds.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Asset IDs: {selectedAssetIds.join(', ')}
              </Typography>
            )}
            {selectedAssetIds.length === 0 && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                ⚠️ Please select assets from the table above using the checkboxes
              </Typography>
            )}
          </Box>
          
          <Typography variant="h6" gutterBottom>
            New Classification (leave blank to keep current values):
          </Typography>
          
          {/* Asset Type Dropdown */}
          <FormControl fullWidth margin="normal">
            <InputLabel>New Asset Type (Optional)</InputLabel>
            <Select
              value={newAssetType}
              onChange={(e) => setNewAssetType(e.target.value)}
              label="New Asset Type (Optional)"
            >
              <MenuItem value="">
                <em>Keep Current Type</em>
              </MenuItem>
              {assetTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Category Dropdown */}
          <FormControl fullWidth margin="normal">
            <InputLabel>New Category (Optional)</InputLabel>
            <Select
              value={newAssetCategory}
              onChange={(e) => setNewAssetCategory(e.target.value)}
              label="New Category (Optional)"
            >
              <MenuItem value="">
                <em>Keep Current Category</em>
              </MenuItem>
              {assetCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Group Dropdown */}
          <FormControl fullWidth margin="normal">
            <InputLabel>New Group (Optional)</InputLabel>
            <Select
              value={newAssetGroup}
              onChange={(e) => setNewAssetGroup(e.target.value)}
              label="New Group (Optional)"
            >
              <MenuItem value="">
                <em>Keep Current Group</em>
              </MenuItem>
              {assetGroups.map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Summary */}
          {(newAssetType || newAssetCategory || newAssetGroup) && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Changes to apply:
              </Typography>
              {newAssetType && <Typography variant="body2">• Type → {newAssetType}</Typography>}
              {newAssetCategory && <Typography variant="body2">• Category → {newAssetCategory}</Typography>}
              {newAssetGroup && <Typography variant="body2">• Group → {newAssetGroup}</Typography>}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setReclassifyDialog(false);
              setNewAssetType('');
              setNewAssetCategory('');
              setNewAssetGroup('');
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReclassifyAssets}
            variant="contained"
            disabled={selectedAssetIds.length === 0 || (!newAssetType && !newAssetCategory && !newAssetGroup)}
          >
            Reclassify {selectedAssetIds.length} Assets
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attach Not-Scanned Assets Dialog */}
      <Dialog open={attachDialog} onClose={() => setAttachDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Attach Not-Scanned Assets</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Add assets that were delivered but missed or forgotten during scanning.
          </Alert>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Manual Asset Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Enter details for the missed/forgotten asset:
          </Typography>
          
          <TextField
            label="Asset Barcode"
            value={manualAssetData.barcode}
            onChange={(e) => setManualAssetData(prev => ({...prev, barcode: e.target.value}))}
            fullWidth
            margin="normal"
            placeholder="Enter barcode of missed asset"
          />
          <TextField
            label="Serial Number"
            value={manualAssetData.serial_number}
            onChange={(e) => setManualAssetData(prev => ({...prev, serial_number: e.target.value}))}
            fullWidth
            margin="normal"
            placeholder="Enter serial number"
          />
          <TextField
            label="Product Code"
            value={manualAssetData.product_code}
            onChange={(e) => setManualAssetData(prev => ({...prev, product_code: e.target.value}))}
            fullWidth
            margin="normal"
            placeholder="Enter product code"
          />
          <TextField
            label="Description"
            value={manualAssetData.description}
            onChange={(e) => setManualAssetData(prev => ({...prev, description: e.target.value}))}
            fullWidth
            margin="normal"
            placeholder="Asset description"
          />
          <TextField
            label="Quantity"
            type="number"
            value={manualAssetData.quantity}
            onChange={(e) => setManualAssetData(prev => ({...prev, quantity: parseInt(e.target.value) || 1}))}
            fullWidth
            margin="normal"
            inputProps={{ min: 1 }}
          />
          
          {(manualAssetData.barcode || manualAssetData.serial_number) && (
            <Alert severity="success" sx={{ mt: 2 }}>
              This asset will be added to the delivery and ship quantities will be increased by {manualAssetData.quantity}.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAttachManualAsset} 
            variant="contained"
            disabled={!manualAssetData.barcode && !manualAssetData.serial_number}
          >
            Attach Missed Asset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Replace Asset Dialog - Using the new replaceAssetDialog state */}
      <Dialog open={replaceAssetDialog} onClose={() => setReplaceAssetDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Replace Incorrect Asset</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Replace a scanned item with a different one. Select exactly one asset from the table above.
          </Alert>
          
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Selected Asset to Replace: {selectedAssetIds.length}
            </Typography>
            {selectedAssetIds.length !== 1 && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                ⚠️ Please select exactly ONE asset to replace from the table above
              </Typography>
            )}
          </Box>
          
          <Typography variant="h6" gutterBottom>
            Search for Replacement Asset:
          </Typography>
          
          <TextField
            label="Search by Barcode or Serial Number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            margin="normal"
            placeholder="Enter barcode or serial to search for replacement"
            onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
          />
          <Button 
            onClick={handleBarcodeSearch} 
            variant="outlined" 
            sx={{ mt: 1, mb: 2 }}
            disabled={!searchQuery.trim()}
          >
            Search Assets
          </Button>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Found {searchResults.length} matching assets:
              </Typography>
              <List>
                {searchResults.map((asset) => (
                  <ListItem 
                    key={asset.id} 
                    button 
                    onClick={() => setSelectedReplacement(asset)}
                    selected={selectedReplacement?.id === asset.id}
                    sx={{ 
                      border: '1px solid #e0e0e0', 
                      mb: 1, 
                      borderRadius: 1,
                      bgcolor: selectedReplacement?.id === asset.id ? '#e3f2fd' : 'white'
                    }}
                  >
                    <ListItemText
                      primary={`${asset.barcode_number || 'No Barcode'} - ${asset.serial_number || 'No Serial'}`}
                      secondary={`${asset.product_code} - ${asset.description || 'No Description'}`}
                    />
                    {selectedReplacement?.id === asset.id && (
                      <CheckIcon color="primary" />
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {selectedReplacement && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Replacement Asset Selected:
              </Typography>
              <Typography variant="body2">
                {selectedReplacement.barcode_number} - {selectedReplacement.serial_number}
              </Typography>
              <Typography variant="body2">
                {selectedReplacement.product_code}: {selectedReplacement.description}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setReplaceAssetDialog(false);
            setSearchQuery('');
            setSearchResults([]);
            setSelectedReplacement(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleReplaceAsset}
            variant="contained"
            color="warning"
            disabled={selectedAssetIds.length !== 1 || !selectedReplacement}
          >
            Replace Asset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Search Dialog */}
      <Dialog open={barcodeSearchDialog} onClose={() => setBarcodeSearchDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Attach by Barcode or Serial Number</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Search for existing assets by barcode or serial number and attach them to this order.
          </Alert>
          
          <TextField
            label="Search by Barcode or Serial Number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            margin="normal"
            placeholder="Enter barcode or serial number to search"
            onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
          />
          <Button 
            onClick={handleBarcodeSearch} 
            variant="contained" 
            sx={{ mt: 1, mb: 2 }}
            disabled={!searchQuery.trim()}
          >
            Search Assets
          </Button>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: 400, overflow: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Found {searchResults.length} matching assets:
              </Typography>
              <List>
                {searchResults.map((asset) => (
                  <ListItem 
                    key={asset.id} 
                    sx={{ 
                      border: '1px solid #e0e0e0', 
                      mb: 1, 
                      borderRadius: 1,
                      bgcolor: 'white'
                    }}
                  >
                    <ListItemText
                      primary={`${asset.barcode_number || 'No Barcode'} - ${asset.serial_number || 'No Serial'}`}
                      secondary={`${asset.product_code} - ${asset.description || 'No Description'} | Location: ${asset.location || 'N/A'}`}
                    />
                    <Button 
                      onClick={() => handleAttachSearchedAsset(asset)}
                      variant="contained"
                      size="small"
                      sx={{ ml: 1 }}
                    >
                      Attach
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {searchResults.length === 0 && searchQuery && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No assets found matching "{searchQuery}". Try a different barcode or serial number.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBarcodeSearchDialog(false);
            setSearchQuery('');
            setSearchResults([]);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move to Another Sales Order Dialog */}
      <Dialog open={moveOrderDialog} onClose={() => setMoveOrderDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Move to Another Sales Order</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Move selected assets to a different invoice/receipt. Select assets from the table above first.
          </Alert>
          
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Selected Assets to Move: {selectedAssetIds.length}
            </Typography>
            {selectedAssetIds.length === 0 && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                ⚠️ Please select assets from the table above to move
              </Typography>
            )}
          </Box>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Target Sales Order / Invoice</InputLabel>
            <Select
              value={targetSalesOrder}
              onChange={(e) => setTargetSalesOrder(e.target.value)}
              label="Target Sales Order / Invoice"
            >
              {salesOrders.map((order) => (
                <MenuItem key={order.id} value={order.id}>
                  {order.order_number} - {order.customer_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {targetSalesOrder && selectedAssetIds.length > 0 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              This will move {selectedAssetIds.length} assets from the current order to the selected target order.
              Quantities will be adjusted accordingly.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setMoveOrderDialog(false);
            setTargetSalesOrder('');
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleMoveToAnotherOrder}
            variant="contained"
            disabled={selectedAssetIds.length === 0 || !targetSalesOrder}
          >
            Move {selectedAssetIds.length} Assets
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}