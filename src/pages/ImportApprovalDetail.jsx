import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Grid, List, ListItem, ListItemText, Divider, Alert, Chip, IconButton, Tooltip, Card, CardContent, CardHeader, Accordion, AccordionSummary, AccordionDetails, Badge, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Person as PersonIcon, Receipt as ReceiptIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { CardSkeleton } from '../components/SmoothLoading';
import { bottleAssignmentService } from '../services/bottleAssignmentService';

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

export default function ImportApprovalDetail({ invoiceNumber: propInvoiceNumber }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const invoiceNumber = propInvoiceNumber || params.id; // Changed from params.invoiceNumber to params.id
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [importRecord, setImportRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [assetInfoMap, setAssetInfoMap] = useState({});
  const [uploadedByUser, setUploadedByUser] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [showSalesOrderModal, setShowSalesOrderModal] = useState(false);
  const [newSalesOrder, setNewSalesOrder] = useState('');
  const [showPOModal, setShowPOModal] = useState(false);
  const [newPO, setNewPO] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [scannedBottles, setScannedBottles] = useState([]);
  const [returnedBottles, setReturnedBottles] = useState([]);
  const [unassignedDeliveredBarcodes, setUnassignedDeliveredBarcodes] = useState([]);
  const [unassignedReturnedBarcodes, setUnassignedReturnedBarcodes] = useState([]);
  const [assignBottleDialog, setAssignBottleDialog] = useState({ open: false, barcode: null, section: null });
  const [bottleTypes, setBottleTypes] = useState({ types: [], groupNames: [], categories: [], productCodes: [], ownerships: [], typeDefaults: {} });
  const [assignBottleForm, setAssignBottleForm] = useState({ type: '', group_name: '', description: '', category: '', product_code: '', ownership: '' });
  const [assignBottleSaving, setAssignBottleSaving] = useState(false);
  const [refreshScannedBottlesTrigger, setRefreshScannedBottlesTrigger] = useState(0);
  
  // Asset Options state
  const [selectedAssets, setSelectedAssets] = useState(new Set()); // Track selected barcodes
  const [switchModeDialog, setSwitchModeDialog] = useState({ open: false });
  const [detachAssetsDialog, setDetachAssetsDialog] = useState({ open: false });
  const [attachBarcodeDialog, setAttachBarcodeDialog] = useState({ open: false, barcode: '', mode: 'SHIP' });
  const [reclassifyDialog, setReclassifyDialog] = useState({ open: false, newType: '', newGroup: '' });
  const [moveOrderDialog, setMoveOrderDialog] = useState({ open: false, newOrderNumber: '' });
  const [assetActionSaving, setAssetActionSaving] = useState(false);

  // Get filter parameters from URL
  const filterInvoiceNumber = searchParams.get('order') || searchParams.get('invoiceNumber');
  const filterCustomerName = searchParams.get('customer') || searchParams.get('customerName');
  const filterCustomerId = searchParams.get('customerId');

  // Helper function to extract original database ID from composite ID
  const getOriginalId = (id) => {
    if (!id) return id;
    
    // Handle scanned-only records (e.g., "scanned_55666")
    if (typeof id === 'string' && id.startsWith('scanned_')) {
      // For scanned records, we don't need to query imported_invoices
      // Return null to indicate this is a scanned-only record
      return null;
    }
    
    // If it's a composite ID like "638_1", extract the original ID "638"
    if (typeof id === 'string' && id.includes('_')) {
      return id.split('_')[0];
    }
    return id;
  };

  useEffect(() => {
    async function fetchImport() {
      setLoading(true);
      setError(null);
      
      logger.log('fetchImport: invoiceNumber =', invoiceNumber);
      logger.log('fetchImport: params =', params);
      
      // Extract the original database ID
      const originalId = getOriginalId(invoiceNumber);
      logger.log('fetchImport: originalId =', originalId);
      
      // Handle scanned-only records
      if (invoiceNumber && invoiceNumber.startsWith('scanned_')) {
        // For scanned-only records, create a mock record structure
        const orderNumber = invoiceNumber.replace('scanned_', '');
        const customerName = filterCustomerName || '';
        
        // Fetch scan data from bottle_scans table
        const { data: scans, error: scansError } = await supabase
          .from('bottle_scans')
          .select('*')
          .eq('order_number', orderNumber)
          .order('created_at', { ascending: false });
        
        if (scansError) {
          setError(`Error fetching scan data: ${scansError.message}`);
          setLoading(false);
          return;
        }
        
        if (!scans || scans.length === 0) {
          setError('No scan data found for this order');
          setLoading(false);
          return;
        }
        
        // Create a mock import record structure for scanned-only data
        // "Uploaded At" = when scanning started = earliest scan time (oldest created_at)
        const createdAtValues = scans.map(s => s.created_at).filter(Boolean);
        const uploadedAt = createdAtValues.length
          ? createdAtValues.reduce((a, b) => (a < b ? a : b))
          : (scans[0].created_at || new Date().toISOString());
        const mockRecord = {
          id: invoiceNumber,
          data: {
            rows: scans.map(scan => ({
              order_number: scan.order_number,
              customer_name: scan.customer_name,
              product_code: scan.product_code || scan.bottle_barcode,
              qty_out: scan.mode === 'SHIP' ? 1 : 0,
              qty_in: scan.mode === 'RETURN' ? 1 : 0,
              date: scan.created_at ? new Date(scan.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              location: scan.location || 'Unknown',
              barcode: scan.bottle_barcode,
              description: 'Scanned Bottle',
              gas_type: 'Unknown'
            })),
            summary: {
              total_rows: scans.length,
              uploaded_by: scans[0].user_id || 'scanner',
              uploaded_at: uploadedAt
            }
          },
          uploaded_by: scans[0].user_id || 'scanner',
          uploaded_at: uploadedAt,
          status: 'scanned_only',
          created_at: uploadedAt,
          is_scanned_only: true
        };
        
        setImportRecord(mockRecord);
        setLoading(false);
        return;
      }
      
      if (!originalId) {
        setError('No invoice ID provided');
        setLoading(false);
        return;
      }
      
      let data = null;
      let err = null;
      // Try imported_invoices first
      let res = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('id', originalId)
        .single();
      if (res.error || !res.data) {
        // Try imported_sales_receipts as fallback
        let res2 = await supabase
          .from('imported_sales_receipts')
          .select('*')
          .eq('id', originalId)
          .single();
        data = res2.data;
        err = res2.error;
      } else {
        data = res.data;
        err = res.error;
      }
      if (err && !data) setError(err.message);
      setImportRecord(data);
      setLoading(false);
    }
    fetchImport();
  }, [invoiceNumber]);

  // Fetch user information for uploaded_by
  useEffect(() => {
    async function fetchUserInfo() {
      if (!importRecord?.uploaded_by) return;
      
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', importRecord.uploaded_by)
          .single();
        
        if (!profileError && profile) {
          setUploadedByUser(profile);
          return;
        }
        
        // No profile found – show uploaded_by as raw id
        setUploadedByUser({
          full_name: importRecord.uploaded_by,
          email: importRecord.uploaded_by
        });
      } catch (error) {
        logger.error('Error fetching user info:', error);
        setUploadedByUser({
          full_name: importRecord.uploaded_by,
          email: importRecord.uploaded_by
        });
      }
    }
    
    fetchUserInfo();
  }, [importRecord]);

  // Fetch asset information from bottles table
  useEffect(() => {
    async function fetchAssetInfo() {
      if (!importRecord || !organization?.id) return;
      
      const importData = importRecord.data || {};
      const allDelivered = importData.delivered || importData.rows || importData.line_items || [];
      const allReturned = importData.returned || [];
      
      logger.log('🔍 Import data structure:', { allDelivered, allReturned });
      
      // Get all unique barcodes AND product codes from imported data
      const barcodes = new Set();
      const productCodes = new Set();
      
      [...allDelivered, ...allReturned].forEach(item => {
        // Check for barcode first (this is what we really want to match)
        const barcode = item.barcode || item.barcode_number || item.Barcode || item.BarcodeNumber;
        if (barcode) {
          logger.log('📦 Found barcode in import:', barcode);
          barcodes.add(String(barcode).trim());
        }
        
        // Also get product code as fallback
        const prodCode = item.product_code || item.ProductCode || item.productCode;
        if (prodCode) {
          logger.log('📦 Found product code in import:', prodCode);
          productCodes.add(String(prodCode).trim());
        }
      });
      
      logger.log('📋 Barcodes to search:', Array.from(barcodes));
      logger.log('📋 Product codes to search:', Array.from(productCodes));
      
      if (barcodes.size === 0 && productCodes.size === 0) {
        logger.warn('⚠️ No barcodes or product codes found in import data');
        return;
      }
      
      try {
        // Try to find bottles by barcode_number first (most accurate)
        let bottles = [];
        
        if (barcodes.size > 0) {
          const { data, error } = await supabase
            .from('bottles')
            .select('barcode_number, product_code, category, group_name, type, description, gas_type')
            .in('barcode_number', Array.from(barcodes))
            .eq('organization_id', organization.id);
          
          if (error) {
            logger.error('❌ Error fetching bottles by barcode:', error);
          } else {
            bottles = data || [];
            logger.log('✅ Found bottles by barcode_number:', bottles);
          }
        }
        
        // If no bottles found by barcode, try product_code
        if (bottles.length === 0 && productCodes.size > 0) {
          const { data, error } = await supabase
            .from('bottles')
            .select('barcode_number, product_code, category, group_name, type, description, gas_type')
            .in('product_code', Array.from(productCodes))
            .eq('organization_id', organization.id);
          
          if (error) {
            logger.error('❌ Error fetching bottles by product_code:', error);
          } else {
            bottles = data || [];
            logger.log('✅ Found bottles by product_code:', bottles);
          }
        }
        
        // Create a map of barcode_number OR product_code to asset info
        const map = {};
        bottles.forEach(bottle => {
          const barcode = bottle.barcode_number?.trim();
          const prodCode = bottle.product_code?.trim();
          
          logger.log(`📊 Bottle - Barcode: ${barcode}, ProductCode: ${prodCode}:`, {
            category: bottle.category,
            group: bottle.group_name,
            type: bottle.type
          });
          
          // Map by barcode if available (most accurate)
          if (barcode) {
            logger.log(`✅ Mapping bottle data for barcode: ${barcode}`, {
              category: bottle.category || 'EMPTY',
              group: bottle.group_name || 'EMPTY',
              type: bottle.type || 'EMPTY',
              description: bottle.description || 'EMPTY',
              gas_type: bottle.gas_type || 'EMPTY'
            });
            map[barcode] = {
              category: bottle.category || '',
              group: bottle.group_name || '',
              type: bottle.type || '',
              description: bottle.description || '',
              gas_type: bottle.gas_type || ''
            };
          }
          
          // Also map by product_code if available
          if (prodCode) {
            logger.log(`✅ Mapping bottle data for product_code: ${prodCode}`, {
              category: bottle.category || 'EMPTY',
              group: bottle.group_name || 'EMPTY',
              type: bottle.type || 'EMPTY',
              description: bottle.description || 'EMPTY',
              gas_type: bottle.gas_type || 'EMPTY'
            });
            map[prodCode] = {
              category: bottle.category || '',
              group: bottle.group_name || '',
              type: bottle.type || '',
              description: bottle.description || '',
              gas_type: bottle.gas_type || ''
            };
          }
        });
        
        logger.log('🗺️ Final asset info map:', map);
        setAssetInfoMap(map);
        
        // Show warning if bottles not found
        if (bottles.length === 0) {
          logger.warn('⚠️ No matching bottles found in database');
          logger.warn('   Looked for barcodes:', Array.from(barcodes));
          logger.warn('   Looked for product_codes:', Array.from(productCodes));
        }
      } catch (error) {
        logger.error('❌ Error fetching asset info:', error);
      }
    }
    
    fetchAssetInfo();
  }, [importRecord, organization]);

  // Fetch scanned bottles for this order
  useEffect(() => {
    async function fetchScannedBottles() {
      if (!importRecord || !organization?.id) {
        logger.log('⚠️ Missing importRecord or organization for fetching scanned bottles');
        return;
      }
      
      const data = parseDataField(importRecord.data);
      
      // Prefer order number from record data (so after sales order change we use the saved value), then URL
      let orderNumber = getOrderNumber(data) || null;
      if (orderNumber && orderNumber !== 'N/A') {
        logger.log('🔍 Order number from record data:', orderNumber);
      }
      if (!orderNumber && filterInvoiceNumber && filterInvoiceNumber !== 'N/A') {
        orderNumber = filterInvoiceNumber;
        logger.log('🔍 Order number from URL parameter:', orderNumber);
      }
      
      // 3. From data.rows array
      if ((!orderNumber || orderNumber === 'N/A') && data.rows && data.rows.length > 0) {
        // Check all rows, not just the first one
        for (const row of data.rows) {
          const rowOrderNum = row.order_number || row.invoice_number || row.reference_number || row.sales_receipt_number;
          if (rowOrderNum && rowOrderNum !== 'N/A') {
            orderNumber = rowOrderNum;
            logger.log('🔍 Order number from rows array:', orderNumber);
            break;
          }
        }
      }
      
      // 4. From record ID (for scanned-only records)
      if ((!orderNumber || orderNumber === 'N/A') && typeof importRecord.id === 'string' && importRecord.id.startsWith('scanned_')) {
        orderNumber = importRecord.id.replace('scanned_', '');
        logger.log('🔍 Order number from scanned ID:', orderNumber);
      }
      
      // 5. Try to get from the import record's data directly
      if ((!orderNumber || orderNumber === 'N/A') && data) {
        // Check all possible fields in data
        orderNumber = data.order_number || data.reference_number || data.invoice_number || data.sales_receipt_number;
        if (orderNumber && orderNumber !== 'N/A') {
          logger.log('🔍 Order number from data fields:', orderNumber);
        }
      }
      
      if (!orderNumber || orderNumber === 'N/A') {
        logger.log('⚠️ No order number found for fetching scanned bottles. Full data:', {
          filterInvoiceNumber,
          importRecordId: importRecord.id,
          dataKeys: Object.keys(data || {}),
          hasRows: !!data.rows,
          rowsLength: data.rows?.length || 0,
          firstRowKeys: data.rows?.[0] ? Object.keys(data.rows[0]) : []
        });
        setScannedBottles([]);
        return;
      }
      
      logger.log('🔍 Fetching scanned bottles for order:', orderNumber, 'from data:', {
        filterInvoiceNumber,
        dataOrderNumber: data.order_number,
        dataReferenceNumber: data.reference_number,
        dataInvoiceNumber: data.invoice_number,
        hasRows: !!data.rows,
        rowsLength: data.rows?.length || 0,
        firstRowOrderNumber: data.rows?.[0]?.order_number,
        firstRowReferenceNumber: data.rows?.[0]?.reference_number,
        firstRowInvoiceNumber: data.rows?.[0]?.invoice_number,
        importRecordId: importRecord?.id,
        importRecordStatus: importRecord?.status
      });
      
      // Order number as-is for matching (trim only; letter-prefix and digits-only both accepted, no deriving)
      const trimOrderNum = (num) => (num == null || num === '') ? '' : String(num).trim();
      const orderNumTrimmed = trimOrderNum(orderNumber);
      
      try {
        // Track barcodes separately for delivered (SHIP) and returned (RETURN)
        const deliveredBarcodes = new Set();
        const returnedBarcodes = new Set();
        const barcodeToModeMap = new Map(); // Track the mode for each barcode
        
        // Helper function to determine if a scan is SHIP (delivered) or RETURN (returned)
        const isDelivered = (mode, action) => {
          const modeUpper = (mode || '').toString().toUpperCase();
          const actionLower = (action || '').toString().toLowerCase();
          
          // SHIP mode = delivered
          if (modeUpper === 'SHIP' || modeUpper === 'DELIVERY') return true;
          // RETURN mode = returned
          if (modeUpper === 'RETURN' || modeUpper === 'PICKUP') return false;
          // Fallback to action field
          if (actionLower === 'out') return true;
          if (actionLower === 'in') return false;
          // Default: if mode is not set, assume delivered (for backward compatibility)
          return true;
        };
        
        // Fetch from bottle_scans table filtered directly by order_number (avoids 1000-row cap)
        const { data: matchingBottleScans, error: bottleScansError } = await supabase
          .from('bottle_scans')
          .select('bottle_barcode, order_number, mode, created_at')
          .eq('organization_id', organization.id)
          .eq('order_number', orderNumTrimmed);
        
        if (bottleScansError) {
          logger.error('Error fetching bottle_scans:', bottleScansError);
        } else {
          logger.log(`✅ Found ${matchingBottleScans?.length || 0} bottle_scans for order ${orderNumber}`);
          
          logger.log('📋 Matching bottle_scans:', (matchingBottleScans || []).map(s => ({
            order_number: s.order_number,
            bottle_barcode: s.bottle_barcode,
            mode: s.mode
          })));
          
          // Process bottle_scans - SHIP and RETURN are independent; newest per (barcode+modeType) wins.
          const normModeType = (mode) => {
            const m = (mode || '').toString().toUpperCase();
            return (m === 'SHIP' || m === 'DELIVERY') ? 'SHIP' : 'RETURN';
          };
          const bottleScanMap = new Map(); // key: barcode+modeType
          
          (matchingBottleScans || []).forEach(scan => {
            if (scan.bottle_barcode) {
              const modeType = normModeType(scan.mode);
              const mapKey = `${scan.bottle_barcode}\t${modeType}`;
              const isDeliveredScan = modeType === 'SHIP';
              const existing = bottleScanMap.get(mapKey);
              const newTime = new Date(scan.created_at || 0).getTime();
              const existingTime = existing ? new Date(existing.created_at || 0).getTime() : -1;
              if (!existing || newTime >= existingTime) {
                bottleScanMap.set(mapKey, { barcode: scan.bottle_barcode, mode: scan.mode, isDelivered: isDeliveredScan, created_at: scan.created_at });
              }
            }
          });
          
          // Now add to the appropriate sets based on the scan type
          bottleScanMap.forEach((scanInfo, mapKey) => {
            const { barcode } = scanInfo;
            barcodeToModeMap.set(mapKey, { mode: scanInfo.mode, isDelivered: scanInfo.isDelivered, created_at: scanInfo.created_at });
            
            if (scanInfo.isDelivered) {
              deliveredBarcodes.add(barcode);
              logger.log(`📦 Added DELIVERED barcode from bottle_scans: ${barcode} (mode: ${scanInfo.mode})`);
            } else {
              returnedBarcodes.add(barcode);
              logger.log(`📦 Added RETURNED barcode from bottle_scans: ${barcode} (mode: ${scanInfo.mode})`);
            }
          });
        }
        
        // Also check scans table filtered directly by order_number (avoids 1000-row cap)
        const { data: matchingScans, error: scansError } = await supabase
          .from('scans')
          .select('barcode_number, order_number, "mode", action, created_at')
          .eq('organization_id', organization.id)
          .eq('order_number', orderNumTrimmed);
        
        if (scansError) {
          logger.error('Error fetching scans:', scansError);
        } else {
          logger.log(`✅ Found ${(matchingScans || []).length} scans for order ${orderNumber}`);
          logger.log('📋 Matching scans:', (matchingScans || []).map(s => ({
            order_number: s.order_number,
            barcode_number: s.barcode_number,
            mode: s.mode,
            action: s.action
          })));
          
          (matchingScans || []).forEach(scan => {
            if (scan.barcode_number) {
              const isDeliveredScan = isDelivered(scan.mode, scan.action);
              const modeType = isDeliveredScan ? 'SHIP' : 'RETURN';
              const mapKey = `${scan.barcode_number}\t${modeType}`;
              const existingMode = barcodeToModeMap.get(mapKey);
              const newTime = new Date(scan.created_at || 0).getTime();
              const existingTime = existingMode ? new Date(existingMode.created_at || 0).getTime() : -1;
              
              // Newest scan wins per (barcode+modeType) — SHIP and RETURN are additive
              if (!existingMode || newTime >= existingTime) {
                barcodeToModeMap.set(mapKey, { mode: scan.mode, action: scan.action, isDelivered: isDeliveredScan, created_at: scan.created_at });
                if (isDeliveredScan) {
                  deliveredBarcodes.add(scan.barcode_number);
                } else {
                  returnedBarcodes.add(scan.barcode_number);
                }
              }
            }
          });
        }
        
        logger.log(`📦 Delivered barcodes: ${deliveredBarcodes.size}`, Array.from(deliveredBarcodes));
        logger.log(`📦 Returned barcodes: ${returnedBarcodes.size}`, Array.from(returnedBarcodes));
        
        // Most recent scan wins: same bottle scanned both SHIP and RETURN (correction) → show only under the mode that was scanned last
        const normB = (b) => (b == null || b === '') ? '' : String(b).trim().replace(/^0+/, '') || String(b).trim();
        const barcodeToLatestMode = new Map(); // normBarcode -> { mode: 'SHIP'|'RETURN', time }
        barcodeToModeMap.forEach((info, mapKey) => {
          const parts = mapKey.split('\t');
          const barcode = parts[0];
          const modeType = parts[1];
          const nb = normB(barcode);
          const time = new Date(info.created_at || 0).getTime();
          const existing = barcodeToLatestMode.get(nb);
          if (!existing || time >= existing.time) {
            barcodeToLatestMode.set(nb, { mode: modeType, time });
          }
        });
        [...deliveredBarcodes].forEach(b => {
          const nb = normB(b);
          const latest = barcodeToLatestMode.get(nb);
          if (latest && latest.mode === 'RETURN') deliveredBarcodes.delete(b);
        });
        [...returnedBarcodes].forEach(b => {
          const nb = normB(b);
          const latest = barcodeToLatestMode.get(nb);
          if (latest && latest.mode === 'SHIP') returnedBarcodes.delete(b);
        });
        logger.log(`📦 After most-recent-wins: Delivered ${deliveredBarcodes.size}, Returned ${returnedBarcodes.size}`);
        
        // Fetch bottle details for delivered bottles
        let deliveredBottles = [];
        if (deliveredBarcodes.size > 0) {
          const { data: bottles, error: bottlesError } = await supabase
            .from('bottles')
            .select('barcode_number, product_code, category, group_name, type, description, gas_type, ownership, serial_number')
            .in('barcode_number', Array.from(deliveredBarcodes))
            .eq('organization_id', organization.id);
          
          if (bottlesError) {
            logger.error('Error fetching delivered bottles:', bottlesError);
          } else {
            deliveredBottles = bottles || [];
            logger.log(`✅ Found ${deliveredBottles.length} delivered bottles`);
          }
        }
        
        // Fetch bottle details for returned bottles
        let returnedBottlesList = [];
        if (returnedBarcodes.size > 0) {
          const { data: bottles, error: bottlesError } = await supabase
            .from('bottles')
            .select('barcode_number, product_code, category, group_name, type, description, gas_type, ownership, serial_number')
            .in('barcode_number', Array.from(returnedBarcodes))
            .eq('organization_id', organization.id);
          
          if (bottlesError) {
            logger.error('Error fetching returned bottles:', bottlesError);
          } else {
            returnedBottlesList = bottles || [];
            logger.log(`✅ Found ${returnedBottlesList.length} returned bottles`);
          }
        }
        
        setScannedBottles(deliveredBottles);
        setReturnedBottles(returnedBottlesList);
        // Barcodes scanned but not in bottles table = unassigned assets (admin assigns type in Order Verification)
        const knownDeliveredBarcodes = new Set((deliveredBottles || []).map(b => b.barcode_number));
        const knownReturnedBarcodes = new Set((returnedBottlesList || []).map(b => b.barcode_number));
        setUnassignedDeliveredBarcodes(Array.from(deliveredBarcodes).filter(b => !knownDeliveredBarcodes.has(b)));
        setUnassignedReturnedBarcodes(Array.from(returnedBarcodes).filter(b => !knownReturnedBarcodes.has(b)));
      } catch (error) {
        logger.error('Error fetching scanned bottles:', error);
        setScannedBottles([]);
        setReturnedBottles([]);
        setUnassignedDeliveredBarcodes([]);
        setUnassignedReturnedBarcodes([]);
      }
    }
    
    fetchScannedBottles();
  }, [importRecord, organization, filterInvoiceNumber, refreshScannedBottlesTrigger]);

  // Fetch bottle types/groups/categories/product codes/ownership when Assign to type dialog opens (for dropdowns and auto-fill)
  useEffect(() => {
    if (!assignBottleDialog.open || !organization?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('bottles')
          .select('type, group_name, description, category, product_code, ownership')
          .eq('organization_id', organization.id);
        if (error) {
          logger.error('Error fetching bottle types:', error);
          return;
        }
        if (cancelled) return;
        const rows = data || [];
        const types = [...new Set(rows.map(b => b.type).filter(Boolean))].sort();
        const groupNames = [...new Set(rows.map(b => b.group_name).filter(Boolean))].sort();
        const categories = [...new Set(rows.map(b => b.category).filter(Boolean))].sort();
        const productCodes = [...new Set(rows.map(b => b.product_code).filter(Boolean))].sort();
        const ownerships = [...new Set(rows.map(b => b.ownership).filter(Boolean))].sort();
        // First bottle per type supplies defaults for description, category, product_code, ownership when user selects that type
        const typeDefaults = {};
        rows.forEach(b => {
          if (b.type && !typeDefaults[b.type]) {
            typeDefaults[b.type] = {
              description: b.description || '',
              category: b.category || '',
              product_code: b.product_code || '',
              ownership: b.ownership || '',
              group_name: b.group_name || ''
            };
          }
        });
        setBottleTypes({ types, groupNames, categories, productCodes, ownerships, typeDefaults });
      } catch (e) {
        logger.error('Error loading bottle types:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [assignBottleDialog.open, organization?.id]);

  // Fetch customers for the change customer modal
  useEffect(() => {
    async function fetchCustomers() {
      if (!organization?.id) return;
      
      try {
        const { data: customersData, error } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('organization_id', organization.id)
          .order('name');
        
        if (error) {
          logger.error('Error fetching customers:', error);
          return;
        }
        
        setCustomers(customersData || []);
      } catch (error) {
        logger.error('Error fetching customers:', error);
      }
    }
    
    if (showCustomerModal) {
      fetchCustomers();
    }
  }, [showCustomerModal, organization]);

  // Helper function to get order number from data
  const getOrderNumber = (data) => {
    if (!data) return '';
    
    // Try direct properties first
    if (data.order_number || data.reference_number || data.invoice_number) {
      return data.order_number || data.reference_number || data.invoice_number;
    }
    
    // Try to get from rows array
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0];
      if (firstRow.order_number || firstRow.invoice_number || firstRow.reference_number || firstRow.sales_receipt_number) {
        return firstRow.order_number || firstRow.invoice_number || firstRow.reference_number || firstRow.sales_receipt_number;
      }
    }
    
    return '';
  };

  // Prefer record's saved order number (so after sales order change, UI and filters use it)
  const effectiveOrderNumber = (importRecord && getOrderNumber(parseDataField(importRecord.data))) || filterInvoiceNumber;

  // Helper function to get customer info from data
  const getCustomerInfo = (data) => {
    if (!data) return 'Unknown';
    
    // Try direct properties first
    if (data.customer_name || data.CustomerName || data.Customer) {
      return data.customer_name || data.CustomerName || data.Customer;
    }
    
    // Try to get from rows array
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
  };

  const getCustomerId = (data) => {
    if (!data) return null;
    
    // Try direct properties first
    if (data.customer_id || data.CustomerListID || data.CustomerID) {
      return data.customer_id || data.CustomerListID || data.CustomerID;
    }
    
    // Try to get from rows array
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0];
      if (firstRow.customer_id || firstRow.CustomerListID || firstRow.CustomerID) {
        return firstRow.customer_id || firstRow.CustomerListID || firstRow.CustomerID;
      }
    }
    
    // Try to get from line_items array
    if (data.line_items && data.line_items.length > 0) {
      const firstItem = data.line_items[0];
      if (firstItem.customer_id || firstItem.CustomerListID || firstItem.CustomerID) {
        return firstItem.customer_id || firstItem.CustomerListID || firstItem.CustomerID;
      }
    }
    
    return null;
  };

  // Assign bottles to customers after verification (similar to ImportApprovals.jsx)
  const assignBottlesToCustomer = async (record) => {
    try {
      logger.log('🔍 assignBottlesToCustomer called with record:', {
        id: record.id,
        data: record.data
      });
      
      const data = parseDataField(record.data);
      const rows = data.rows || data.line_items || [];
      const newCustomerName = getCustomerInfo(data);
      
      logger.log('🔍 Customer name extracted:', newCustomerName, 'Rows:', rows.length);
      
      // Extract order number
      let orderNumber = getOrderNumber(data);
      if (!orderNumber && typeof record.id === 'string' && record.id.startsWith('scanned_')) {
        orderNumber = record.id.replace('scanned_', '');
        logger.log('🔍 Extracted order number from scanned ID:', orderNumber);
      }
      
      if (!orderNumber) {
        logger.error('❌ No order number found for bottle assignment');
        throw new Error('No order number found in record');
      }
      
      // Get customer ID from customer name
      let newCustomerId = null;
      if (newCustomerName) {
        logger.log('🔍 Looking up customer:', newCustomerName, 'org:', organization?.id);
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, CustomerListID')
          .eq('name', newCustomerName)
          .eq('organization_id', organization?.id)
          .limit(1)
          .single();
        
        if (customerError) {
          logger.error('❌ Error looking up customer:', customerError);
        } else if (customer) {
          newCustomerId = customer.id || customer.CustomerListID;
          logger.log('✅ Found customer ID:', newCustomerId);
        } else {
          logger.warn('⚠️ Customer not found:', newCustomerName);
        }
      } else {
        logger.warn('⚠️ No customer name found in record');
      }
      
      // Get scanned barcodes split by SHIP (assign) vs RETURN (unassign)
      // Most-recent-wins: if same barcode has both SHIP and RETURN, only process the latest one
      const trimOrderNum = (num) => (num == null || num === '') ? '' : String(num).trim();
      const orderNumTrimmed = orderNumber ? trimOrderNum(orderNumber) : '';
      const shippedBarcodes = new Set();
      const returnedBarcodes = new Set();
      const barcodeLatestMode = new Map(); // barcode -> { mode: 'SHIP'|'RETURN', time }

      if (orderNumber) {
        logger.log('🔍 Looking for scans for order:', orderNumber, 'org:', organization?.id);

        // Scans table: filter by order_number in the query (avoids fetching entire table)
        const { data: orderScans, error: scansError } = await supabase
          .from('scans')
          .select('barcode_number, product_code, order_number, "mode", action, created_at')
          .eq('order_number', orderNumTrimmed)
          .eq('organization_id', organization?.id);
        if (!scansError && orderScans) {
          orderScans.forEach(scan => {
            if (!scan.barcode_number) return;
            const mode = (scan.mode || '').toUpperCase();
            const action = (scan.action || '').toLowerCase();
            const isReturn = mode === 'RETURN' || mode === 'PICKUP' || action === 'in';
            const modeType = isReturn ? 'RETURN' : 'SHIP';
            const time = new Date(scan.created_at || 0).getTime();
            const existing = barcodeLatestMode.get(scan.barcode_number);
            if (!existing || time >= existing.time) {
              barcodeLatestMode.set(scan.barcode_number, { mode: modeType, time });
            }
          });
        }

        // Bottle_scans table: filter by order_number in the query
        const { data: orderBottleScans, error: bottleScansError } = await supabase
          .from('bottle_scans')
          .select('bottle_barcode, cylinder_barcode, order_number, mode, created_at')
          .eq('order_number', orderNumTrimmed)
          .eq('organization_id', organization?.id);
        if (!bottleScansError && orderBottleScans) {
          orderBottleScans.forEach(scan => {
            const mode = (scan.mode || '').toUpperCase();
            const isReturn = mode === 'RETURN' || mode === 'PICKUP';
            const modeType = isReturn ? 'RETURN' : 'SHIP';
            const time = new Date(scan.created_at || 0).getTime();
            const barcodes = [scan.bottle_barcode, scan.cylinder_barcode].filter(Boolean);
            barcodes.forEach(b => {
              const existing = barcodeLatestMode.get(b);
              if (!existing || time >= existing.time) {
                barcodeLatestMode.set(b, { mode: modeType, time });
              }
            });
          });
        }

        // Assign each barcode to ONLY its latest mode (most-recent-wins)
        barcodeLatestMode.forEach(({ mode }, barcode) => {
          if (mode === 'RETURN') returnedBarcodes.add(barcode);
          else shippedBarcodes.add(barcode);
        });

        logger.log(`📦 SHIP barcodes: ${shippedBarcodes.size}, RETURN barcodes: ${returnedBarcodes.size}`);
      }

      // Per-product scan count for DNS = Inv SHP − Trk SHP (Trackabout-style)
      const scannedCountByProduct = new Map();
      if (shippedBarcodes.size > 0) {
        const { data: shippedBottles } = await supabase
          .from('bottles')
          .select('barcode_number, product_code')
          .eq('organization_id', organization?.id)
          .in('barcode_number', [...shippedBarcodes]);
        (shippedBottles || []).forEach(b => {
          const pc = (b.product_code || '').trim() || 'UNKNOWN';
          scannedCountByProduct.set(pc, (scannedCountByProduct.get(pc) || 0) + 1);
        });
      }
      
      const assignmentWarnings = [];
      const assignmentSuccesses = [];
      const processedShipped = new Set();

      // Process RETURN barcodes first: unassign bottle, close rental, ensure scan in scans table for movement history
      for (const barcode of returnedBarcodes) {
        const { data: bottles, error: bottleError } = await supabase
          .from('bottles')
          .select('*')
          .eq('barcode_number', barcode)
          .eq('organization_id', organization?.id)
          .limit(1);
        if (bottleError || !bottles?.length) continue;
        const bottle = bottles[0];

        const updateData = {
          assigned_customer: null,
          customer_name: null,
          status: 'empty',
          location: bottle.location || 'Warehouse',
          rental_start_date: null,
          rental_order_number: null,
          updated_at: new Date().toISOString()
        };
        const { error: updateError } = await supabase
          .from('bottles')
          .update(updateData)
          .eq('id', bottle.id)
          .eq('organization_id', organization?.id);
        if (updateError) {
          logger.error('Error unassigning bottle on return:', updateError);
          assignmentWarnings.push(`Failed to unassign bottle ${barcode}`);
          continue;
        }
        logger.log(`✅ Returned bottle ${barcode} (unassigned)`);
        assignmentSuccesses.push(`Bottle ${barcode} returned`);

        // Close open rental so movement history shows RETURN
        await supabase
          .from('rentals')
          .update({
            rental_end_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('bottle_barcode', barcode)
          .is('rental_end_date', null)
          .eq('organization_id', organization?.id);

        // Ensure scans table has a row for movement history (AssetDetail reads from scans)
        const { data: existingScan } = await supabase
          .from('scans')
          .select('id')
          .eq('barcode_number', barcode)
          .eq('order_number', orderNumTrimmed)
          .eq('organization_id', organization?.id)
          .limit(1);
        if (!existingScan?.length) {
          const { error: scanInsertError } = await supabase
            .from('scans')
            .insert({
              organization_id: organization?.id,
              barcode_number: barcode,
              order_number: orderNumTrimmed,
              customer_name: newCustomerName || null,
              customer_id: newCustomerId || null,
              mode: 'RETURN',
              action: 'in',
              status: 'approved',
              created_at: new Date().toISOString()
            });
          if (scanInsertError) logger.warn('Could not insert return scan for history:', scanInsertError);
        }
      }

      // Process SHIP barcodes: assign to customer
      const scannedProductCodes = new Set();
      for (const barcode of shippedBarcodes) {
        if (processedShipped.has(barcode)) continue;
        processedShipped.add(barcode);

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
          if (bottle.product_code) scannedProductCodes.add(bottle.product_code);
          const currentCustomerName = bottle.assigned_customer || bottle.customer_name;
          const isAtHome = !currentCustomerName || currentCustomerName === '' || currentCustomerName === null;

          if (isAtHome) {
            const updateData = {
              assigned_customer: newCustomerId || newCustomerName,
              customer_name: newCustomerName,
              status: 'rented',
              rental_start_date: new Date().toISOString().split('T')[0],
              rental_order_number: orderNumber,
              updated_at: new Date().toISOString()
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
              logger.log(`✅ Assigned bottle ${bottle.barcode_number} to customer ${newCustomerName}`);
              assignmentSuccesses.push(`Bottle ${bottle.barcode_number} assigned to ${newCustomerName}`);

              const { data: existingRental } = await supabase
                .from('rentals')
                .select('id')
                .eq('bottle_barcode', bottle.barcode_number)
                .is('rental_end_date', null)
                .limit(1);

              if (!existingRental || existingRental.length === 0) {
                await supabase
                  .from('rentals')
                  .insert({
                    bottle_id: bottle.id,
                    bottle_barcode: bottle.barcode_number,
                    customer_id: newCustomerId || newCustomerName,
                    customer_name: newCustomerName,
                    rental_start_date: new Date().toISOString().split('T')[0],
                    rental_end_date: null,
                    organization_id: organization?.id,
                    rental_amount: 10,
                    rental_type: 'monthly',
                    tax_code: 'GST+PST',
                    tax_rate: 0.11,
                    location: bottle.location || 'SASKATOON',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
              }
            }
          } else {
            logger.log(`ℹ️ Bottle ${bottle.barcode_number} is already assigned to ${currentCustomerName}`);
          }
        } else {
          // Bottle not in bottles table yet (scanned barcode not in system)
          // Auto-create the bottle record, assign to customer, and create rental
          logger.log(`🆕 Bottle not found for barcode ${barcode} – creating new bottle record`);
          const newBottleData = {
            barcode_number: barcode,
            organization_id: organization?.id,
            assigned_customer: newCustomerId || newCustomerName,
            customer_name: newCustomerName,
            status: 'RENTED',
            rental_start_date: new Date().toISOString().split('T')[0],
            rental_order_number: orderNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: newBottle, error: insertBottleError } = await supabase
            .from('bottles')
            .insert(newBottleData)
            .select()
            .single();

          if (insertBottleError) {
            logger.error(`Error creating bottle for barcode ${barcode}:`, insertBottleError);
            assignmentWarnings.push(`Failed to create bottle ${barcode}: ${insertBottleError.message}`);
          } else {
            logger.log(`✅ Created and assigned new bottle ${barcode} to customer ${newCustomerName}`);
            assignmentSuccesses.push(`New bottle ${barcode} created and assigned to ${newCustomerName}`);

            const { data: existingRental } = await supabase
              .from('rentals')
              .select('id')
              .eq('bottle_barcode', barcode)
              .is('rental_end_date', null)
              .limit(1);

            if (!existingRental || existingRental.length === 0) {
              await supabase
                .from('rentals')
                .insert({
                  bottle_id: newBottle.id,
                  bottle_barcode: barcode,
                  customer_id: newCustomerId || newCustomerName,
                  customer_name: newCustomerName,
                  rental_start_date: new Date().toISOString().split('T')[0],
                  rental_end_date: null,
                  organization_id: organization?.id,
                  rental_amount: 10,
                  rental_type: 'monthly',
                  tax_code: 'GST+PST',
                  tax_rate: 0.11,
                  location: 'SASKATOON',
                  status: 'active',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
            }

            // Insert scan record for movement history
            const { data: existingScan } = await supabase
              .from('scans')
              .select('id')
              .eq('barcode_number', barcode)
              .eq('order_number', orderNumTrimmed)
              .eq('organization_id', organization?.id)
              .limit(1);
            if (!existingScan?.length) {
              await supabase
                .from('scans')
                .insert({
                  organization_id: organization?.id,
                  barcode_number: barcode,
                  order_number: orderNumTrimmed,
                  customer_name: newCustomerName || null,
                  customer_id: newCustomerId || null,
                  mode: 'SHIP',
                  action: 'out',
                  status: 'approved',
                  created_at: new Date().toISOString()
                });
            }
          }
        }
      }
      
      // DNS (Delivered Not Scanned): per Trackabout, DNS = Inv SHP − Trk SHP per product
      for (const row of rows) {
        const invShipped = parseInt(row.qty_out || row.QtyOut || row.shipped || row.Shipped || row.quantity || 0, 10);
        if (invShipped <= 0) continue;
        const rowBarcode = row.barcode || row.barcode_number || row.bottle_barcode || '';
        const productCode = (row.product_code || '').trim() || '';
        if (!productCode && !rowBarcode) continue;
        const scannedOut = productCode ? (scannedCountByProduct.get(productCode) || 0) : 0;
        const dnsCount = Math.max(0, invShipped - scannedOut);
        for (let i = 0; i < dnsCount; i++) {
          const dnsProductCode = productCode || rowBarcode || 'DNS';
          const dnsDescription = row.description || productCode || 'Delivered Not Scanned';
          const { error: dnsError } = await supabase
            .from('rentals')
            .insert({
              organization_id: organization?.id,
              customer_id: newCustomerId || newCustomerName,
              customer_name: newCustomerName,
              is_dns: true,
              dns_product_code: dnsProductCode,
              dns_description: dnsDescription,
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
          if (dnsError) {
            logger.error('Error creating DNS rental:', dnsError);
            assignmentWarnings.push(`Failed to create DNS rental for ${dnsProductCode}: ${dnsError.message}`);
          } else {
            logger.log(`✅ Created DNS rental for order ${orderNumber} product ${dnsProductCode}`);
            assignmentSuccesses.push(`DNS: ${dnsProductCode} – ${dnsDescription} (customer charged rental)`);
          }
        }
      }

      // Show summary messages
      if (assignmentSuccesses.length > 0) {
        logger.log(`✅ Successfully assigned ${assignmentSuccesses.length} bottle(s)`);
      }
      
      if (assignmentWarnings.length > 0) {
        logger.warn(`⚠️ ${assignmentWarnings.length} warning(s):\n${assignmentWarnings.join('\n')}`);
      }
      
      return { successes: assignmentSuccesses, warnings: assignmentWarnings };
    } catch (error) {
      logger.error('Error assigning bottles to customer:', error);
      throw error;
    }
  };

  // Handle record actions
  const handleRecordAction = async (action) => {
    setActionMessage(`Processing: ${action}`);
    logger.log('handleRecordAction: invoiceNumber =', invoiceNumber);
    logger.log('handleRecordAction: organization =', organization);
    
    if (!invoiceNumber) {
      setActionMessage('Error: No invoice number found. Aborting action.');
      return;
    }
    
    if (!organization?.id) {
      setActionMessage('Error: No organization found. Aborting action.');
      return;
    }
    
    // Check if this is a scanned-only record
    const isScannedOnly = invoiceNumber && invoiceNumber.startsWith('scanned_');
    
    // Prevent verification unless shp/rtn and trk values match (only for non-scanned records)
    if (action === 'Verify This Record' && !isScannedOnly) {
      const importData = importRecord?.data || {};
      const summary = importData.summary || {};
      if (!(summary.shp === summary.rtn && summary.shp === summary.trk)) {
        setActionMessage('Cannot verify: SHP, RTN, and TRK values do not match.');
        return;
      }
    }
    try {
      switch (action) {
        case 'Verify This Record': {
          const originalId = getOriginalId(invoiceNumber);

          // Collect barcodes from scans
          const importData = importRecord?.data || {};
          const scannedItems = importData.scannedItems || importData.items || [];
          const shipBarcodes = [];
          const returnBarcodes = [];

          // Get scans from bottle_scans/scans tables for this order
          const orderNum = importData.order_number || importData.invoice_number || invoiceNumber;
          const { data: scanRecords } = await supabase
            .from('bottle_scans')
            .select('bottle_barcode, mode')
            .eq('organization_id', organization?.id)
            .eq('order_number', orderNum);

          if (scanRecords) {
            for (const scan of scanRecords) {
              if (scan.mode === 'SHIP' || scan.mode === 'DELIVERY') {
                shipBarcodes.push(scan.bottle_barcode);
              } else if (scan.mode === 'RETURN' || scan.mode === 'PICKUP') {
                returnBarcodes.push(scan.bottle_barcode);
              }
            }
          }

          const customerName = importData.customer_name || importData.customer || '';
          const customerId = importData.customer_id || importData.CustomerListID || customerName;

          let recordId = originalId;
          if (typeof originalId === 'string') {
            const numericPart = originalId.match(/\d+/);
            recordId = numericPart ? parseInt(numericPart[0], 10) : originalId;
          }

          // Use the transactional RPC — assignment + status update in one transaction
          try {
            const result = await bottleAssignmentService.assignBottles({
              organizationId: organization?.id,
              customerId,
              customerName,
              shipBarcodes,
              returnBarcodes,
              importRecordId: (!isScannedOnly && recordId) ? recordId : null,
              importTable: 'imported_invoices',
            });

            if (!result.success) {
              setActionMessage(`Verification failed: ${result.error}`);
              return;
            }

            const d = result.data || {};
            const totalAssigned = (d.shipped || 0) + (d.returned || 0) + (d.created || 0);
            const skipped = d.skipped || 0;
            const errors = d.errors || [];

            if (errors.length > 0 && totalAssigned === 0) {
              setActionMessage(`Warning: ${errors.join('; ')}`);
            } else {
              setActionMessage(
                `Record verified successfully! ${totalAssigned} bottle(s) processed` +
                (skipped > 0 ? `, ${skipped} skipped` : '') +
                (errors.length > 0 ? ` (${errors.length} warnings)` : '')
              );
            }
          } catch (assignError) {
            logger.error('Error during verification:', assignError);
            setActionMessage(`Verification failed: ${assignError.message}`);
            return;
          }

          // If scanned-only (no import record), manually mark as approved
          if (isScannedOnly && recordId) {
            await supabase
              .from('imported_invoices')
              .update({ status: 'approved', approved_at: new Date().toISOString() })
              .eq('id', recordId);
          }

          setTimeout(() => navigate('/import-approvals'), 2000);
          break;
        }
        case 'Unverify This Record': {
          const originalId = getOriginalId(invoiceNumber);
          if (invoiceNumber && invoiceNumber.startsWith('scanned_')) {
            const orderNumber = invoiceNumber.replace('scanned_', '');
            const { error: scanErr } = await supabase
              .from('scans')
              .update({ status: 'pending', verified_at: null, verified_by: null })
              .eq('order_number', orderNumber)
              .eq('organization_id', organization.id);
            if (scanErr) {
              setActionMessage(`Error unverifying scans: ${scanErr.message}`);
              return;
            }
            setActionMessage('Scanned record unverified. It will appear in pending again.');
            setTimeout(() => navigate('/import-approvals', { state: { refetch: true } }), 1500);
            break;
          }
          if (!originalId) {
            setActionMessage('Cannot unverify: invalid record ID.');
            return;
          }
          const recordId = typeof originalId === 'string' && originalId.match(/\d+/) ? parseInt(originalId.match(/\d+/)[0], 10) : originalId;

          // Use the transactional RPC to reverse bottle assignments + delete DNS records
          try {
            const unverifyResult = await bottleAssignmentService.unverifyOrder({
              importRecordId: recordId,
              importTable: 'imported_invoices',
              organizationId: organization?.id,
            });

            if (!unverifyResult.success) {
              logger.warn('RPC unverify warning:', unverifyResult.error);
            } else {
              const ud = unverifyResult.data || {};
              logger.log(`Unverify RPC: ${ud.bottles_restored || 0} bottles restored, ${ud.dns_records_deleted || 0} DNS records deleted`);
            }
          } catch (rpcErr) {
            logger.warn('Unverify RPC not available, falling back to status-only update:', rpcErr);
          }

          // Also update the import record data (verified_order_numbers tracking)
          const { data: existingRow, error: fetchErr } = await supabase
            .from('imported_invoices')
            .select('id, data, status')
            .eq('id', recordId)
            .single();
          if (fetchErr || !existingRow) {
            setActionMessage(`Failed to load record: ${fetchErr?.message || 'not found'}`);
            return;
          }
          const existingData = typeof existingRow.data === 'string' ? JSON.parse(existingRow.data || '{}') : (existingRow.data || {});
          const verifiedOrderNumbers = Array.isArray(existingData.verified_order_numbers) ? [...existingData.verified_order_numbers] : [];
          const currentOrder = effectiveOrderNumber || existingData.order_number || existingData.reference_number;
          const trimOrder = (n) => (n == null || n === '') ? '' : String(n).trim();
          const currentOrderTrimmed = currentOrder ? trimOrder(currentOrder) : '';
          const newVerified = currentOrderTrimmed
            ? verifiedOrderNumbers.filter(v => trimOrder(v) !== currentOrderTrimmed)
            : verifiedOrderNumbers;
          const newData = { ...existingData, verified_order_numbers: newVerified };
          const allOrdersVerified = newVerified.length === 0;
          const updatePayload = allOrdersVerified
            ? { data: newData, status: 'pending', approved_at: null }
            : { data: newData };
          const { error: updateErr } = await supabase
            .from('imported_invoices')
            .update(updatePayload)
            .eq('id', recordId);
          if (updateErr) {
            setActionMessage(`Error unverifying record: ${updateErr.message}`);
            return;
          }
          if (currentOrderTrimmed) {
            const { data: scansList } = await supabase
              .from('scans')
              .select('id')
              .eq('order_number', currentOrderTrimmed)
              .eq('organization_id', organization.id);
            if (scansList && scansList.length > 0) {
              await supabase
                .from('scans')
                .update({ status: 'pending', verified_at: null, verified_by: null })
                .in('id', scansList.map(s => s.id));
            }
          }
          setActionMessage('Record unverified. Bottle assignments have been reversed.');
          setImportRecord({ ...existingRow, data: newData, status: allOrdersVerified ? 'pending' : existingRow.status });
          setTimeout(() => navigate('/import-approvals', { state: { refetch: true } }), 1500);
          break;
        }
        case 'Delete This Record':
          if (window.confirm('Are you sure you want to delete this record?')) {
            if (isScannedOnly) {
              // For scanned-only records, delete from bottle_scans
              const orderNumber = invoiceNumber.replace('scanned_', '');
              await supabase
                .from('bottle_scans')
                .delete()
                .eq('order_number', orderNumber);
            } else {
              await supabase
                .from('imported_invoices')
                .delete()
                .eq('id', invoiceNumber);
            }
            setActionMessage('Record deleted successfully!');
            setTimeout(() => navigate('/import-approvals'), 1500);
          }
          break;
        case 'Mark for Investigation':
          if (!isScannedOnly) {
            await supabase
              .from('imported_invoices')
              .update({ status: 'investigation', notes: 'Marked for investigation' })
              .eq('id', invoiceNumber);
            setActionMessage('Record marked for investigation!');
          } else {
            setActionMessage('Cannot mark scanned-only records for investigation');
          }
          break;
        case 'Change Customer':
          setShowCustomerModal(true);
          break;
        case 'Change Record Date and Time':
          if (typeof invoiceNumber === 'string' && invoiceNumber.startsWith('scanned_')) {
            setActionMessage('Scanned-only records are not in the database yet. Approve or import this record first to change the date.');
            setTimeout(() => setActionMessage(''), 5000);
          } else {
            setShowDateModal(true);
          }
          break;
        case 'Change Sales Order Number':
          if (typeof invoiceNumber === 'string' && invoiceNumber.startsWith('scanned_')) {
            setActionMessage('Scanned-only records are not in the database yet. Approve or import this record first to change the sales order number.');
            setTimeout(() => setActionMessage(''), 5000);
          } else {
            setShowSalesOrderModal(true);
          }
          break;
        case 'Change PO Number':
          if (typeof invoiceNumber === 'string' && invoiceNumber.startsWith('scanned_')) {
            setActionMessage('Scanned-only records are not in the database yet. Approve or import this record first to change the PO number.');
            setTimeout(() => setActionMessage(''), 5000);
          } else {
            setShowPOModal(true);
          }
          break;
        case 'Change Location':
          if (typeof invoiceNumber === 'string' && invoiceNumber.startsWith('scanned_')) {
            setActionMessage('Scanned-only records are not in the database yet. Approve or import this record first to change the location.');
            setTimeout(() => setActionMessage(''), 5000);
          } else {
            setShowLocationModal(true);
          }
          break;
        case 'Create or Delete Correction Sales Order':
          setActionMessage('Correction Sales Order - Feature coming soon!');
          break;
        default:
          setActionMessage(`${action} - Feature coming soon!`);
      }
    } catch (error) {
      setActionMessage(`Error: ${error.message}`);
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Handle customer change
  const handleCustomerChange = async () => {
    if (!selectedCustomer) {
      setActionMessage('Please select a customer');
      return;
    }

    const isScannedOnly = invoiceNumber && invoiceNumber.startsWith('scanned_');

    try {
      setActionMessage('Updating customer...');
      
      // Get the selected customer details
      const customer = customers.find(c => c.CustomerListID === selectedCustomer);
      if (!customer) {
        setActionMessage('Selected customer not found');
        return;
      }

      if (isScannedOnly) {
        // For scanned-only records, update bottle_scans table
        const orderNumber = invoiceNumber.replace('scanned_', '');
        await supabase
          .from('bottle_scans')
          .update({ 
            customer_name: customer.name,
            customer_id: customer.CustomerListID 
          })
          .eq('order_number', orderNumber);
        
        setActionMessage('Customer updated successfully!');
        setShowCustomerModal(false);
        // Reload the page to reflect changes
        window.location.reload();
        return;
      }

      // Update the import record data with the new customer
      const importData = importRecord?.data || {};
      const updatedRows = (importData.rows || importData.line_items || []).map(row => ({
        ...row,
        customer_id: customer.CustomerListID,
        customer_name: customer.name
      }));

      // Update the imported_invoices table
      const { error } = await supabase
        .from('imported_invoices')
        .update({
          data: {
            ...importData,
            rows: updatedRows,
            summary: {
              ...importData.summary,
              customer_id: customer.CustomerListID,
              customer_name: customer.name
            }
          }
        })
        .eq('id', invoiceNumber);

      if (error) {
        throw error;
      }

      // Refresh the import record
      const { data: updatedRecord } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('id', invoiceNumber)
        .single();

      if (updatedRecord) {
        setImportRecord(updatedRecord);
      }

      setActionMessage(`Customer changed to ${customer.name} successfully!`);
      setShowCustomerModal(false);
      setSelectedCustomer('');
      setCustomerSearch('');
      
    } catch (error) {
      logger.error('Error changing customer:', error);
      setActionMessage(`Error: ${error.message}`);
    }
    
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Handle date change
  const handleDateChange = async () => {
    if (!newDate) {
      setActionMessage('Please enter a valid date');
      return;
    }

    if (typeof invoiceNumber === 'string' && invoiceNumber.startsWith('scanned_')) {
      setActionMessage('Scanned-only records are not in the database yet. Approve or import this record first to change the date.');
      setTimeout(() => setActionMessage(''), 5000);
      return;
    }

    try {
      setActionMessage('Updating date...');
      
      const importData = importRecord?.data || {};
      const updatedRows = (importData.rows || importData.line_items || []).map(row => ({
        ...row,
        date: newDate
      }));

      const { error } = await supabase
        .from('imported_invoices')
        .update({
          data: {
            ...importData,
            rows: updatedRows,
            summary: {
              ...importData.summary,
              date: newDate
            }
          }
        })
        .eq('id', invoiceNumber);

      if (error) throw error;

      // Refresh the import record
      const { data: updatedRecord } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('id', invoiceNumber)
        .single();

      if (updatedRecord) {
        setImportRecord(updatedRecord);
      }

      setActionMessage('Date updated successfully!');
      setShowDateModal(false);
      setNewDate('');
      
    } catch (error) {
      logger.error('Error updating date:', error);
      setActionMessage(`Error: ${error.message}`);
    }
    
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Handle sales order number change — update by record id, then sync scans
  const handleSalesOrderChange = async () => {
    if (!newSalesOrder?.trim()) {
      setActionMessage('Please enter a sales order number');
      return;
    }

    if (typeof invoiceNumber === 'string' && invoiceNumber.startsWith('scanned_')) {
      setActionMessage('Scanned-only records are not in the database yet. Approve or import this record first to change the sales order number.');
      setTimeout(() => setActionMessage(''), 5000);
      return;
    }

    if (!organization?.id || !importRecord?.id) {
      setActionMessage('Cannot update: missing organization or record.');
      return;
    }

    const trim = (s) => (s == null || s === '') ? '' : String(s).trim();
    const currentOrder = trim(getOrderNumber(parseDataField(importRecord?.data)));
    if (!currentOrder) {
      setActionMessage('Cannot determine current order number for this record.');
      return;
    }

    const newOrder = newSalesOrder.trim();
    setShowSalesOrderModal(false);
    setNewSalesOrder('');

    try {
      setActionMessage('Updating sales order number...');
      const importData = parseDataField(importRecord?.data || {});
      const rows = importData.rows || importData.line_items || [];
      const updatedRows = rows.map(row => {
        const r = { ...row, reference_number: newOrder, invoice_number: newOrder, order_number: newOrder };
        if (row.sales_receipt_number) r.sales_receipt_number = newOrder;
        return r;
      });

      const payload = {
        data: {
          ...importData,
          order_number: newOrder,
          reference_number: newOrder,
          invoice_number: newOrder,
          rows: updatedRows,
          summary: {
            ...(importData.summary || {}),
            reference_number: newOrder,
            invoice_number: newOrder,
            order_number: newOrder
          }
        }
      };

      const currentId = importRecord.id;

      // 1) Update the current record by id (try invoices first, then receipts)
      let updatedRecord = null;
      const { data: upInv, error: errInvById } = await supabase
        .from('imported_invoices')
        .update(payload)
        .eq('id', currentId)
        .select()
        .maybeSingle();

      if (errInvById) {
        setActionMessage(`Update failed: ${errInvById.message}`);
        logger.error('imported_invoices update error:', errInvById);
        return;
      }
      if (upInv) {
        updatedRecord = upInv;
      } else {
        const { data: upRec, error: errRecById } = await supabase
          .from('imported_sales_receipts')
          .update(payload)
          .eq('id', currentId)
          .select()
          .maybeSingle();
        if (errRecById) {
          setActionMessage(`Update failed: ${errRecById.message}`);
          logger.error('imported_sales_receipts update error:', errRecById);
          return;
        }
        updatedRecord = upRec;
      }

      if (!updatedRecord) {
        setActionMessage('Record not found in database. The id may not match imported_invoices or imported_sales_receipts.');
        return;
      }

      setImportRecord(updatedRecord);

      // 2) Verify the save by re-fetching the same row
      const verifyTable = upInv ? 'imported_invoices' : 'imported_sales_receipts';
      const { data: verified, error: verifyErr } = await supabase
        .from(verifyTable)
        .select('id, data')
        .eq('id', currentId)
        .single();
      const savedOrder = verified?.data ? trim(getOrderNumber(parseDataField(verified.data))) : '';
      if (verifyErr || savedOrder !== newOrder) {
        logger.warn('Sales order verify after save:', { verifyErr, savedOrder, expected: newOrder });
      }

      // 3) Update any other pending imports with the same old order number
      const invoiceIds = [];
      const receiptIds = [];
      const { data: invList } = await supabase
        .from('imported_invoices')
        .select('id, data')
        .eq('organization_id', organization.id)
        .neq('status', 'approved')
        .neq('status', 'rejected')
        .neq('status', 'verified');
      for (const row of invList || []) {
        if (row.id === currentId) continue;
        const data = parseDataField(row.data);
        if (trim(getOrderNumber(data)) === currentOrder) invoiceIds.push(row.id);
      }
      const { data: recList } = await supabase
        .from('imported_sales_receipts')
        .select('id, data')
        .eq('organization_id', organization.id)
        .neq('status', 'approved')
        .neq('status', 'rejected')
        .neq('status', 'verified');
      for (const row of recList || []) {
        if (row.id === currentId) continue;
        const data = parseDataField(row.data);
        if (trim(getOrderNumber(data)) === currentOrder) receiptIds.push(row.id);
      }
      if (invoiceIds.length > 0) await supabase.from('imported_invoices').update(payload).in('id', invoiceIds);
      if (receiptIds.length > 0) await supabase.from('imported_sales_receipts').update(payload).in('id', receiptIds);

      // 4) Move scans and bottle_scans from old order to new order (RPC runs in DB so RLS cannot block it)
      let scansMoved = false;
      if (currentOrder && newOrder && currentOrder !== newOrder) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_scans_order_number', {
          p_old_order: currentOrder,
          p_new_order: newOrder,
          p_org_id: organization.id
        });
        if (rpcError) {
          logger.warn('update_scans_order_number RPC failed:', rpcError);
          setActionMessage(`Order saved. Run migration 20250218_update_scans_order_number_rpc in Supabase SQL Editor to merge the two cards.`);
          const currentOrderNum = /^\d+$/.test(currentOrder) ? parseInt(currentOrder, 10) : null;
          let scanIdsRes = await supabase.from('scans').select('id').eq('organization_id', organization.id).eq('order_number', currentOrder);
          if ((!scanIdsRes.data || scanIdsRes.data.length === 0) && currentOrderNum != null) {
            scanIdsRes = await supabase.from('scans').select('id').eq('organization_id', organization.id).eq('order_number', currentOrderNum);
          }
          let bottleIdsRes = await supabase.from('bottle_scans').select('id').eq('organization_id', organization.id).eq('order_number', currentOrder);
          if ((!bottleIdsRes.data || bottleIdsRes.data.length === 0) && currentOrderNum != null) {
            bottleIdsRes = await supabase.from('bottle_scans').select('id').eq('organization_id', organization.id).eq('order_number', currentOrderNum);
          }
          const scanIds = (scanIdsRes.data || []).map((r) => r.id).filter(Boolean);
          const bottleIds = (bottleIdsRes.data || []).map((r) => r.id).filter(Boolean);
          if (scanIds.length > 0) {
            const e = await supabase.from('scans').update({ order_number: newOrder }).in('id', scanIds);
            if (!e.error) scansMoved = true;
          }
          if (bottleIds.length > 0) {
            const e = await supabase.from('bottle_scans').update({ order_number: newOrder }).in('id', bottleIds);
            if (!e.error) scansMoved = true;
          }
        } else if (rpcData?.ok) {
          scansMoved = (rpcData.scans_updated || 0) + (rpcData.bottle_scans_updated || 0) > 0;
        }
      }

      setActionMessage(scansMoved ? `Saved. Order ${currentOrder} → ${newOrder}; scans moved. Returning to list...` : `Saved. Order number is now ${newOrder}. Returning to list...`);
      setTimeout(() => navigate('/import-approvals', { state: { refetch: true } }), 1500);
    } catch (error) {
      logger.error('Error updating sales order number:', error);
      setActionMessage(`Error: ${error?.message || String(error)}`);
    }
  };

  // Handle PO number change
  const handlePOChange = async () => {
    if (!newPO) {
      setActionMessage('Please enter a PO number');
      return;
    }

    if (typeof invoiceNumber === 'string' && invoiceNumber.startsWith('scanned_')) {
      setActionMessage('Scanned-only records are not in the database yet. Approve or import this record first to change the PO number.');
      setTimeout(() => setActionMessage(''), 5000);
      return;
    }

    try {
      setActionMessage('Updating PO number...');
      
      const importData = importRecord?.data || {};
      const updatedRows = (importData.rows || importData.line_items || []).map(row => ({
        ...row,
        po_number: newPO
      }));

      const { error } = await supabase
        .from('imported_invoices')
        .update({
          data: {
            ...importData,
            rows: updatedRows,
            summary: {
              ...importData.summary,
              po_number: newPO
            }
          }
        })
        .eq('id', invoiceNumber);

      if (error) throw error;

      // Refresh the import record
      const { data: updatedRecord } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('id', invoiceNumber)
        .single();

      if (updatedRecord) {
        setImportRecord(updatedRecord);
      }

      setActionMessage('PO number updated successfully!');
      setShowPOModal(false);
      setNewPO('');
      
    } catch (error) {
      logger.error('Error updating PO number:', error);
      setActionMessage(`Error: ${error.message}`);
    }
    
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Handle location change
  const handleLocationChange = async () => {
    if (!newLocation) {
      setActionMessage('Please enter a location');
      return;
    }

    if (typeof invoiceNumber === 'string' && invoiceNumber.startsWith('scanned_')) {
      setActionMessage('Scanned-only records are not in the database yet. Approve or import this record first to change the location.');
      setTimeout(() => setActionMessage(''), 5000);
      return;
    }

    try {
      setActionMessage('Updating location...');
      
      const importData = importRecord?.data || {};
      const updatedRows = (importData.rows || importData.line_items || []).map(row => ({
        ...row,
        location: newLocation
      }));

      const { error } = await supabase
        .from('imported_invoices')
        .update({
          data: {
            ...importData,
            rows: updatedRows,
            summary: {
              ...importData.summary,
              location: newLocation
            }
          },
          location: newLocation
        })
        .eq('id', invoiceNumber);

      if (error) throw error;

      // Refresh the import record
      const { data: updatedRecord } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('id', invoiceNumber)
        .single();

      if (updatedRecord) {
        setImportRecord(updatedRecord);
      }

      setActionMessage('Location updated successfully!');
      setShowLocationModal(false);
      setNewLocation('');
      
    } catch (error) {
      logger.error('Error updating location:', error);
      setActionMessage(`Error: ${error.message}`);
    }
    
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Handle asset actions
  const handleAssetAction = (action) => {
    // Get order number from import record
    const orderNumber = effectiveOrderNumber ||
                       (invoiceNumber && invoiceNumber.startsWith('scanned_') ? invoiceNumber.replace('scanned_', '') : null);
    
    switch (action) {
      case 'Switch Deliver / Return':
        if (selectedAssets.size === 0) {
          setActionMessage('Please select at least one asset to switch');
          setTimeout(() => setActionMessage(''), 3000);
          return;
        }
        setSwitchModeDialog({ open: true });
        break;
      case 'Detach Assets':
        if (selectedAssets.size === 0) {
          setActionMessage('Please select at least one asset to detach');
          setTimeout(() => setActionMessage(''), 3000);
          return;
        }
        setDetachAssetsDialog({ open: true });
        break;
      case 'Attach by Barcode or by Serial #':
        setAttachBarcodeDialog({ open: true, barcode: '', mode: 'SHIP' });
        break;
      case 'Attach Not-Scanned Assets':
        setAttachBarcodeDialog({ open: true, barcode: '', mode: 'SHIP' });
        break;
      case 'Reclassify Assets':
        if (selectedAssets.size === 0) {
          setActionMessage('Please select at least one asset to reclassify');
          setTimeout(() => setActionMessage(''), 3000);
          return;
        }
        setReclassifyDialog({ open: true, newType: '', newGroup: '' });
        break;
      case 'Change Asset Properties':
        if (selectedAssets.size === 0) {
          setActionMessage('Please select at least one asset to change properties');
          setTimeout(() => setActionMessage(''), 3000);
          return;
        }
        setReclassifyDialog({ open: true, newType: '', newGroup: '' });
        break;
      case 'Replace Incorrect Asset':
        if (selectedAssets.size !== 1) {
          setActionMessage('Please select exactly one asset to replace');
          setTimeout(() => setActionMessage(''), 3000);
          return;
        }
        setAttachBarcodeDialog({ open: true, barcode: '', mode: 'REPLACE', replacingBarcode: Array.from(selectedAssets)[0] });
        break;
      case 'Move to Another Sales Order':
        if (selectedAssets.size === 0) {
          setActionMessage('Please select at least one asset to move');
          setTimeout(() => setActionMessage(''), 3000);
          return;
        }
        setMoveOrderDialog({ open: true, newOrderNumber: '' });
        break;
      default:
        setActionMessage(`${action} - Feature not yet implemented`);
        setTimeout(() => setActionMessage(''), 3000);
    }
  };

  // Toggle asset selection
  const toggleAssetSelection = (barcode) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(barcode)) {
        newSet.delete(barcode);
      } else {
        newSet.add(barcode);
      }
      return newSet;
    });
  };

  // Select all assets
  const selectAllAssets = () => {
    const allBarcodes = new Set();
    scannedBottles.forEach(b => b.barcode_number && allBarcodes.add(b.barcode_number));
    returnedBottles.forEach(b => b.barcode_number && allBarcodes.add(b.barcode_number));
    unassignedDeliveredBarcodes.forEach(b => allBarcodes.add(b));
    unassignedReturnedBarcodes.forEach(b => allBarcodes.add(b));
    setSelectedAssets(allBarcodes);
  };

  // Clear all selections
  const clearAssetSelection = () => {
    setSelectedAssets(new Set());
  };

  // Switch mode (Deliver <-> Return)
  const handleSwitchMode = async () => {
    if (selectedAssets.size === 0 || !organization?.id) return;
    
    setAssetActionSaving(true);
    const orderNumber = effectiveOrderNumber ||
                       (invoiceNumber && invoiceNumber.startsWith('scanned_') ? invoiceNumber.replace('scanned_', '') : null);
    
    try {
      const barcodeArray = Array.from(selectedAssets);
      let successCount = 0;
      
      for (const barcode of barcodeArray) {
        // Find current mode for this barcode
        const isCurrentlyDelivered = scannedBottles.some(b => b.barcode_number === barcode) || 
                                     unassignedDeliveredBarcodes.includes(barcode);
        const newMode = isCurrentlyDelivered ? 'RETURN' : 'SHIP';
        
        // Update in bottle_scans
        const { error: bottleScansError } = await supabase
          .from('bottle_scans')
          .update({ mode: newMode })
          .eq('organization_id', organization.id)
          .eq('bottle_barcode', barcode)
          .eq('order_number', orderNumber);
        
        if (bottleScansError) {
          logger.error(`Error updating bottle_scans for ${barcode}:`, bottleScansError);
        }
        
        // Also update in scans table
        const { error: scansError } = await supabase
          .from('scans')
          .update({ mode: newMode, action: newMode === 'SHIP' ? 'out' : 'in' })
          .eq('organization_id', organization.id)
          .eq('barcode_number', barcode)
          .eq('order_number', orderNumber);
        
        if (scansError) {
          logger.error(`Error updating scans for ${barcode}:`, scansError);
        }
        
        successCount++;
      }
      
      setActionMessage(`Successfully switched ${successCount} asset(s)`);
      setSwitchModeDialog({ open: false });
      setSelectedAssets(new Set());
      setRefreshScannedBottlesTrigger(prev => prev + 1);
    } catch (error) {
      logger.error('Error switching mode:', error);
      setActionMessage(`Error: ${error.message}`);
    } finally {
      setAssetActionSaving(false);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  // Detach assets from order
  const handleDetachAssets = async () => {
    if (selectedAssets.size === 0 || !organization?.id) return;
    
    setAssetActionSaving(true);
    const orderNumber = effectiveOrderNumber ||
                       (invoiceNumber && invoiceNumber.startsWith('scanned_') ? invoiceNumber.replace('scanned_', '') : null);
    
    try {
      const barcodeArray = Array.from(selectedAssets);
      let successCount = 0;
      
      for (const barcode of barcodeArray) {
        // Delete from bottle_scans
        const { error: bottleScansError } = await supabase
          .from('bottle_scans')
          .delete()
          .eq('organization_id', organization.id)
          .eq('bottle_barcode', barcode)
          .eq('order_number', orderNumber);
        
        if (bottleScansError) {
          logger.error(`Error deleting from bottle_scans for ${barcode}:`, bottleScansError);
        }
        
        // Also delete from scans table
        const { error: scansError } = await supabase
          .from('scans')
          .delete()
          .eq('organization_id', organization.id)
          .eq('barcode_number', barcode)
          .eq('order_number', orderNumber);
        
        if (scansError) {
          logger.error(`Error deleting from scans for ${barcode}:`, scansError);
        }
        
        successCount++;
      }
      
      setActionMessage(`Successfully detached ${successCount} asset(s)`);
      setDetachAssetsDialog({ open: false });
      setSelectedAssets(new Set());
      setRefreshScannedBottlesTrigger(prev => prev + 1);
    } catch (error) {
      logger.error('Error detaching assets:', error);
      setActionMessage(`Error: ${error.message}`);
    } finally {
      setAssetActionSaving(false);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  // Attach barcode to order
  const handleAttachBarcode = async () => {
    if (!attachBarcodeDialog.barcode?.trim() || !organization?.id) {
      setActionMessage('Please enter a barcode');
      setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    
    setAssetActionSaving(true);
    const orderNumber = effectiveOrderNumber ||
                       (invoiceNumber && invoiceNumber.startsWith('scanned_') ? invoiceNumber.replace('scanned_', '') : null);
    const customerName = importRecord?.data?.customer_name || filterCustomerName || '';
    const customerId = importRecord?.data?.customer_id || filterCustomerId || null;
    
    try {
      const barcode = attachBarcodeDialog.barcode.trim();
      const mode = attachBarcodeDialog.mode === 'REPLACE' ? 'SHIP' : attachBarcodeDialog.mode;
      
      // If replacing, first detach the old barcode
      if (attachBarcodeDialog.mode === 'REPLACE' && attachBarcodeDialog.replacingBarcode) {
        await supabase
          .from('bottle_scans')
          .delete()
          .eq('organization_id', organization.id)
          .eq('bottle_barcode', attachBarcodeDialog.replacingBarcode)
          .eq('order_number', orderNumber);
        
        await supabase
          .from('scans')
          .delete()
          .eq('organization_id', organization.id)
          .eq('barcode_number', attachBarcodeDialog.replacingBarcode)
          .eq('order_number', orderNumber);
      }
      
      // Insert into bottle_scans
      const { error: bottleScansError } = await supabase
        .from('bottle_scans')
        .insert([{
          organization_id: organization.id,
          bottle_barcode: barcode,
          order_number: orderNumber,
          customer_name: customerName,
          customer_id: customerId,
          mode: mode,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        }]);
      
      if (bottleScansError) {
        throw bottleScansError;
      }
      
      // Also insert into scans table
      const { error: scansError } = await supabase
        .from('scans')
        .insert([{
          organization_id: organization.id,
          barcode_number: barcode,
          order_number: orderNumber,
          customer_name: customerName,
          customer_id: customerId,
          mode: mode,
          action: mode === 'SHIP' ? 'out' : 'in',
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
      
      if (scansError) {
        logger.warn('Warning: Failed to insert into scans table:', scansError);
      }
      
      const message = attachBarcodeDialog.mode === 'REPLACE' 
        ? `Successfully replaced asset with ${barcode}`
        : `Successfully attached ${barcode} to order`;
      setActionMessage(message);
      setAttachBarcodeDialog({ open: false, barcode: '', mode: 'SHIP' });
      setSelectedAssets(new Set());
      setRefreshScannedBottlesTrigger(prev => prev + 1);
    } catch (error) {
      logger.error('Error attaching barcode:', error);
      setActionMessage(`Error: ${error.message}`);
    } finally {
      setAssetActionSaving(false);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  // Reclassify selected assets
  const handleReclassifyAssets = async () => {
    if (selectedAssets.size === 0 || !organization?.id) return;
    if (!reclassifyDialog.newType?.trim()) {
      setActionMessage('Please select a new type');
      setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    
    setAssetActionSaving(true);
    
    try {
      const barcodeArray = Array.from(selectedAssets);
      let successCount = 0;
      
      for (const barcode of barcodeArray) {
        // Update the bottle record
        const updateData = {
          type: reclassifyDialog.newType.trim(),
        };
        if (reclassifyDialog.newGroup?.trim()) {
          updateData.group_name = reclassifyDialog.newGroup.trim();
        }
        
        const { error } = await supabase
          .from('bottles')
          .update(updateData)
          .eq('organization_id', organization.id)
          .eq('barcode_number', barcode);
        
        if (error) {
          logger.error(`Error updating bottle ${barcode}:`, error);
        } else {
          successCount++;
        }
      }
      
      setActionMessage(`Successfully reclassified ${successCount} asset(s)`);
      setReclassifyDialog({ open: false, newType: '', newGroup: '' });
      setSelectedAssets(new Set());
      setRefreshScannedBottlesTrigger(prev => prev + 1);
    } catch (error) {
      logger.error('Error reclassifying assets:', error);
      setActionMessage(`Error: ${error.message}`);
    } finally {
      setAssetActionSaving(false);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  // Move assets to another order
  const handleMoveToOrder = async () => {
    if (selectedAssets.size === 0 || !organization?.id) return;
    if (!moveOrderDialog.newOrderNumber?.trim()) {
      setActionMessage('Please enter a new order number');
      setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    
    setAssetActionSaving(true);
    const currentOrderNumber = effectiveOrderNumber ||
                              (invoiceNumber && invoiceNumber.startsWith('scanned_') ? invoiceNumber.replace('scanned_', '') : null);
    const newOrderNumber = moveOrderDialog.newOrderNumber.trim();
    
    try {
      const barcodeArray = Array.from(selectedAssets);
      let successCount = 0;
      
      for (const barcode of barcodeArray) {
        // Update in bottle_scans
        const { error: bottleScansError } = await supabase
          .from('bottle_scans')
          .update({ order_number: newOrderNumber })
          .eq('organization_id', organization.id)
          .eq('bottle_barcode', barcode)
          .eq('order_number', currentOrderNumber);
        
        if (bottleScansError) {
          logger.error(`Error updating bottle_scans for ${barcode}:`, bottleScansError);
        }
        
        // Also update in scans table
        const { error: scansError } = await supabase
          .from('scans')
          .update({ order_number: newOrderNumber })
          .eq('organization_id', organization.id)
          .eq('barcode_number', barcode)
          .eq('order_number', currentOrderNumber);
        
        if (scansError) {
          logger.error(`Error updating scans for ${barcode}:`, scansError);
        }
        
        successCount++;
      }
      
      setActionMessage(`Successfully moved ${successCount} asset(s) to order ${newOrderNumber}`);
      setMoveOrderDialog({ open: false, newOrderNumber: '' });
      setSelectedAssets(new Set());
      setRefreshScannedBottlesTrigger(prev => prev + 1);
    } catch (error) {
      logger.error('Error moving assets:', error);
      setActionMessage(`Error: ${error.message}`);
    } finally {
      setAssetActionSaving(false);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" bgcolor="#f5f5f5">
      <CardSkeleton count={1} />
    </Box>
  );
  
  if (error) return (
    <Box p={3} bgcolor="#fff3f3">
      <Alert severity="error">Error: {error}</Alert>
    </Box>
  );
  
  if (!importRecord) return (
    <Box p={3} bgcolor="#f5f5f5">
      <Typography variant="h6" color="text.secondary">No import found for this ID.</Typography>
    </Box>
  );

  // Parse the data field
  const importData = importRecord.data || {};
  // Try to support both possible keys
  const allDelivered = importData.delivered || importData.rows || importData.line_items || [];
  const allReturned = importData.returned || [];
  const summary = importData.summary || {};

  // Filter line items based on invoice number and customer, with deduplication
  const filterLineItems = (items) => {
    logger.log('filterLineItems: effectiveOrderNumber =', effectiveOrderNumber, '(from record or URL)');
    logger.log('filterLineItems: filterCustomerName =', filterCustomerName);
    logger.log('filterLineItems: filterCustomerId =', filterCustomerId);
    logger.log('filterLineItems: total items before filter =', items.length);
    
    // First, deduplicate by barcode to prevent duplicate entries
    const seenBarcodes = new Set();
    const deduplicatedItems = items.filter(item => {
      const barcode = item.barcode || item.barcode_number || item.Barcode || item.BarcodeNumber;
      if (!barcode) return true; // Keep items without barcodes
      
      if (seenBarcodes.has(barcode)) {
        logger.log('⚠️ Skipping duplicate item with barcode:', barcode);
        return false;
      }
      seenBarcodes.add(barcode);
      return true;
    });
    
    logger.log(`📊 Deduplicated items: ${items.length} -> ${deduplicatedItems.length}`);
    
    if (!effectiveOrderNumber && !filterCustomerName && !filterCustomerId) {
      logger.log('filterLineItems: No filters applied, returning deduplicated items');
      return deduplicatedItems; // No filters, return deduplicated items
    }
    
    const filteredItems = deduplicatedItems.filter(item => {
      const itemCustomerName = item.customer_name || item.customerName;
      const itemCustomerId = item.customer_id || item.customerId;

      // Check all possible order number fields — any match is sufficient
      const normOrd = (v) => (v != null && v !== '') ? String(v).trim() : null;
      const effNorm = normOrd(effectiveOrderNumber);
      const invoiceMatch = !effNorm || [
        item.invoice_number, item.order_number, item.reference_number,
        item.InvoiceNumber, item.ReferenceNumber, item.sales_receipt_number
      ].some(v => normOrd(v) === effNorm);

      const customerNameMatch = !filterCustomerName || itemCustomerName === filterCustomerName;
      const customerIdMatch = !filterCustomerId || itemCustomerId === filterCustomerId;
      
      const matches = invoiceMatch && (customerNameMatch || customerIdMatch);
      
      if (matches) {
        logger.log('filterLineItems: MATCH - Customer:', itemCustomerName, 'Product:', item.product_code);
      }
      
      return matches;
    });
    
    logger.log('filterLineItems: filtered items count =', filteredItems.length);
    return filteredItems;
  };

  const delivered = filterLineItems(allDelivered);
  const returned = filterLineItems(allReturned);

  // Helper function to get asset info for a barcode or product code
  const getAssetInfo = (identifier) => {
    if (!identifier) {
      logger.warn('⚠️ No identifier provided to getAssetInfo');
      return {};
    }
    const trimmed = String(identifier).trim();
    logger.log('🔍 Looking up asset info for:', trimmed, 'Map keys:', Object.keys(assetInfoMap));
    const info = assetInfoMap[trimmed] || {};
    logger.log('🔍 Found asset info:', info);
    return info;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'investigation': return 'info';
      default: return 'default';
    }
  };

  // Get display name for uploaded by (importRecord is non-null past guard above)
  const getUploadedByDisplay = () => {
    if (!importRecord) return '—';
    if (uploadedByUser?.full_name && uploadedByUser.full_name !== importRecord.uploaded_by) {
      return uploadedByUser.full_name;
    }
    if (uploadedByUser?.email && uploadedByUser.email !== importRecord.uploaded_by) {
      return uploadedByUser.email;
    }
    return importRecord.uploaded_by ?? '—';
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: '#f5f5f5',
      p: 3 
    }}>
      <Paper sx={{ 
        borderRadius: 3, 
        overflow: 'hidden', 
        boxShadow: '0 2px 12px 0 rgba(16,24,40,0.06)',
        background: 'var(--bg-main)',
        border: '1px solid var(--divider)'
      }}>
        {/* Header */}
        <Box sx={{ 
          background: 'var(--bg-main)', 
          color: 'var(--text-main)', 
          p: 3,
          borderBottom: '1.5px solid var(--divider)'
        }}>
          <Button 
            variant="outlined" 
            sx={{ 
              color: 'var(--accent)', 
              borderColor: 'var(--accent)', 
              mb: 2,
              borderWidth: '2px',
              '&:hover': { borderColor: 'var(--accent)', backgroundColor: 'var(--bg-card)' }
            }} 
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          {effectiveOrderNumber && (
            <Typography variant="subtitle1" sx={{ opacity: 0.7, color: 'var(--text-main)' }}>
              Invoice: {effectiveOrderNumber} | Customer: {filterCustomerName || filterCustomerId}
            </Typography>
          )}
        </Box>

        {/* Action Message */}
        {actionMessage && (
          <Alert 
            severity="info" 
            sx={{ m: 2, borderRadius: 2, border: '1px solid #333' }}
            onClose={() => setActionMessage('')}
          >
            {actionMessage}
          </Alert>
        )}

        <Box p={3}>
          <Grid container spacing={3} alignItems="flex-start">
            {/* Left: Delivery Info and Tables */}
            <Grid item xs={12} md={9}>
              <Typography variant="h5" fontWeight={700} mb={3} color="black" sx={{ 
                borderBottom: '3px solid #333', 
                pb: 1
              }}>
                Delivery Information
              </Typography>
              
              {/* Summary Card */}
              <Paper sx={{ 
                mb: 3, 
                p: 3, 
                borderRadius: 2,
                background: 'var(--bg-card)',
                border: '1px solid var(--divider)',
                boxShadow: '0 2px 8px 0 rgba(16,24,40,0.04)'
              }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip 
                      label={importRecord.status} 
                      color="default"
                      size="small"
                      sx={{ 
                        border: '2px solid #333',
                        fontWeight: 600,
                        bgcolor: 'white',
                        color: 'black'
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Uploaded By</Typography>
                    <Typography variant="body2" sx={{ 
                      p: 1, 
                      bgcolor: 'white', 
                      borderRadius: 1, 
                      border: '1px solid #ddd',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      {getUploadedByDisplay()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Scan time (local)</Typography>
                    <Typography variant="body2" sx={{ 
                      p: 1, 
                      bgcolor: 'white', 
                      borderRadius: 1, 
                      border: '1px solid #ddd',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      {(() => {
                        const raw = importRecord.uploaded_at ?? importRecord.created_at ?? importRecord?.data?.summary?.uploaded_at;
                        if (raw == null || raw === '') return '—';
                        const d = new Date(raw);
                        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                      })()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Notes Section */}
              {importRecord.notes && (
                <Alert severity="info" sx={{ 
                  mb: 3, 
                  borderRadius: 2, 
                  border: '1px solid var(--accent)',
                  bgcolor: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}>
                  {importRecord.notes}
                </Alert>
              )}

              {/* Delivered Assets - Show Scanned Bottles + Unassigned (scanned but not in bottles table) */}
              {/* Selection Controls */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" onClick={selectAllAssets}>
                  Select All
                </Button>
                <Button size="small" variant="outlined" onClick={clearAssetSelection} disabled={selectedAssets.size === 0}>
                  Clear Selection
                </Button>
                {selectedAssets.size > 0 && (
                  <Chip 
                    label={`${selectedAssets.size} asset(s) selected`} 
                    color="primary" 
                    size="small"
                  />
                )}
              </Box>

              <Typography variant="h6" fontWeight={700} mb={2} color="var(--text-main)" sx={{ 
                borderBottom: '1px solid var(--divider)', 
                pb: 1
              }}>
                Delivered Assets ({scannedBottles.length + unassignedDeliveredBarcodes.length})
              </Typography>
              <Paper sx={{ 
                mb: 4, 
                borderRadius: 2, 
                overflow: 'hidden',
                border: '1px solid var(--divider)',
                boxShadow: '0 2px 8px 0 rgba(16,24,40,0.04)'
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ 
                      backgroundColor: '#f8f9fa',
                      borderBottom: '3px solid #333'
                    }}>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed', width: 50 }}>Select</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Group</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Product Code</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Ownership</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Barcode</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Serial Number</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scannedBottles.length === 0 && unassignedDeliveredBarcodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ 
                          py: 4, 
                          color: 'text.secondary',
                          border: '2px dashed #e0e6ed',
                          bgcolor: '#fafbfc'
                        }}>
                          No delivered assets found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {scannedBottles.map((bottle, i) => {
                          const rowKey = bottle.barcode_number || `bottle_${i}`;
                          const isSelected = bottle.barcode_number && selectedAssets.has(bottle.barcode_number);
                          return (
                            <TableRow key={rowKey} sx={{ 
                              backgroundColor: isSelected ? '#e3f2fd' : (i % 2 === 0 ? '#ffffff' : '#f8f9fa'),
                              '&:hover': { backgroundColor: isSelected ? '#bbdefb' : '#f0f0f0' },
                              borderBottom: '1px solid #e0e6ed'
                            }}>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>
                                <Checkbox 
                                  checked={isSelected}
                                  onChange={() => bottle.barcode_number && toggleAssetSelection(bottle.barcode_number)}
                                  size="small"
                                  disabled={!bottle.barcode_number}
                                />
                              </TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.category || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.group_name || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.type || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>
                                <Chip label={bottle.product_code || ''} size="small" variant="outlined" sx={{ 
                                  border: '2px solid #333',
                                  fontWeight: 600,
                                  bgcolor: 'white',
                                  color: 'black'
                                }} />
                              </TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.description || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.ownership || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.barcode_number || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.serial_number || ''}</TableCell>
                              <TableCell />
                            </TableRow>
                          );
                        })}
                        {unassignedDeliveredBarcodes.map((barcode, i) => {
                          const isSelected = selectedAssets.has(barcode);
                          return (
                            <TableRow key={`unassigned_delivered_${barcode}`} sx={{ 
                              backgroundColor: isSelected ? '#e3f2fd' : '#FEF3C7',
                              borderBottom: '1px solid #e0e6ed'
                            }}>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>
                                <Checkbox 
                                  checked={isSelected}
                                  onChange={() => toggleAssetSelection(barcode)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell colSpan={3} sx={{ borderRight: '1px solid #e0e6ed', fontWeight: 600, color: '#92400E' }}>Unassigned asset</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }} />
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }} colSpan={2}>Scanned barcode not in system – assign type below</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{barcode}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }} />
                              <TableCell>
                                <Button size="small" variant="contained" color="primary" onClick={() => { setAssignBottleForm({ type: '', group_name: '', description: '', category: '', product_code: '', ownership: '' }); setAssignBottleDialog({ open: true, barcode, section: 'delivered' }); }}>
                                  Assign to type
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    )}
                  </TableBody>
                </Table>
              </Paper>

              {/* Returned Assets */}
              <Typography variant="h6" fontWeight={700} mb={2} color="var(--text-main)" sx={{ 
                borderBottom: '1px solid var(--divider)', 
                pb: 1
              }}>
                Returned Assets ({returnedBottles.length + returned.length + unassignedReturnedBarcodes.length})
              </Typography>
              <Paper sx={{ 
                borderRadius: 2, 
                overflow: 'hidden',
                border: '1px solid var(--divider)',
                boxShadow: '0 2px 8px 0 rgba(16,24,40,0.04)'
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ 
                      backgroundColor: '#f8f9fa',
                      borderBottom: '3px solid #333'
                    }}>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed', width: 50 }}>Select</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Group</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Product Code</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Ownership</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Barcode</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Serial Number</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {returnedBottles.length === 0 && returned.length === 0 && unassignedReturnedBarcodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ 
                          py: 4, 
                          color: 'text.secondary',
                          border: '2px dashed #e0e6ed',
                          bgcolor: '#fafbfc'
                        }}>
                          No returned assets found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {/* Show scanned returned bottles first */}
                        {returnedBottles.map((bottle, i) => {
                          const rowKey = bottle.barcode_number || `returned_bottle_${i}`;
                          const isSelected = bottle.barcode_number && selectedAssets.has(bottle.barcode_number);
                          return (
                            <TableRow key={rowKey} sx={{ 
                              backgroundColor: isSelected ? '#e3f2fd' : (i % 2 === 0 ? '#ffffff' : '#f8f9fa'),
                              '&:hover': { backgroundColor: isSelected ? '#bbdefb' : '#f0f0f0' },
                              borderBottom: '1px solid #e0e6ed'
                            }}>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>
                                <Checkbox 
                                  checked={isSelected}
                                  onChange={() => bottle.barcode_number && toggleAssetSelection(bottle.barcode_number)}
                                  size="small"
                                  disabled={!bottle.barcode_number}
                                />
                              </TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.category || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.group_name || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.type || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>
                                <Chip label={bottle.product_code || ''} size="small" variant="outlined" sx={{ 
                                  border: '2px solid #333',
                                  fontWeight: 600,
                                  bgcolor: 'white',
                                  color: 'black'
                                }} />
                              </TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.description || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.ownership || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.barcode_number || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{bottle.serial_number || ''}</TableCell>
                              <TableCell />
                            </TableRow>
                          );
                        })}
                        {/* Then show returned items from invoice data */}
                        {returned.map((row, i) => {
                          const assetInfo = getAssetInfo(row.product_code);
                          const isSelected = row.barcode && selectedAssets.has(row.barcode);
                          return (
                            <TableRow key={i} sx={{ 
                              backgroundColor: isSelected ? '#e3f2fd' : (i % 2 === 0 ? '#ffffff' : '#f8f9fa'),
                              '&:hover': { backgroundColor: isSelected ? '#bbdefb' : '#f0f0f0' },
                              borderBottom: '1px solid #e0e6ed'
                            }}>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>
                                <Checkbox 
                                  checked={isSelected}
                                  onChange={() => row.barcode && toggleAssetSelection(row.barcode)}
                                  size="small"
                                  disabled={!row.barcode}
                                />
                              </TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.category || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.group || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.type || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>
                                <Chip label={row.product_code} size="small" variant="outlined" sx={{ 
                                  border: '2px solid #333',
                                  fontWeight: 600,
                                  bgcolor: 'white',
                                  color: 'black'
                                }} />
                              </TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.description || row.description || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{row.ownership || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{row.barcode || ''}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{row.serial_number || ''}</TableCell>
                              <TableCell />
                            </TableRow>
                          );
                        })}
                        {unassignedReturnedBarcodes.map((barcode, i) => {
                          const isSelected = selectedAssets.has(barcode);
                          return (
                            <TableRow key={`unassigned_returned_${barcode}`} sx={{ 
                              backgroundColor: isSelected ? '#e3f2fd' : '#FEF3C7',
                              borderBottom: '1px solid #e0e6ed'
                            }}>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>
                                <Checkbox 
                                  checked={isSelected}
                                  onChange={() => toggleAssetSelection(barcode)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell colSpan={3} sx={{ borderRight: '1px solid #e0e6ed', fontWeight: 600, color: '#92400E' }}>Unassigned asset</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }} />
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }} colSpan={2}>Scanned barcode not in system – assign type below</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{barcode}</TableCell>
                              <TableCell sx={{ borderRight: '1px solid #e0e6ed' }} />
                              <TableCell>
                                <Button size="small" variant="contained" color="primary" onClick={() => { setAssignBottleForm({ type: '', group_name: '', description: '', category: '', product_code: '', ownership: '' }); setAssignBottleDialog({ open: true, barcode, section: 'returned' }); }}>
                                  Assign to type
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>

            {/* Assign to type dialog for unassigned scanned barcodes */}
            <Dialog open={assignBottleDialog.open} onClose={() => setAssignBottleDialog({ open: false, barcode: null, section: null })} maxWidth="sm" fullWidth>
              <DialogTitle>Assign barcode to type</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This barcode was scanned during delivery but is not in the system. Create a bottle record and assign a type so it appears in the order.
                </Typography>
                <TextField label="Barcode" value={assignBottleDialog.barcode || ''} fullWidth sx={{ mb: 2 }} InputProps={{ readOnly: true }} />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={assignBottleForm.type}
                    label="Type"
                    onChange={(e) => {
                      const type = e.target.value;
                      const defaults = bottleTypes.typeDefaults?.[type] || {};
                      setAssignBottleForm(prev => ({
                        ...prev,
                        type,
                        description: defaults.description ?? prev.description,
                        category: defaults.category ?? prev.category,
                        product_code: defaults.product_code ?? prev.product_code,
                        ownership: defaults.ownership ?? prev.ownership,
                        group_name: defaults.group_name ?? prev.group_name
                      }));
                    }}
                  >
                    <MenuItem value="">Select type...</MenuItem>
                    {(bottleTypes.types || []).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Category</InputLabel>
                  <Select value={assignBottleForm.category} label="Category" onChange={(e) => setAssignBottleForm(prev => ({ ...prev, category: e.target.value }))}>
                    <MenuItem value="">Select category (optional)</MenuItem>
                    {(bottleTypes.categories || []).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Product code</InputLabel>
                  <Select value={assignBottleForm.product_code} label="Product code" onChange={(e) => setAssignBottleForm(prev => ({ ...prev, product_code: e.target.value }))}>
                    <MenuItem value="">Select product code (optional)</MenuItem>
                    {(bottleTypes.productCodes || []).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Ownership</InputLabel>
                  <Select value={assignBottleForm.ownership} label="Ownership" onChange={(e) => setAssignBottleForm(prev => ({ ...prev, ownership: e.target.value }))}>
                    <MenuItem value="">Select ownership (optional)</MenuItem>
                    {(bottleTypes.ownerships || []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Group</InputLabel>
                  <Select value={assignBottleForm.group_name} label="Group" onChange={(e) => setAssignBottleForm(prev => ({ ...prev, group_name: e.target.value }))}>
                    <MenuItem value="">Select group (optional)</MenuItem>
                    {(bottleTypes.groupNames || []).map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Description (optional)" value={assignBottleForm.description} fullWidth onChange={(e) => setAssignBottleForm(prev => ({ ...prev, description: e.target.value }))} />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAssignBottleDialog({ open: false, barcode: null, section: null })}>Cancel</Button>
                <Button 
                  variant="contained" 
                  onClick={async () => {
                    if (!assignBottleDialog.barcode || !organization?.id) return;
                    if (!assignBottleForm.type?.trim()) {
                      setActionMessage('Please select a type');
                      setTimeout(() => setActionMessage(''), 3000);
                      return;
                    }
                    setAssignBottleSaving(true);
                    try {
                      const { error } = await supabase.from('bottles').insert([{
                        barcode_number: assignBottleDialog.barcode,
                        organization_id: organization.id,
                        type: assignBottleForm.type.trim(),
                        group_name: assignBottleForm.group_name?.trim() || null,
                        description: assignBottleForm.description?.trim() || null,
                        category: assignBottleForm.category?.trim() || null,
                        product_code: assignBottleForm.product_code?.trim() || null,
                        ownership: assignBottleForm.ownership?.trim() || null,
                        status: 'in_stock',
                      }]);
                      if (error) throw error;
                      setActionMessage('Bottle created successfully. Refreshing list...');
                      setAssignBottleDialog({ open: false, barcode: null, section: null });
                      setRefreshScannedBottlesTrigger(prev => prev + 1);
                    } catch (e) {
                      logger.error('Error creating bottle:', e);
                      setActionMessage(e?.message || 'Failed to create bottle');
                    } finally {
                      setAssignBottleSaving(false);
                      setTimeout(() => setActionMessage(''), 4000);
                    }
                  }} 
                  disabled={assignBottleSaving}
                >
                  {assignBottleSaving ? 'Saving...' : 'Save'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Switch Deliver/Return Dialog */}
            <Dialog open={switchModeDialog.open} onClose={() => setSwitchModeDialog({ open: false })} maxWidth="sm" fullWidth>
              <DialogTitle>Switch Deliver / Return</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This will switch the selected assets between Delivered and Returned status.
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {selectedAssets.size} asset(s) selected
                </Alert>
                <Typography variant="body2">
                  Assets currently marked as <strong>Delivered</strong> will become <strong>Returned</strong>, and vice versa.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSwitchModeDialog({ open: false })}>Cancel</Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleSwitchMode}
                  disabled={assetActionSaving}
                >
                  {assetActionSaving ? 'Switching...' : 'Switch Mode'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Detach Assets Dialog */}
            <Dialog open={detachAssetsDialog.open} onClose={() => setDetachAssetsDialog({ open: false })} maxWidth="sm" fullWidth>
              <DialogTitle>Detach Assets</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This will remove the selected assets from this order. The scan records will be deleted.
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {selectedAssets.size} asset(s) will be detached
                </Alert>
                <Typography variant="body2" color="error">
                  This action cannot be undone. The assets will need to be re-scanned to attach them to any order.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetachAssetsDialog({ open: false })}>Cancel</Button>
                <Button 
                  variant="contained" 
                  color="error"
                  onClick={handleDetachAssets}
                  disabled={assetActionSaving}
                >
                  {assetActionSaving ? 'Detaching...' : 'Detach Assets'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Attach by Barcode Dialog */}
            <Dialog open={attachBarcodeDialog.open} onClose={() => setAttachBarcodeDialog({ open: false, barcode: '', mode: 'SHIP' })} maxWidth="sm" fullWidth>
              <DialogTitle>
                {attachBarcodeDialog.mode === 'REPLACE' ? 'Replace Asset' : 'Attach Asset by Barcode'}
              </DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {attachBarcodeDialog.mode === 'REPLACE' 
                    ? `Enter the barcode of the asset to replace ${attachBarcodeDialog.replacingBarcode}`
                    : 'Enter a barcode or serial number to attach to this order.'
                  }
                </Typography>
                <TextField 
                  label="Barcode / Serial Number" 
                  value={attachBarcodeDialog.barcode} 
                  onChange={(e) => setAttachBarcodeDialog(prev => ({ ...prev, barcode: e.target.value }))}
                  fullWidth 
                  sx={{ mb: 2 }}
                  autoFocus
                />
                {attachBarcodeDialog.mode !== 'REPLACE' && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Mode</InputLabel>
                    <Select 
                      value={attachBarcodeDialog.mode} 
                      label="Mode"
                      onChange={(e) => setAttachBarcodeDialog(prev => ({ ...prev, mode: e.target.value }))}
                    >
                      <MenuItem value="SHIP">Delivered (SHIP)</MenuItem>
                      <MenuItem value="RETURN">Returned (RETURN)</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAttachBarcodeDialog({ open: false, barcode: '', mode: 'SHIP' })}>Cancel</Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleAttachBarcode}
                  disabled={assetActionSaving || !attachBarcodeDialog.barcode?.trim()}
                >
                  {assetActionSaving ? 'Attaching...' : (attachBarcodeDialog.mode === 'REPLACE' ? 'Replace' : 'Attach')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Reclassify Assets Dialog */}
            <Dialog open={reclassifyDialog.open} onClose={() => setReclassifyDialog({ open: false, newType: '', newGroup: '' })} maxWidth="sm" fullWidth>
              <DialogTitle>Reclassify Assets</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Change the type and/or group of the selected assets.
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {selectedAssets.size} asset(s) selected
                </Alert>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>New Type</InputLabel>
                  <Select 
                    value={reclassifyDialog.newType} 
                    label="New Type"
                    onChange={(e) => setReclassifyDialog(prev => ({ ...prev, newType: e.target.value }))}
                  >
                    <MenuItem value="">Select type...</MenuItem>
                    {(bottleTypes.types || []).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>New Group (optional)</InputLabel>
                  <Select 
                    value={reclassifyDialog.newGroup} 
                    label="New Group (optional)"
                    onChange={(e) => setReclassifyDialog(prev => ({ ...prev, newGroup: e.target.value }))}
                  >
                    <MenuItem value="">Keep current group</MenuItem>
                    {(bottleTypes.groupNames || []).map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setReclassifyDialog({ open: false, newType: '', newGroup: '' })}>Cancel</Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleReclassifyAssets}
                  disabled={assetActionSaving || !reclassifyDialog.newType?.trim()}
                >
                  {assetActionSaving ? 'Reclassifying...' : 'Reclassify'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Move to Another Order Dialog */}
            <Dialog open={moveOrderDialog.open} onClose={() => setMoveOrderDialog({ open: false, newOrderNumber: '' })} maxWidth="sm" fullWidth>
              <DialogTitle>Move to Another Sales Order</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Move the selected assets to a different sales order.
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {selectedAssets.size} asset(s) selected
                </Alert>
                <TextField 
                  label="New Order Number" 
                  value={moveOrderDialog.newOrderNumber} 
                  onChange={(e) => setMoveOrderDialog(prev => ({ ...prev, newOrderNumber: e.target.value }))}
                  fullWidth 
                  sx={{ mb: 2 }}
                  autoFocus
                />
                <Typography variant="body2" color="text.secondary">
                  The assets will be moved from the current order to the new order number.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setMoveOrderDialog({ open: false, newOrderNumber: '' })}>Cancel</Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleMoveToOrder}
                  disabled={assetActionSaving || !moveOrderDialog.newOrderNumber?.trim()}
                >
                  {assetActionSaving ? 'Moving...' : 'Move Assets'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Right: Record/Asset Options */}
            <Grid item xs={12} md={3}>
              {/* Record Options */}
              <Paper sx={{ 
                p: 2, 
                mb: 3, 
                borderRadius: 2,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--divider)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
              }}>
                <Typography variant="h6" fontWeight={700} mb={2} sx={{ 
                  color: 'var(--text-main)',
                  borderBottom: '1px solid var(--divider)',
                  pb: 1
                }}>
                  RECORD OPTIONS
                </Typography>
                <List dense>
                  {(() => {
                    const data = parseDataField(importRecord?.data || {});
                    const currentOrder = effectiveOrderNumber || data.order_number || data.reference_number;
                    const verifiedOrders = data.verified_order_numbers || [];
                    const trimOrder = (n) => (n == null || n === '') ? '' : String(n).trim();
                    const currentOrderTrimmed = currentOrder ? trimOrder(currentOrder) : '';
                    const isRecordVerified = importRecord?.status === 'approved' ||
                      (currentOrderTrimmed && verifiedOrders.some(v => trimOrder(v) === currentOrderTrimmed));
                    const recordOptionsList = [
                      isRecordVerified ? 'Unverify This Record' : 'Verify This Record',
                      'Delete This Record',
                      'Change Record Date and Time',
                      'Change Customer',
                      'Change Sales Order Number',
                      'Change PO Number',
                      'Change Location',
                      'Create or Delete Correction Sales Order',
                      'Mark for Investigation',
                    ];
                    return recordOptionsList.map((label) => (
                    <ListItem 
                      button 
                      key={label} 
                      onClick={() => handleRecordAction(label)}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 0.5,
                        border: '1px solid var(--divider)',
                        '&:hover': { 
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--accent)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <ListItemText 
                        primary={label} 
                        primaryTypographyProps={{ fontSize: '0.875rem', color: 'var(--text-main)' }}
                      />
                    </ListItem>
                    ));
                  })()}
                </List>
              </Paper>

              {/* Asset Options */}
              <Paper sx={{ 
                p: 2, 
                borderRadius: 2,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--divider)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
              }}>
                <Typography variant="h6" fontWeight={700} mb={2} sx={{ 
                  color: 'var(--text-main)',
                  borderBottom: '1px solid var(--divider)',
                  pb: 1
                }}>
                  ASSET OPTIONS
                </Typography>
                <List dense>
                  {[
                    'Reclassify Assets',
                    'Change Asset Properties',
                    'Attach Not-Scanned Assets',
                    'Attach by Barcode or by Serial #',
                    'Replace Incorrect Asset',
                    'Switch Deliver / Return',
                    'Detach Assets',
                    'Move to Another Sales Order',
                  ].map((label) => (
                    <ListItem 
                      button 
                      key={label} 
                      onClick={() => handleAssetAction(label)}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 0.5,
                        border: '1px solid var(--divider)',
                        '&:hover': { 
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--accent)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <ListItemText 
                        primary={label} 
                        primaryTypographyProps={{ fontSize: '0.875rem', color: 'var(--text-main)' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Customer Change Modal */}
      {showCustomerModal && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setShowCustomerModal(false)}
        >
          <Paper
            sx={{
              p: 3,
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              borderRadius: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" fontWeight={700} mb={2}>
              Change Customer
            </Typography>
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              Select a new customer for this import record. This will update all line items in the record.
            </Typography>

            {/* Search Input */}
            <Box mb={2}>
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </Box>

            {/* Customer List */}
            <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 3 }}>
              {customers
                .filter(customer => 
                  customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  customer.CustomerListID?.toLowerCase().includes(customerSearch.toLowerCase())
                )
                .map((customer) => (
                  <Box
                    key={customer.CustomerListID}
                    sx={{
                      p: 2,
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      backgroundColor: selectedCustomer === customer.CustomerListID ? '#e3f2fd' : 'white',
                      '&:hover': {
                        backgroundColor: selectedCustomer === customer.CustomerListID ? '#e3f2fd' : '#f5f5f5'
                      }
                    }}
                    onClick={() => setSelectedCustomer(customer.CustomerListID)}
                  >
                    <Typography variant="body1" fontWeight={600}>
                      {customer.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {customer.CustomerListID}
                    </Typography>
                  </Box>
                ))}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowCustomerModal(false);
                  setSelectedCustomer('');
                  setCustomerSearch('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCustomerChange}
                disabled={!selectedCustomer}
                sx={{
                  backgroundColor: '#1976d2',
                  '&:hover': { backgroundColor: '#1565c0' }
                }}
              >
                Change Customer
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Date Change Modal */}
      {showDateModal && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setShowDateModal(false)}
        >
          <Paper
            sx={{
              p: 3,
              maxWidth: 400,
              width: '90%',
              borderRadius: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" fontWeight={700} mb={2}>
              Change Record Date and Time
            </Typography>
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              Enter the new date for this import record.
            </Typography>

            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowDateModal(false);
                  setNewDate('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleDateChange}
                disabled={!newDate}
                sx={{
                  backgroundColor: '#1976d2',
                  '&:hover': { backgroundColor: '#1565c0' }
                }}
              >
                Update Date
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Sales Order Number Change Modal */}
      {showSalesOrderModal && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setShowSalesOrderModal(false)}
        >
          <Paper
            sx={{
              p: 3,
              maxWidth: 400,
              width: '90%',
              borderRadius: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" fontWeight={700} mb={2}>
              Change Sales Order Number
            </Typography>
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              Enter the new sales order number for this import record.
            </Typography>

            <input
              type="text"
              placeholder="Enter sales order number..."
              value={newSalesOrder}
              onChange={(e) => setNewSalesOrder(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowSalesOrderModal(false);
                  setNewSalesOrder('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSalesOrderChange}
                disabled={!newSalesOrder}
                sx={{
                  backgroundColor: '#1976d2',
                  '&:hover': { backgroundColor: '#1565c0' }
                }}
              >
                Update Sales Order
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* PO Number Change Modal */}
      {showPOModal && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setShowPOModal(false)}
        >
          <Paper
            sx={{
              p: 3,
              maxWidth: 400,
              width: '90%',
              borderRadius: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" fontWeight={700} mb={2}>
              Change PO Number
            </Typography>
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              Enter the new PO number for this import record.
            </Typography>

            <input
              type="text"
              placeholder="Enter PO number..."
              value={newPO}
              onChange={(e) => setNewPO(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowPOModal(false);
                  setNewPO('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handlePOChange}
                disabled={!newPO}
                sx={{
                  backgroundColor: '#1976d2',
                  '&:hover': { backgroundColor: '#1565c0' }
                }}
              >
                Update PO Number
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Location Change Modal */}
      {showLocationModal && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setShowLocationModal(false)}
        >
          <Paper
            sx={{
              p: 3,
              maxWidth: 400,
              width: '90%',
              borderRadius: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" fontWeight={700} mb={2}>
              Change Location
            </Typography>
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              Select the new location for this import record.
            </Typography>

            <select
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            >
              <option value="">Select a location...</option>
              <option value="SASKATOON">SASKATOON</option>
              <option value="REGINA">REGINA</option>
              <option value="PRINCE ALBERT">PRINCE ALBERT</option>
              <option value="MOOSE JAW">MOOSE JAW</option>
              <option value="SWIFT CURRENT">SWIFT CURRENT</option>
              <option value="YORKTON">YORKTON</option>
              <option value="NORTH BATTLEFORD">NORTH BATTLEFORD</option>
            </select>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowLocationModal(false);
                  setNewLocation('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleLocationChange}
                disabled={!newLocation}
                sx={{
                  backgroundColor: '#1976d2',
                  '&:hover': { backgroundColor: '#1565c0' }
                }}
              >
                Update Location
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
} 