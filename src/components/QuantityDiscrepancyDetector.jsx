import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Alert
} from '@mui/material';
import { supabase } from '../supabase/client';

export default function QuantityDiscrepancyDetector({ orderNumber, customerId, organizationId }) {
  const [quantities, setQuantities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Always render something, even if props are missing
  if (!orderNumber || !organizationId) {
    return (
      <Box sx={{ 
        mt: 1, 
        p: 2, 
        bgcolor: '#ff0000', 
        borderRadius: 1, 
        border: '3px solid #000000',
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="h6" color="white" fontWeight="bold">
          🚨 MISSING DATA: Order={orderNumber || 'undefined'}, Org={organizationId || 'undefined'} 🚨
        </Typography>
      </Box>
    );
  }

  useEffect(() => {
    if (orderNumber && organizationId) {
      fetchQuantities();
    }
  }, [orderNumber, customerId, organizationId]);

  const fetchQuantities = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Step 1: Check what's in the imported_invoices table
      const { data: allInvoices, error: listError } = await supabase
        .from('imported_invoices')
        .select('*')
        .limit(5);
      
      if (listError) {
        setError(`Database error: ${listError.message}`);
        return;
      }
      
      // Step 2: Try to find the specific order
      let foundRecord = null;
      
      // Approach 1: Try order_number field first
      const { data: orderMatch, error: orderError } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('order_number', orderNumber)
        .eq('organization_id', organizationId)
        .single();
      
      if (!orderError && orderMatch) {
        foundRecord = orderMatch;
      }
      
      // Approach 2: Try reference_number field if order_number didn't work
      if (!foundRecord) {
        const { data: refMatch, error: refError } = await supabase
          .from('imported_invoices')
          .select('*')
          .eq('reference_number', orderNumber)
          .eq('organization_id', organizationId)
          .single();
        
        if (!refError && refMatch) {
          foundRecord = refMatch;
        }
      }
      
      // Approach 3: Search in data field content (ONLY for the specific order)
      if (!foundRecord && allInvoices && allInvoices.length > 0) {
        for (const invoice of allInvoices) {
          if (invoice.data) {
            try {
              const parsedData = typeof invoice.data === 'string' ? JSON.parse(invoice.data) : invoice.data;
              
              // Check if order number is in the parsed data
              if (parsedData.order_number === orderNumber || 
                  parsedData.reference_number === orderNumber ||
                  parsedData.invoice_number === orderNumber) {
                foundRecord = invoice;
                break;
              }
              
              // Check in rows array
              if (parsedData.rows && Array.isArray(parsedData.rows)) {
                for (const row of parsedData.rows) {
                  if (row.order_number === orderNumber || 
                      row.reference_number === orderNumber ||
                      row.invoice_number === orderNumber) {
                    foundRecord = invoice;
                    break;
                  }
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse data for invoice:', invoice.id);
            }
          }
        }
      }
      
      // Approach 4: Check imported_sales_receipts (ONLY for the specific order)
      if (!foundRecord) {
        // Try order_number in receipts
        const { data: receiptOrderMatch, error: receiptOrderError } = await supabase
          .from('imported_sales_receipts')
          .select('*')
          .eq('order_number', orderNumber)
          .eq('organization_id', organizationId)
          .limit(1);
        
        if (!receiptOrderError && receiptOrderMatch && receiptOrderMatch.length > 0) {
          foundRecord = receiptOrderMatch[0];
        } else {
          // Try reference_number in receipts
          const { data: receiptRefMatch, error: receiptRefError } = await supabase
            .from('imported_sales_receipts')
            .select('*')
            .eq('reference_number', orderNumber)
            .eq('organization_id', organizationId)
            .limit(1);
          
          if (!receiptRefError && receiptRefMatch && receiptRefMatch.length > 0) {
            foundRecord = receiptRefMatch[0];
          }
        }
      }
      
      // Approach 5: Last resort - search in any record's data field (ONLY for the specific order)
      if (!foundRecord) {
        // Get more records to search through
        const { data: moreInvoices, error: moreError } = await supabase
          .from('imported_invoices')
          .select('*')
          .limit(20);
        
        if (!moreError && moreInvoices && moreInvoices.length > 0) {
          for (const invoice of moreInvoices) {
            if (invoice.data) {
              try {
                const parsedData = typeof invoice.data === 'string' ? JSON.parse(invoice.data) : invoice.data;
                
                // Check if order number is in the parsed data
                if (parsedData.order_number === orderNumber || 
                    parsedData.reference_number === orderNumber ||
                    parsedData.invoice_number === orderNumber) {
                  foundRecord = invoice;
                  break;
                }
                
                // Check in rows array
                if (parsedData.rows && Array.isArray(parsedData.rows)) {
                  for (const row of parsedData.rows) {
                    if (row.order_number === orderNumber || 
                        row.reference_number === orderNumber ||
                        row.invoice_number === orderNumber) {
                      foundRecord = invoice;
                      break;
                    }
                  }
                }
              } catch (parseError) {
                console.warn('Failed to parse data for invoice:', invoice.id);
              }
            }
          }
        }
      }
      
      if (!foundRecord) {
        setError(`No invoice or receipt found for order ${orderNumber} in organization ${organizationId}`);
        return;
      }
      
      // Now process the found record
      const invoiceData = foundRecord;
      
      // Parse the data field
      let lineItems = [];
      let parsedData = null;
      
      try {
        parsedData = typeof invoiceData.data === 'string' 
          ? JSON.parse(invoiceData.data) 
          : invoiceData.data;
        
        // Extract line items from various possible locations
        lineItems = parsedData.rows || parsedData.line_items || parsedData.LineItems || [];
        
        // Filter line items to only include those for the specific order number
        if (lineItems.length > 0) {
          const filteredLineItems = lineItems.filter(item => {
            // Check if this line item belongs to the current order
            const itemOrderNumber = item.order_number || item.reference_number || item.invoice_number;
            return itemOrderNumber === orderNumber;
          });
          
          if (filteredLineItems.length > 0) {
            lineItems = filteredLineItems;
          }
        }
        
        if (lineItems.length === 0) {
          setError('No line items found in invoice data');
          return;
        }
        
      } catch (parseError) {
        setError('Failed to parse invoice data');
        return;
      }
      
      // Get scanned quantities from bottle_scans table
      const { data: scannedData, error: scannedError } = await supabase
        .from('bottle_scans')
        .select('*')
        .eq('order_number', orderNumber)
        .eq('organization_id', organizationId);
      
      console.log('🔍 QuantityDiscrepancyDetector - Scanned data:', {
        orderNumber,
        organizationId,
        scannedData: scannedData?.length || 0,
        scannedError: scannedError?.message || 'none'
      });
      
      if (scannedError) {
        console.error('❌ Error fetching scanned data:', scannedError);
        // Continue without scanned data
      }
      
      // Process quantities
      const quantityList = [];
      
      for (const lineItem of lineItems) {
        // Try multiple possible field names for quantities
        const shippedQty = lineItem.shipped || lineItem.Shipped || lineItem.shipped_qty || lineItem.ShippedQty || lineItem.quantity || lineItem.Quantity || lineItem.qty_out || lineItem.qtyOut || lineItem.qty_out_qty || lineItem.QtyOut || 0;
        const returnedQty = lineItem.returned || lineItem.Returned || lineItem.returned_qty || lineItem.ReturnedQty || lineItem.return_qty || lineItem.ReturnQty || lineItem.qty_in || lineItem.qtyIn || lineItem.qty_in_qty || lineItem.QtyIn || 0;
        
        // Check if this line item has any quantity data
        if (shippedQty > 0 || returnedQty > 0) {
          const productCode = lineItem.product_code || lineItem.ProductCode || lineItem.barcode_number || lineItem.barcode || lineItem.sku || lineItem.SKU || 'Unknown';
          
          // Count scanned quantities from bottle_scans
          let scannedShip = 0;
          let scannedReturn = 0;
          
          if (scannedData && scannedData.length > 0) {
            for (const scan of scannedData) {
              // Check if this scan matches the product code
              const scanProductCode = scan.product_code || scan.bottle_barcode || scan.barcode_number;
              console.log('🔍 Checking scan:', {
                scanProductCode,
                productCode,
                mode: scan.mode,
                scanType: scan.scan_type,
                matches: scanProductCode === productCode
              });
              
              if (scanProductCode === productCode) {
                // Count based on mode
                if (scan.mode === 'SHIP' || scan.mode === 'out' || scan.scan_type === 'delivery') {
                  scannedShip++;
                  console.log('📦 Scanned SHIP count:', scannedShip);
                } else if (scan.mode === 'RETURN' || scan.mode === 'in' || scan.scan_type === 'pickup') {
                  scannedReturn++;
                  console.log('📦 Scanned RETURN count:', scannedReturn);
                }
              }
            }
          }
          
          quantityList.push({
            productCode,
            productName: lineItem.description || lineItem.Description || lineItem.product_name || lineItem.ProductName || 'Unknown Product',
            category: lineItem.category || lineItem.Category || lineItem.product_category || lineItem.ProductCategory || 'INDUSTRIAL CYLINDERS',
            group: lineItem.group || lineItem.Group || lineItem.product_group || lineItem.ProductGroup || 'MIXGAS',
            type: lineItem.type || lineItem.Type || lineItem.product_type || lineItem.ProductType || productCode,
            shippedQty,
            returnedQty,
            scannedShip,
            scannedReturn
          });
        }
      }
      
      if (quantityList.length === 0) {
        // Try to find quantities in the main data structure
        if (parsedData) {
          // Check if this main data belongs to the specific order
          const mainOrderNumber = parsedData.order_number || parsedData.reference_number || parsedData.invoice_number;
          if (mainOrderNumber === orderNumber) {
            // Check if quantities are stored at the top level
            const mainShipped = parsedData.shipped || parsedData.Shipped || parsedData.shipped_qty || parsedData.ShippedQty || parsedData.qty_out || parsedData.qtyOut || parsedData.qty_out_qty || parsedData.QtyOut || 0;
            const mainReturned = parsedData.returned || parsedData.Returned || parsedData.returned_qty || parsedData.ReturnedQty || parsedData.qty_in || parsedData.qtyIn || parsedData.qty_in_qty || parsedData.QtyIn || 0;
            
            if (mainShipped > 0 || mainReturned > 0) {
              const productCode = parsedData.product_code || parsedData.ProductCode || parsedData.barcode || parsedData.sku || 'Main Product';
              const productName = parsedData.description || parsedData.Description || parsedData.product_name || 'Main Product';
              
              quantityList.push({
                productCode,
                productName,
                category: parsedData.category || parsedData.Category || parsedData.product_category || parsedData.ProductCategory || 'INDUSTRIAL CYLINDERS',
                group: parsedData.group || parsedData.Group || parsedData.product_group || parsedData.ProductGroup || 'MIXGAS',
                type: parsedData.type || parsedData.Type || parsedData.product_type || parsedData.ProductType || productCode,
                shippedQty: mainShipped,
                returnedQty: mainReturned,
                scannedShip: 0,
                scannedReturn: 0
              });
            }
          }
        }

        if (quantityList.length === 0) {
          setError('No quantity data found in invoice line items.');
          return;
        }
      }
      
      setQuantities(quantityList);
      
    } catch (err) {
      setError(`Fetch error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Always render the component structure, even if loading
  return (
    <Box sx={{ 
      mt: 1, 
      p: 1, 
      bgcolor: '#ffffff',
      borderRadius: 1,
      minHeight: '50px'
    }}>
      {loading && (
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography variant="caption">Loading...</Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ p: 1 }}>
          <Alert severity="error" size="small">{error}</Alert>
        </Box>
      )}

      {!loading && !error && quantities.length === 0 && (
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">No quantities found</Typography>
        </Box>
      )}

      {!loading && !error && quantities.length > 0 && (
        <>
          {/* Table Header */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr',
            gap: 1, 
            mb: 1,
            p: 1,
            bgcolor: 'grey.100',
            borderRadius: 1
          }}>
            <Typography variant="caption" fontWeight="bold" textAlign="center">Category</Typography>
            <Typography variant="caption" fontWeight="bold" textAlign="center">Group</Typography>
            <Typography variant="caption" fontWeight="bold" textAlign="center">Type</Typography>
            <Typography variant="caption" fontWeight="bold" textAlign="center">Product Code</Typography>
            <Typography variant="caption" fontWeight="bold" textAlign="center">SHP</Typography>
            <Typography variant="caption" fontWeight="bold" textAlign="center">RTN</Typography>
            <Typography variant="caption" fontWeight="bold" textAlign="center">Highlight</Typography>
          </Box>

          {/* Table Rows */}
          {quantities.map((item, index) => (
            <Box key={index} sx={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr',
              gap: 1, 
              mb: 1,
              p: 1,
              border: '1px solid',
              borderColor: 'grey.300',
              borderRadius: 1
            }}>
              {/* Category */}
              <Typography variant="caption" textAlign="center">
                {item.category || 'INDUSTRIAL CYLINDERS'}
              </Typography>
              
              {/* Group */}
              <Typography variant="caption" textAlign="center">
                {item.group || 'MIXGAS'}
              </Typography>
              
              {/* Type */}
              <Typography variant="caption" textAlign="center">
                {item.type || item.productCode}
              </Typography>
              
              {/* Product Code */}
              <Typography variant="caption" textAlign="center" fontWeight="bold">
                {item.productCode}
              </Typography>
              
              {/* SHP Column */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Trk:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'text.primary', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {item.scannedShip}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Inv:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: item.scannedShip === item.shippedQty ? 'success.main' : 'warning.main', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {item.shippedQty}
                  </Typography>
                </Box>
              </Box>
              
              {/* RTN Column */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Trk:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'text.primary', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {item.scannedReturn}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Inv:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: item.scannedReturn === item.returnedQty ? 'success.main' : 'warning.main', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {item.returnedQty}
                  </Typography>
                </Box>
              </Box>
              
              {/* Highlight Column */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box sx={{ 
                  width: 16, 
                  height: 16, 
                  border: '1px solid', 
                  borderColor: 'grey.400',
                  borderRadius: 1
                }} />
              </Box>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
}

