import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
  TablePagination
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Undo as UndoIcon,
  CheckCircle as VerifiedIcon,
  LocalShipping as ShippingIcon,
  Assignment as InvoiceIcon,
  Person as CustomerIcon,
  CalendarToday as DateIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';

export default function VerifiedOrders() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [verifiedOrders, setVerifiedOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, invoice, receipt, scanned
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [unverifyDialogOpen, setUnverifyDialogOpen] = useState(false);
  const [unverifyLoading, setUnverifyLoading] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (organization?.id) {
      fetchVerifiedOrders();
    }
  }, [organization?.id]);

  useEffect(() => {
    applyFilters();
  }, [verifiedOrders, search, typeFilter, dateFilter]);

  const fetchVerifiedOrders = async () => {
    try {
      setLoading(true);
      logger.log('🔍 Fetching verified orders for organization:', organization.id);

      // Fetch verified imported invoices
      const { data: invoices, error: invoiceError } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .in('status', ['verified', 'approved'])
        .order('verified_at', { ascending: false });

      if (invoiceError) {
        logger.error('Error fetching verified invoices:', invoiceError);
        throw invoiceError;
      }

      // Fetch verified imported receipts
      const { data: receipts, error: receiptError } = await supabase
        .from('imported_sales_receipts')
        .select('*')
        .eq('organization_id', organization.id)
        .in('status', ['verified', 'approved'])
        .order('verified_at', { ascending: false });

      if (receiptError) {
        logger.error('Error fetching verified receipts:', receiptError);
        throw receiptError;
      }

      // Fetch verified scanned orders (from scans table)
      const { data: scans, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .eq('organization_id', organization.id)
        .in('status', ['verified', 'approved'])
        .not('order_number', 'is', null)
        .order('created_at', { ascending: false });

      if (scanError) {
        logger.error('Error fetching verified scans:', scanError);
        // Continue without scans if error
      }

      // Combine and format all orders
      const allOrders = [
        ...(invoices || []).map(inv => ({
          ...inv,
          type: 'invoice',
          displayType: 'Invoice',
          icon: <InvoiceIcon />,
          data_parsed: parseDataField(inv.data)
        })),
        ...(receipts || []).map(rec => ({
          ...rec,
          type: 'receipt',
          displayType: 'Receipt',
          icon: <ShippingIcon />,
          data_parsed: parseDataField(rec.data)
        })),
        // Group scans by order_number
        ...groupScansByOrder(scans || [])
      ];
      
      // For orders without customer names, try to get from invoice data first, then fallback to bottle_scans or rentals
      for (const order of allOrders) {
        // First, try to extract customer name from invoice data using getCustomerName function
        // This properly checks all possible locations in the invoice data
        const customerNameFromInvoice = getCustomerName(order);
        
        if (customerNameFromInvoice && customerNameFromInvoice !== 'N/A' && customerNameFromInvoice !== 'Unknown') {
          // Invoice has customer name - use it (this is the source of truth)
          order.customer_name = customerNameFromInvoice;
          if (!order.data_parsed) order.data_parsed = {};
          order.data_parsed.customer_name = customerNameFromInvoice;
          logger.log(`✅ Found customer name from invoice data for order: ${customerNameFromInvoice}`);
        } else {
          // Invoice doesn't have customer name - fallback to bottle_scans or rentals
          // Extract order number manually (getOrderNumber is defined later)
          let orderNum = order.order_number || order.data_parsed?.order_number || order.data_parsed?.reference_number || order.data_parsed?.invoice_number;
          if (!orderNum && order.data_parsed?.rows && order.data_parsed.rows.length > 0) {
            const firstRow = order.data_parsed.rows[0];
            orderNum = firstRow.order_number || firstRow.invoice_number || firstRow.reference_number || firstRow.sales_receipt_number;
          }
          if (orderNum && orderNum !== 'N/A') {
            // Try to get customer name from rentals table first (more reliable than bottle_scans)
            const { data: rentals } = await supabase
              .from('rentals')
              .select('customer_name')
              .eq('order_number', orderNum)
              .eq('organization_id', organization.id)
              .limit(1);
            
            if (rentals && rentals.length > 0 && rentals[0].customer_name) {
              order.customer_name = rentals[0].customer_name;
              if (!order.data_parsed) order.data_parsed = {};
              order.data_parsed.customer_name = rentals[0].customer_name;
              logger.log(`✅ Found customer name from rentals for order ${orderNum}: ${rentals[0].customer_name}`);
            } else {
              // Last resort: try to get customer name from bottle_scans (may be incorrect)
              const { data: bottleScans } = await supabase
                .from('bottle_scans')
                .select('customer_name')
                .eq('order_number', orderNum)
                .eq('organization_id', organization.id)
                .limit(1);
              
              if (bottleScans && bottleScans.length > 0 && bottleScans[0].customer_name) {
                order.customer_name = bottleScans[0].customer_name;
                if (!order.data_parsed) order.data_parsed = {};
                order.data_parsed.customer_name = bottleScans[0].customer_name;
                logger.log(`⚠️ Found customer name from bottle_scans for order ${orderNum} (fallback): ${bottleScans[0].customer_name}`);
              }
            }
          }
        }
      }

      logger.log(`✅ Fetched ${allOrders.length} verified orders`);
      setVerifiedOrders(allOrders);
    } catch (error) {
      logger.error('Error fetching verified orders:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load verified orders: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const groupScansByOrder = (scans) => {
    const orderGroups = {};
    
    scans.forEach(scan => {
      const orderNum = scan.order_number;
      if (!orderGroups[orderNum]) {
        orderGroups[orderNum] = {
          id: `scanned_${orderNum}`,
          type: 'scanned',
          displayType: 'Scanned Order',
          icon: <ShippingIcon />,
          order_number: orderNum,
          customer_name: scan.customer_name,
          status: scan.status,
          verified_at: scan.updated_at || scan.created_at,
          scans: [],
          data_parsed: {
            order_number: orderNum,
            customer_name: scan.customer_name,
            rows: []
          }
        };
      }
      orderGroups[orderNum].scans.push(scan);
    });

    return Object.values(orderGroups);
  };

  const parseDataField = (data) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return data || {};
  };

  const applyFilters = () => {
    let filtered = [...verifiedOrders];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(order => order.type === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.verified_at || order.created_at);
        return orderDate >= filterDate;
      });
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(order => {
        const orderNum = order.data_parsed?.order_number || order.order_number || '';
        const customerName = order.data_parsed?.customer_name || order.customer_name || '';
        const invoiceNum = order.data_parsed?.invoice_number || '';
        
        return (
          orderNum.toLowerCase().includes(searchLower) ||
          customerName.toLowerCase().includes(searchLower) ||
          invoiceNum.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredOrders(filtered);
    setPage(0); // Reset to first page when filters change
  };

  const handleUnverify = async (order) => {
    try {
      setUnverifyLoading(true);
      logger.log('🔄 Unverifying order:', order.id);

      const orderNumber = getOrderNumber(order);
      logger.log('📋 Order number for unverify:', orderNumber);

      // Normalize order number for matching (remove leading zeros and trim)
      const normalizeOrderNum = (num) => {
        if (!num) return '';
        return String(num).trim().replace(/^0+/, '');
      };
      const normalizedOrderNum = normalizeOrderNum(orderNumber);

      let tableName;
      if (order.type === 'invoice') {
        tableName = 'imported_invoices';
      } else if (order.type === 'receipt') {
        tableName = 'imported_sales_receipts';
      } else if (order.type === 'scanned') {
        // For scanned orders, fetch all scans and filter by normalized order number
        const { data: allScans, error: fetchError } = await supabase
          .from('scans')
          .select('*')
          .eq('organization_id', organization.id);
        
        // Filter client-side using normalized order numbers
        const existingScans = (allScans || []).filter(scan => {
          const scanOrderNum = normalizeOrderNum(scan.order_number);
          return scanOrderNum === normalizedOrderNum || scanOrderNum === normalizeOrderNum(order.order_number);
        });
        
        logger.log('🔍 Found scans for scanned order:', {
          totalScans: allScans?.length || 0,
          matchingScans: existingScans.length,
          orderNumber: order.order_number,
          normalizedOrderNum: normalizedOrderNum
        });

        if (fetchError) {
          logger.warn('Warning fetching scans:', fetchError);
        }

        // Update scans status to pending (update all matching scans)
        if (existingScans.length > 0) {
          const scanIds = existingScans.map(s => s.id);
          const { error } = await supabase
            .from('scans')
            .update({ 
              status: 'pending',
              verified_at: null,
              verified_by: null
            })
            .in('id', scanIds);
          
          if (error) {
            logger.warn('Warning updating scans:', error);
          }
        }

        // Recreate bottle_scans from scans if they were deleted
        if (existingScans && existingScans.length > 0) {
          logger.log(`🔄 Recreating ${existingScans.length} bottle_scans from scans table for scanned order:`, order.order_number);
          
          // Check if bottle_scans already exist (using normalized matching)
          const { data: allBottleScans } = await supabase
            .from('bottle_scans')
            .select('id, order_number')
            .eq('organization_id', organization.id);
          
          const existingBottleScans = (allBottleScans || []).filter(bs => {
            const bsOrderNum = normalizeOrderNum(bs.order_number);
            return bsOrderNum === normalizedOrderNum || bsOrderNum === normalizeOrderNum(order.order_number);
          });

          if (!existingBottleScans || existingBottleScans.length === 0) {
          const bottleScansToInsert = existingScans.map(scan => {
            const insertData = {
              organization_id: organization.id,
              bottle_barcode: scan.barcode_number || scan.bottle_barcode || scan.cylinder_barcode,
              product_code: scan.product_code || null, // CRITICAL: Include product_code for matching
              mode: scan.mode || scan.action === 'out' ? 'SHIP' : scan.action === 'in' ? 'RETURN' : scan.action?.toUpperCase() || 'SHIP',
              location: scan.location || null,
              user_id: scan.user_id || scan.scanned_by || null,
              order_number: orderNumber, // Use the extracted order number
              customer_name: scan.customer_name || order.customer_name || null,
              customer_id: scan.customer_id || null,
              timestamp: scan.created_at || scan.timestamp || new Date().toISOString(),
              created_at: scan.created_at || new Date().toISOString()
            };
            
            logger.log('📦 Creating bottle_scan from scans table:', {
              bottle_barcode: insertData.bottle_barcode,
              product_code: insertData.product_code,
              order_number: insertData.order_number,
              mode: insertData.mode,
              originalScan: scan
            });
            
            return insertData;
          });

            const { error: insertError } = await supabase
              .from('bottle_scans')
              .insert(bottleScansToInsert);

            if (insertError) {
              logger.error('Error recreating bottle_scans:', insertError);
            } else {
              logger.log(`✅ Recreated ${bottleScansToInsert.length} bottle_scans for scanned order ${order.order_number}`);
            }
          }
        }
        
        setSnackbar({ 
          open: true, 
          message: 'Order unverified successfully', 
          severity: 'success' 
        });
        setUnverifyDialogOpen(false);
        setSelectedOrder(null);
        fetchVerifiedOrders();
        return;
      }

      // For invoices and receipts, update both the record AND associated scans
      const { error: recordError } = await supabase
        .from(tableName)
        .update({ 
          status: 'pending',
          verified_at: null,
          verified_by: null
        })
        .eq('id', order.id);

      if (recordError) throw recordError;

      // Also update associated scans in the scans table (if any)
      logger.log('🔄 Unverifying associated scans for order:', orderNumber);
      // Fetch all scans and filter by normalized order number
      const { data: allScans, error: fetchScansError } = await supabase
        .from('scans')
        .select('*')
        .eq('organization_id', organization.id);

      if (fetchScansError) {
        logger.warn('Warning fetching scans:', fetchScansError);
      }

      // Filter client-side using normalized order numbers
      const existingScans = (allScans || []).filter(scan => {
        const scanOrderNum = normalizeOrderNum(scan.order_number);
        return scanOrderNum === normalizedOrderNum;
      });
      
      logger.log('🔍 Found scans for order:', {
        totalScans: allScans?.length || 0,
        matchingScans: existingScans.length,
        orderNumber: orderNumber,
        normalizedOrderNum: normalizedOrderNum,
        sampleMatchingScans: existingScans.slice(0, 3).map(s => ({
          id: s.id,
          order_number: s.order_number,
          barcode: s.barcode_number || s.bottle_barcode
        }))
      });

      // Update scans status to pending (update all matching scans)
      if (existingScans.length > 0) {
        const scanIds = existingScans.map(s => s.id);
        const { error: scansError } = await supabase
          .from('scans')
          .update({ 
            status: 'pending',
            verified_at: null,
            verified_by: null
          })
          .in('id', scanIds);

        if (scansError) {
          logger.warn('Warning updating scans:', scansError);
          // Don't throw - scans might not exist
        }
      }

      // Recreate bottle_scans from scans table if they were deleted during approval
      if (existingScans && existingScans.length > 0) {
        logger.log(`🔄 Recreating ${existingScans.length} bottle_scans from scans table for order:`, orderNumber);
        
        // Check if bottle_scans already exist (using normalized matching)
        const { data: allBottleScans } = await supabase
          .from('bottle_scans')
          .select('id, order_number')
          .eq('organization_id', organization.id);
        
        const existingBottleScans = (allBottleScans || []).filter(bs => {
          const bsOrderNum = normalizeOrderNum(bs.order_number);
          return bsOrderNum === normalizedOrderNum;
        });
        
        logger.log('🔍 Checking existing bottle_scans:', {
          totalBottleScans: allBottleScans?.length || 0,
          matchingBottleScans: existingBottleScans.length,
          orderNumber: orderNumber,
          normalizedOrderNum: normalizedOrderNum
        });

        // Only recreate if they don't exist
        if (!existingBottleScans || existingBottleScans.length === 0) {
          const bottleScansToInsert = existingScans.map(scan => {
            const insertData = {
              organization_id: organization.id,
              bottle_barcode: scan.barcode_number || scan.bottle_barcode || scan.cylinder_barcode,
              product_code: scan.product_code || null, // CRITICAL: Include product_code for matching
              mode: scan.mode || scan.action === 'out' ? 'SHIP' : scan.action === 'in' ? 'RETURN' : scan.action?.toUpperCase() || 'SHIP',
              location: scan.location || null,
              user_id: scan.user_id || scan.scanned_by || null,
              order_number: orderNumber,
              customer_name: scan.customer_name || order.data_parsed?.customer_name || null,
              customer_id: scan.customer_id || order.data_parsed?.customer_id || null,
              timestamp: scan.created_at || scan.timestamp || new Date().toISOString(),
              created_at: scan.created_at || new Date().toISOString()
            };
            
            logger.log('📦 Creating bottle_scan from scans table (invoice/receipt):', {
              bottle_barcode: insertData.bottle_barcode,
              product_code: insertData.product_code,
              order_number: insertData.order_number,
              mode: insertData.mode,
              originalScan: scan
            });
            
            return insertData;
          });

          const { error: insertError } = await supabase
            .from('bottle_scans')
            .insert(bottleScansToInsert);

          if (insertError) {
            logger.error('Error recreating bottle_scans:', insertError);
            // Don't throw - this is not critical
          } else {
            logger.log(`✅ Recreated ${bottleScansToInsert.length} bottle_scans for order ${orderNumber}`);
          }
        } else {
          logger.log('✅ bottle_scans already exist for order:', orderNumber);
        }
      } else {
        logger.log('ℹ️ No scans found in scans table. Trying to recreate from bottles table...');
        
        // If no scans exist, try to recreate from bottles table
        // Check if bottles were assigned to the customer with this order number
        const customerName = getCustomerName(order);
        const { data: bottles, error: bottlesError } = await supabase
          .from('bottles')
          .select('barcode_number, assigned_customer, customer_name, location, status, product_code')
          .eq('organization_id', organization.id)
          .or(`assigned_customer.eq.${customerName},customer_name.eq.${customerName}`)
          .eq('status', 'delivered')
          .limit(100);

        if (bottlesError) {
          logger.warn('Error fetching bottles:', bottlesError);
        } else if (bottles && bottles.length > 0) {
          logger.log(`🔍 Found ${bottles.length} bottles assigned to customer ${customerName}. Creating bottle_scans...`);
          
          // Get the invoice/receipt data to extract product codes
          const { data: invoiceData } = await supabase
            .from(tableName)
            .select('data')
            .eq('id', order.id)
            .single();

          const parsedData = invoiceData?.data ? (typeof invoiceData.data === 'string' ? JSON.parse(invoiceData.data) : invoiceData.data) : null;
          const rows = parsedData?.rows || parsedData?.line_items || [];
          
          // Create a map of product codes from the invoice
          const productCodeMap = new Map();
          rows.forEach(row => {
            const productCode = row.product_code || row.ProductCode || row.item_code;
            if (productCode) {
              productCodeMap.set(productCode.toLowerCase(), productCode);
            }
          });

          // Create bottle_scans from bottles that match the invoice product codes
          const bottleScansToInsert = bottles
            .filter(bottle => {
              // Match by product code if available
              if (bottle.product_code && productCodeMap.has(bottle.product_code.toLowerCase())) {
                return true;
              }
              // If no product code match, include all delivered bottles for this customer
              return true;
            })
            .slice(0, 10) // Limit to prevent too many inserts
            .map(bottle => ({
              organization_id: organization.id,
              bottle_barcode: bottle.barcode_number,
              product_code: bottle.product_code || null,
              mode: 'SHIP', // Assume SHIP for delivered bottles
              location: bottle.location || null,
              user_id: null, // We don't know who scanned it
              order_number: orderNumber,
              customer_name: customerName,
              customer_id: bottle.assigned_customer || null,
              timestamp: new Date().toISOString(),
              created_at: new Date().toISOString()
            }));

          if (bottleScansToInsert.length > 0) {
            logger.log(`🔄 Creating ${bottleScansToInsert.length} bottle_scans from bottles table for order ${orderNumber}`);
            const { error: insertError } = await supabase
              .from('bottle_scans')
              .insert(bottleScansToInsert);

            if (insertError) {
              logger.error('Error recreating bottle_scans from bottles:', insertError);
            } else {
              logger.log(`✅ Recreated ${bottleScansToInsert.length} bottle_scans from bottles table for order ${orderNumber}`);
            }
          } else {
            logger.log('ℹ️ No matching bottles found to recreate scans from');
          }
        } else {
          logger.log('ℹ️ No bottles found assigned to customer for order:', orderNumber);
        }
      }

      setSnackbar({ 
        open: true, 
        message: 'Order unverified successfully - will appear in Verification Center', 
        severity: 'success' 
      });
      setUnverifyDialogOpen(false);
      setSelectedOrder(null);
      fetchVerifiedOrders();
    } catch (error) {
      logger.error('Error unverifying order:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to unverify order: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setUnverifyLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderNumber = (order) => {
    // Try direct properties first
    if (order.order_number) return order.order_number;
    if (order.data_parsed?.order_number) return order.data_parsed.order_number;
    if (order.data_parsed?.reference_number) return order.data_parsed.reference_number;
    if (order.data_parsed?.invoice_number) return order.data_parsed.invoice_number;
    
    // Check rows array
    if (order.data_parsed?.rows && order.data_parsed.rows.length > 0) {
      for (const row of order.data_parsed.rows) {
        const rowOrderNum = row.order_number || row.invoice_number || row.reference_number || row.sales_receipt_number;
        if (rowOrderNum) return rowOrderNum;
      }
    }
    
    return 'N/A';
  };

  const getCustomerName = (order) => {
    // Try direct properties first
    if (order.customer_name) return order.customer_name;
    if (order.data_parsed?.customer_name) return order.data_parsed.customer_name;
    if (order.data_parsed?.CustomerName) return order.data_parsed.CustomerName;
    if (order.data_parsed?.Customer) return order.data_parsed.Customer;
    
    // Try to get from rows array (for imported invoices/receipts)
    if (order.data_parsed?.rows && order.data_parsed.rows.length > 0) {
      const firstRow = order.data_parsed.rows[0];
      if (firstRow.customer_name) return firstRow.customer_name;
      if (firstRow.CustomerName) return firstRow.CustomerName;
      if (firstRow.Customer) return firstRow.Customer;
    }
    
    // Try to get from line_items array
    if (order.data_parsed?.line_items && order.data_parsed.line_items.length > 0) {
      const firstItem = order.data_parsed.line_items[0];
      if (firstItem.customer_name) return firstItem.customer_name;
      if (firstItem.CustomerName) return firstItem.CustomerName;
      if (firstItem.Customer) return firstItem.Customer;
    }
    
    // Try to get from summary
    if (order.data_parsed?.summary?.customer_name) {
      return order.data_parsed.summary.customer_name;
    }
    
    // For scanned orders, try to get from scans
    if (order.scans && order.scans.length > 0) {
      const firstScan = order.scans[0];
      if (firstScan.customer_name) return firstScan.customer_name;
    }
    
    // Last resort: try to get from raw data if it's a string
    if (order.data && typeof order.data === 'string') {
      try {
        const parsed = JSON.parse(order.data);
        if (parsed.customer_name) return parsed.customer_name;
        if (parsed.CustomerName) return parsed.CustomerName;
        if (parsed.rows && parsed.rows.length > 0 && parsed.rows[0].customer_name) {
          return parsed.rows[0].customer_name;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return 'N/A';
  };

  const getItemCount = (order) => {
    if (order.type === 'scanned') {
      return order.scans?.length || 0;
    }
    const rows = order.data_parsed?.rows || order.data_parsed?.line_items || [];
    return rows.length;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedIcon color="success" />
          Verified Orders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage orders that have been verified. You can unverify orders if needed.
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order #, Customer, Invoice..."
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ minWidth: 250 }}
          />
          
          <TextField
            select
            label="Type"
            size="small"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="invoice">Invoices</MenuItem>
            <MenuItem value="receipt">Receipts</MenuItem>
            <MenuItem value="scanned">Scanned Orders</MenuItem>
          </TextField>

          <TextField
            select
            label="Date"
            size="small"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
          </TextField>

          <Box sx={{ flexGrow: 1 }} />
          
          <Typography variant="body2" color="text.secondary">
            {filteredOrders.length} verified order{filteredOrders.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Paper>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Order #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell align="center">Items</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Verified Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No verified orders found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Chip 
                        icon={order.icon}
                        label={order.displayType}
                        size="small"
                        color={order.type === 'invoice' ? 'primary' : order.type === 'receipt' ? 'secondary' : 'info'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {getOrderNumber(order)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CustomerIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {getCustomerName(order)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={getItemCount(order)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={<VerifiedIcon />}
                        label={order.status || 'Verified'}
                        size="small"
                        color="success"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DateIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(order.verified_at || order.approved_at || order.created_at)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            const orderNum = getOrderNumber(order);
                            const customerName = getCustomerName(order);
                            // Navigate to the detail page like ImportApprovals does
                            navigate(`/import-approval/${order.id}/detail?customer=${encodeURIComponent(customerName)}&order=${encodeURIComponent(orderNum)}`);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Unverify Order">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSelectedOrder(order);
                            setUnverifyDialogOpen(true);
                          }}
                        >
                          <UndoIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Unverify Confirmation Dialog */}
      <Dialog
        open={unverifyDialogOpen}
        onClose={() => !unverifyLoading && setUnverifyDialogOpen(false)}
      >
        <DialogTitle>Unverify Order?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will move the order back to pending status. You'll need to verify it again.
          </Alert>
          {selectedOrder && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Order:</strong> {getOrderNumber(selectedOrder)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Customer:</strong> {getCustomerName(selectedOrder)}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {selectedOrder.displayType}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUnverifyDialogOpen(false)}
            disabled={unverifyLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleUnverify(selectedOrder)}
            color="warning"
            variant="contained"
            disabled={unverifyLoading}
            startIcon={unverifyLoading ? <CircularProgress size={16} /> : <UndoIcon />}
          >
            {unverifyLoading ? 'Unverifying...' : 'Unverify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      {snackbar.open && (
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
        >
          {snackbar.message}
        </Alert>
      )}
    </Box>
  );
}

