import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Grid, List, ListItem, ListItemText, Divider, Alert, Chip, IconButton, Tooltip, Card, CardContent, CardHeader, Accordion, AccordionSummary, AccordionDetails, Badge } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Person as PersonIcon, Receipt as ReceiptIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { CardSkeleton } from '../components/SmoothLoading';

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

// Function to split grouped import data into individual records (professional workflow)
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
      // Keep original ID for database operations, use displayId for React keys
      originalId: importRecord.id, // Original database ID
      id: importRecord.id, // Keep original ID for database operations
      displayId: `${importRecord.id}_${index}`, // Use for React keys only
      splitIndex: index, // Track which split this is
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

export default function ImportApprovalDetail({ invoiceNumber: propInvoiceNumber }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const invoiceNumber = propInvoiceNumber || params.id; // Changed from params.invoiceNumber to params.id
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [importRecord, setImportRecord] = useState(null);
  const [individualRecords, setIndividualRecords] = useState([]);
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
        const mockRecord = {
          id: invoiceNumber,
          data: {
            rows: scans.map(scan => ({
              order_number: scan.order_number,
              customer_name: scan.customer_name,
              product_code: scan.bottle_barcode,
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
              uploaded_at: scans[0].created_at || new Date().toISOString()
            }
          },
          uploaded_by: scans[0].user_id || 'scanner',
          status: 'scanned_only',
          created_at: scans[0].created_at || new Date().toISOString(),
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
      
      // Split the import record into individual customer/invoice records
      if (data) {
        const splitRecords = splitImportIntoIndividualRecords(data);
        setIndividualRecords(splitRecords);
        logger.log(`Split import ${data.id} into ${splitRecords.length} individual records:`, splitRecords);
      }
      
      setLoading(false);
    }
    fetchImport();
  }, [invoiceNumber]);

  // Fetch user information for uploaded_by
  useEffect(() => {
    async function fetchUserInfo() {
      if (!importRecord?.uploaded_by) return;
      
      try {
        // Try to get user info from profiles table first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', importRecord.uploaded_by)
          .single();
        
        if (!profileError && profile) {
          setUploadedByUser(profile);
          return;
        }
        
        // Fallback: try to get from profiles table
        const { data: fallbackProfile, error: fallbackProfileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', importRecord.uploaded_by)
          .single();
        
        if (!fallbackProfileError && fallbackProfile) {
          setUploadedByUser({
            full_name: fallbackProfile.full_name || fallbackProfile.email,
            email: fallbackProfile.email
          });
          return;
        }
        
        // If all else fails, just show the email or ID
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
          // Skip database update for scanned-only records
          if (!isScannedOnly) {
            // 1. Update imported_invoices status
            await supabase
              .from('imported_invoices')
              .update({ status: 'approved', approved_at: new Date().toISOString() })
              .eq('id', invoiceNumber);
          }

          // 2. Assign delivered bottles to customer and add to rentals
          const importData = importRecord?.data || {};
          const delivered = (importData.delivered || importData.rows || importData.line_items || []).filter(item => item.barcode_number && item.customer_id);
          for (const item of delivered) {
            // Assign bottle to customer
            await supabase
              .from('bottles')
              .update({ assigned_customer: item.customer_id })
              .eq('barcode_number', item.barcode_number)
              .eq('organization_id', organization.id);
            // Add to rentals if not already active
            const { data: existingRental } = await supabase
              .from('rentals')
              .select('*')
              .eq('bottle_barcode', item.barcode_number)
              .eq('organization_id', organization.id)
              .is('rental_end_date', null)
              .single();
            if (!existingRental) {
              await supabase
                .from('rentals')
                .insert({
                  bottle_barcode: item.barcode_number,
                  customer_id: item.customer_id,
                  organization_id: organization.id,
                  rental_start_date: new Date().toISOString(),
                  rental_end_date: null
                });
            }
          }

          // 3. Remove returned bottles from customer and end rental
          const returned = (importData.returned || []);
          for (const item of returned) {
            // Remove customer assignment
            await supabase
              .from('bottles')
              .update({ assigned_customer: null })
              .eq('barcode_number', item.barcode_number)
              .eq('organization_id', organization.id);
            // End rental
            await supabase
              .from('rentals')
              .update({ rental_end_date: new Date().toISOString() })
              .eq('bottle_barcode', item.barcode_number)
              .eq('organization_id', organization.id)
              .is('rental_end_date', null);
          }

          setActionMessage('Record verified successfully!');
          // Navigate back to approvals list after successful verification
          setTimeout(() => navigate('/import-approvals'), 1500);
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
          setShowDateModal(true);
          break;
        case 'Change Sales Order Number':
          setShowSalesOrderModal(true);
          break;
        case 'Change PO Number':
          setShowPOModal(true);
          break;
        case 'Change Location':
          setShowLocationModal(true);
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

  // Handle sales order number change
  const handleSalesOrderChange = async () => {
    if (!newSalesOrder) {
      setActionMessage('Please enter a sales order number');
      return;
    }

    try {
      setActionMessage('Updating sales order number...');
      
      const importData = importRecord?.data || {};
      const updatedRows = (importData.rows || importData.line_items || []).map(row => ({
        ...row,
        invoice_number: newSalesOrder,
        order_number: newSalesOrder
      }));

      const { error } = await supabase
        .from('imported_invoices')
        .update({
          data: {
            ...importData,
            rows: updatedRows,
            summary: {
              ...importData.summary,
              invoice_number: newSalesOrder,
              order_number: newSalesOrder
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

      setActionMessage('Sales order number updated successfully!');
      setShowSalesOrderModal(false);
      setNewSalesOrder('');
      
    } catch (error) {
      logger.error('Error updating sales order number:', error);
      setActionMessage(`Error: ${error.message}`);
    }
    
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Handle PO number change
  const handlePOChange = async () => {
    if (!newPO) {
      setActionMessage('Please enter a PO number');
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
    setActionMessage(`${action} - Feature coming soon!`);
    setTimeout(() => setActionMessage(''), 3000);
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

  // Filter line items based on invoice number and customer
  const filterLineItems = (items) => {
    logger.log('filterLineItems: filterInvoiceNumber =', filterInvoiceNumber);
    logger.log('filterLineItems: filterCustomerName =', filterCustomerName);
    logger.log('filterLineItems: filterCustomerId =', filterCustomerId);
    logger.log('filterLineItems: total items before filter =', items.length);
    
    if (!filterInvoiceNumber && !filterCustomerName && !filterCustomerId) {
      logger.log('filterLineItems: No filters applied, returning all items');
      return items; // No filters, return all
    }
    
    const filteredItems = items.filter(item => {
      const itemInvoiceNumber = item.invoice_number || item.order_number || item.InvoiceNumber || item.ReferenceNumber || item.reference_number;
      const itemCustomerName = item.customer_name || item.customerName;
      const itemCustomerId = item.customer_id || item.customerId;
      
      const invoiceMatch = !filterInvoiceNumber || itemInvoiceNumber === filterInvoiceNumber;
      const customerNameMatch = !filterCustomerName || itemCustomerName === filterCustomerName;
      const customerIdMatch = !filterCustomerId || itemCustomerId === filterCustomerId;
      
      const matches = invoiceMatch && (customerNameMatch || customerIdMatch);
      
      if (matches) {
        logger.log('filterLineItems: MATCH - Invoice:', itemInvoiceNumber, 'Customer:', itemCustomerName, 'Product:', item.product_code);
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

  // Get display name for uploaded by
  const getUploadedByDisplay = () => {
    if (uploadedByUser?.full_name && uploadedByUser.full_name !== importRecord.uploaded_by) {
      return uploadedByUser.full_name;
    }
    if (uploadedByUser?.email && uploadedByUser.email !== importRecord.uploaded_by) {
      return uploadedByUser.email;
    }
    return importRecord.uploaded_by;
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
          {filterInvoiceNumber && (
            <Typography variant="subtitle1" sx={{ opacity: 0.7, color: 'var(--text-main)' }}>
              Invoice: {filterInvoiceNumber} | Customer: {filterCustomerName || filterCustomerId}
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
                    <Typography variant="subtitle2" color="text.secondary">Uploaded At</Typography>
                    <Typography variant="body2" sx={{ 
                      p: 1, 
                      bgcolor: 'white', 
                      borderRadius: 1, 
                      border: '1px solid #ddd',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      {new Date(importRecord.uploaded_at).toLocaleString()}
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

              {/* Delivered Assets */}
              <Typography variant="h6" fontWeight={700} mb={2} color="var(--text-main)" sx={{ 
                borderBottom: '1px solid var(--divider)', 
                pb: 1
              }}>
                Delivered Assets ({delivered.length})
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
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Group</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Product Code</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Ownership</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Barcode</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Serial Number</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Addendum</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {delivered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ 
                          py: 4, 
                          color: 'text.secondary',
                          border: '2px dashed #e0e6ed',
                          bgcolor: '#fafbfc'
                        }}>
                          No delivered assets found.
                        </TableCell>
                      </TableRow>
                    ) : delivered.map((row, i) => {
                      // Try barcode first, then product_code
                      const barcode = row.barcode || row.barcode_number || row.Barcode || row.BarcodeNumber;
                      const prodCode = row.product_code || row.ProductCode || row.productCode;
                      const identifier = barcode || prodCode;
                      
                      const assetInfo = getAssetInfo(identifier);
                      logger.log(`🎯 Row ${i}:`, {
                        barcode: barcode,
                        productCode: prodCode,
                        identifier: identifier,
                        assetInfo: assetInfo,
                      });
                      return (
                        <TableRow key={i} sx={{ 
                          backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                          borderBottom: '1px solid #e0e6ed'
                        }}>
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
                          <TableCell>{row.addendum || ''}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>

              {/* Returned Assets */}
              <Typography variant="h6" fontWeight={700} mb={2} color="var(--text-main)" sx={{ 
                borderBottom: '1px solid var(--divider)', 
                pb: 1
              }}>
                Returned Assets ({returned.length})
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
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Group</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Product Code</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Ownership</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Barcode</TableCell>
                      <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #e0e6ed' }}>Serial Number</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Addendum</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {returned.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ 
                          py: 4, 
                          color: 'text.secondary',
                          border: '2px dashed #e0e6ed',
                          bgcolor: '#fafbfc'
                        }}>
                          No returned assets found.
                        </TableCell>
                      </TableRow>
                    ) : returned.map((row, i) => {
                      const assetInfo = getAssetInfo(row.product_code);
                      return (
                        <TableRow key={i} sx={{ 
                          backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                          borderBottom: '1px solid #e0e6ed'
                        }}>
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
                          <TableCell>{row.addendum || ''}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>

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
                  {[
                    'Verify This Record',
                    'Delete This Record',
                    'Change Record Date and Time',
                    'Change Customer',
                    'Change Sales Order Number',
                    'Change PO Number',
                    'Change Location',
                    'Create or Delete Correction Sales Order',
                    'Mark for Investigation',
                  ].map((label) => (
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
                  ))}
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