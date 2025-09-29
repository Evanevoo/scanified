import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { 
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Grid, 
  Alert, Chip, Card, CardContent, CardHeader, Accordion, AccordionSummary, AccordionDetails, Badge,
  List, ListItem, ListItemText, Divider
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, Person as PersonIcon, Receipt as ReceiptIcon, 
  CheckCircle as CheckCircleIcon, Error as ErrorIcon 
} from '@mui/icons-material';
import { CardSkeleton } from '../components/SmoothLoading';

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

export default function ImportApprovalDetailSeparated({ invoiceNumber: propInvoiceNumber }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const invoiceNumber = propInvoiceNumber || params.invoiceNumber;
  const navigate = useNavigate();
  
  // Get specific customer/order from URL parameters
  const filterCustomer = searchParams.get('customer');
  const filterOrder = searchParams.get('order');
  
  const [importRecord, setImportRecord] = useState(null);
  const [individualRecords, setIndividualRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [assetInfoMap, setAssetInfoMap] = useState({});
  const [uploadedByUser, setUploadedByUser] = useState(null);
  
  // Helper function to extract original database ID from composite ID
  const getOriginalId = (id) => {
    if (!id) return id;
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
      
      // Extract the original database ID
      const originalId = getOriginalId(invoiceNumber);
      
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
        console.log(`Split import ${data.id} into ${splitRecords.length} individual records:`, splitRecords);
        
        // Filter to specific customer/order if parameters are provided
        if (filterCustomer && filterOrder) {
          const specificRecord = splitRecords.find(record => {
            const recordCustomer = record.data.customer_name || '';
            const recordOrder = record.data.order_number || record.data.reference_number || '';
            return recordCustomer === filterCustomer && recordOrder === filterOrder;
          });
          
          if (specificRecord) {
            setFilteredRecords([specificRecord]);
            console.log(`Filtered to specific record for customer: ${filterCustomer}, order: ${filterOrder}`);
          } else {
            console.warn(`No record found for customer: ${filterCustomer}, order: ${filterOrder}`);
            setFilteredRecords(splitRecords);
          }
        } else {
          setFilteredRecords(splitRecords);
        }
      }
      
      setLoading(false);
    }
    fetchImport();
  }, [invoiceNumber, filterCustomer, filterOrder]);

  // Fetch asset info for product codes
  useEffect(() => {
    async function fetchAssetInfo() {
      try {
        const { data, error } = await supabase
          .from('asset_info')
          .select('*');
        if (error) throw error;
        
        const assetMap = {};
        (data || []).forEach(asset => {
          assetMap[asset.product_code] = asset;
        });
        setAssetInfoMap(assetMap);
      } catch (error) {
        console.error('Error fetching asset info:', error);
      }
    }
    fetchAssetInfo();
  }, []);

  // Handle record actions for individual records
  const handleIndividualRecordAction = async (individualRecord, action) => {
    setActionMessage(`Processing: ${action} for ${individualRecord.data.customer_name || 'Unknown'}`);
    
    try {
      const originalId = getOriginalId(individualRecord.id);
      
      switch (action) {
        case 'Verify This Invoice': {
          // Update the original import record status
          await supabase
            .from('imported_invoices')
            .update({ status: 'approved', approved_at: new Date().toISOString() })
            .eq('id', originalId);

          // Process only the rows for this specific customer/invoice
          const rows = individualRecord.data.rows || [];
          for (const item of rows) {
            if (item.barcode_number && item.customer_id) {
              // Assign bottle to customer
              await supabase
                .from('bottles')
                .update({ assigned_customer: item.customer_id })
                .eq('barcode_number', item.barcode_number);
              
              // Add to rentals if not already active
              const { data: existingRental } = await supabase
                .from('rentals')
                .select('*')
                .eq('bottle_barcode', item.barcode_number)
                .is('rental_end_date', null)
                .single();
              
              if (!existingRental) {
                await supabase
                  .from('rentals')
                  .insert({
                    bottle_barcode: item.barcode_number,
                    customer_id: item.customer_id,
                    rental_start_date: new Date().toISOString(),
                    rental_end_date: null
                  });
              }
            }
          }

          setActionMessage(`Invoice for ${individualRecord.data.customer_name} verified successfully!`);
          break;
        }
        case 'Mark for Investigation':
          await supabase
            .from('imported_invoices')
            .update({ status: 'investigation', notes: `Investigation: ${individualRecord.data.customer_name}` })
            .eq('id', originalId);
          setActionMessage(`Invoice for ${individualRecord.data.customer_name} marked for investigation!`);
          break;
        default:
          setActionMessage(`Action ${action} not implemented yet.`);
      }
    } catch (error) {
      setActionMessage(`Error: ${error.message}`);
    }
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

  const getAssetInfo = (productCode) => {
    if (!productCode) return {};
    return assetInfoMap[productCode.trim()] || {};
  };

  const renderIndividualRecord = (record, index) => {
    const data = record.data;
    const rows = data.rows || [];
    const customerName = data.customer_name || 'Unknown Customer';
    const orderNumber = data.order_number || data.reference_number || 'Unknown Order';
    const customerDate = data.date || 'No Date';

    return (
      <Card 
        key={record.displayId || record.id} 
        sx={{ 
          mb: 3, 
          borderRadius: 2,
          border: '2px solid #e0e0e0',
          '&:hover': { borderColor: '#1976d2' }
        }}
      >
        <CardHeader
          avatar={
            <Badge badgeContent={rows.length} color="primary">
              <PersonIcon sx={{ fontSize: 32, color: '#1976d2' }} />
            </Badge>
          }
          title={
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {customerName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Order: {orderNumber} | Date: {customerDate}
              </Typography>
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => handleIndividualRecordAction(record, 'Verify This Invoice')}
                startIcon={<CheckCircleIcon />}
              >
                Verify
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => handleIndividualRecordAction(record, 'Mark for Investigation')}
                startIcon={<ErrorIcon />}
              >
                Investigate
              </Button>
            </Box>
          }
        />
        <CardContent>
          <Accordion defaultExpanded={filterCustomer && filterOrder}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" fontWeight={600}>
                <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {filterCustomer && filterOrder ? `Invoice Items (${rows.length})` : `View Items (${rows.length})`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper sx={{ overflow: 'hidden', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Product Code</strong></TableCell>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell><strong>Barcode</strong></TableCell>
                      <TableCell><strong>Serial Number</strong></TableCell>
                      <TableCell><strong>Ownership</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, rowIndex) => {
                      const assetInfo = getAssetInfo(row.product_code);
                      return (
                        <TableRow key={rowIndex} hover>
                          <TableCell>
                            <Chip 
                              label={row.product_code || 'N/A'} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>{assetInfo.description || row.description || 'N/A'}</TableCell>
                          <TableCell>{row.barcode || row.barcode_number || 'N/A'}</TableCell>
                          <TableCell>{row.serial_number || 'N/A'}</TableCell>
                          <TableCell>{row.ownership || 'N/A'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    );
  };

  if (loading) return <CardSkeleton />;

  if (error) return (
    <Box p={3}>
      <Alert severity="error">Error: {error}</Alert>
    </Box>
  );
  
  if (!importRecord) return (
    <Box p={3} bgcolor="#f5f5f5">
      <Typography variant="h6" color="text.secondary">
        No import found for this ID.
      </Typography>
    </Box>
  );

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
        background: 'white',
        border: '1px solid #e0e0e0'
      }}>
        {/* Header */}
        <Box sx={{ 
          background: '#1976d2', 
          color: 'white', 
          p: 3,
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              sx={{ 
                color: 'white', 
                borderColor: 'white', 
                '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
              }} 
              onClick={() => navigate(-1)}
            >
              ← Back to Import Approvals
            </Button>
            
            {filterCustomer && filterOrder && (
              <Button 
                variant="contained" 
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                }} 
                onClick={() => navigate(`/import-approval/${importRecord.id}/detail`)}
              >
                📋 Show All Invoices
              </Button>
            )}
          </Box>
          
          <Typography variant="h4" fontWeight="bold" mb={1}>
            {filterCustomer && filterOrder ? 
              `${filterCustomer} - ${filterOrder}` : 
              `Import Record #${importRecord.id}`
            }
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`Status: ${importRecord.status}`}
              color={getStatusColor(importRecord.status)}
              sx={{ fontWeight: 600 }}
            />
            <Typography variant="body1">
              📅 {new Date(importRecord.uploaded_at).toLocaleDateString()}
            </Typography>
            {filterCustomer && filterOrder ? (
              <Typography variant="body1">
                🎯 Specific Invoice Details
              </Typography>
            ) : (
              <Typography variant="body1">
                📊 {individualRecords.length} Individual Invoices/Receipts
              </Typography>
            )}
          </Box>
        </Box>

        {/* Action Message */}
        {actionMessage && (
          <Alert 
            severity="info" 
            sx={{ m: 2, borderRadius: 2 }}
            onClose={() => setActionMessage('')}
          >
            {actionMessage}
          </Alert>
        )}

        <Box p={3}>
          <Typography variant="h5" fontWeight={700} mb={3} color="#333">
            {filterCustomer && filterOrder ? 
              `📄 Invoice Details` : 
              `📋 Individual Customer Invoices/Receipts`
            }
          </Typography>
          
          <Typography variant="body1" color="text.secondary" mb={4}>
            {filterCustomer && filterOrder ? 
              `Showing details for ${filterCustomer} - Order ${filterOrder}` :
              `This import contains ${individualRecords.length} separate customer transactions. Each can be verified or investigated individually.`
            }
          </Typography>

          {filteredRecords.length === 0 ? (
            <Alert severity="warning">
              {filterCustomer && filterOrder ? 
                `No record found for customer "${filterCustomer}" and order "${filterOrder}".` :
                `No individual records found. The import may not contain properly structured data.`
              }
            </Alert>
          ) : (
            filteredRecords.map(renderIndividualRecord)
          )}
        </Box>
      </Paper>
    </Box>
  );
}