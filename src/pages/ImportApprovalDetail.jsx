import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Grid, List, ListItem, ListItemText, Divider, Alert, Chip, IconButton, Tooltip } from '@mui/material';

export default function ImportApprovalDetail({ invoiceNumber: propInvoiceNumber }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const invoiceNumber = propInvoiceNumber || params.invoiceNumber;
  const navigate = useNavigate();
  const [importRecord, setImportRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [assetInfoMap, setAssetInfoMap] = useState({});
  const [uploadedByUser, setUploadedByUser] = useState(null);

  // Get filter parameters from URL
  const filterInvoiceNumber = searchParams.get('invoiceNumber');
  const filterCustomerName = searchParams.get('customerName');
  const filterCustomerId = searchParams.get('customerId');

  useEffect(() => {
    async function fetchImport() {
      setLoading(true);
      setError(null);
      let data = null;
      let err = null;
      // Try imported_invoices first
      let res = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('id', invoiceNumber)
        .single();
      if (res.error || !res.data) {
        // Try imported_sales_receipts as fallback
        let res2 = await supabase
          .from('imported_sales_receipts')
          .select('*')
          .eq('id', invoiceNumber)
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
        
        // Fallback: try to get from auth.users (if accessible)
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(importRecord.uploaded_by);
        
        if (!userError && user?.user) {
          setUploadedByUser({
            full_name: user.user.user_metadata?.full_name || user.user.email,
            email: user.user.email
          });
          return;
        }
        
        // If all else fails, just show the email or ID
        setUploadedByUser({
          full_name: importRecord.uploaded_by,
          email: importRecord.uploaded_by
        });
        
      } catch (error) {
        console.error('Error fetching user info:', error);
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
      if (!importRecord) return;
      
      const importData = importRecord.data || {};
      const allDelivered = importData.delivered || importData.rows || importData.line_items || [];
      const allReturned = importData.returned || [];
      
      // Get all unique product codes
      const productCodes = new Set();
      [...allDelivered, ...allReturned].forEach(item => {
        if (item.product_code) {
          productCodes.add(item.product_code.trim());
        }
      });
      
      if (productCodes.size === 0) return;
      
      try {
        const { data: bottles, error } = await supabase
          .from('bottles')
          .select('product_code, category, group_name, type, description, gas_type')
          .in('product_code', Array.from(productCodes));
        
        if (error) {
          console.error('Error fetching asset info:', error);
          return;
        }
        
        // Create a map of product_code to asset info
        const map = {};
        (bottles || []).forEach(bottle => {
          if (bottle.product_code) {
            map[bottle.product_code.trim()] = {
              category: bottle.category || '',
              group: bottle.group_name || '',
              type: bottle.type || '',
              description: bottle.description || '',
              gas_type: bottle.gas_type || ''
            };
          }
        });
        
        setAssetInfoMap(map);
      } catch (error) {
        console.error('Error fetching asset info:', error);
      }
    }
    
    fetchAssetInfo();
  }, [importRecord]);

  // Handle record actions
  const handleRecordAction = async (action) => {
    setActionMessage(`Processing: ${action}`);
    
    try {
      switch (action) {
        case 'Verify This Record':
          await supabase
            .from('imported_invoices')
            .update({ status: 'approved', approved_at: new Date().toISOString() })
            .eq('id', invoiceNumber);
          setActionMessage('Record verified successfully!');
          break;
        case 'Delete This Record':
          if (window.confirm('Are you sure you want to delete this record?')) {
            await supabase
              .from('imported_invoices')
              .delete()
              .eq('id', invoiceNumber);
            setActionMessage('Record deleted successfully!');
            setTimeout(() => navigate('/import-approvals'), 1500);
          }
          break;
        case 'Mark for Investigation':
          await supabase
            .from('imported_invoices')
            .update({ status: 'investigation', notes: 'Marked for investigation' })
            .eq('id', invoiceNumber);
          setActionMessage('Record marked for investigation!');
          break;
        default:
          setActionMessage(`${action} - Feature coming soon!`);
      }
    } catch (error) {
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
      <Typography variant="h6" color="primary">Loading...</Typography>
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
    if (!filterInvoiceNumber && !filterCustomerName && !filterCustomerId) {
      return items; // No filters, return all
    }
    
    return items.filter(item => {
      const itemInvoiceNumber = item.invoice_number || item.order_number || item.InvoiceNumber || item.ReferenceNumber || item.reference_number;
      const itemCustomerName = item.customer_name || item.customerName;
      const itemCustomerId = item.customer_id || item.customerId;
      
      const invoiceMatch = !filterInvoiceNumber || itemInvoiceNumber === filterInvoiceNumber;
      const customerNameMatch = !filterCustomerName || itemCustomerName === filterCustomerName;
      const customerIdMatch = !filterCustomerId || itemCustomerId === filterCustomerId;
      
      return invoiceMatch && (customerNameMatch || customerIdMatch);
    });
  };

  const delivered = filterLineItems(allDelivered);
  const returned = filterLineItems(allReturned);

  // Helper function to get asset info for a product code
  const getAssetInfo = (productCode) => {
    if (!productCode) return {};
    return assetInfoMap[productCode.trim()] || {};
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
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        background: 'white',
        border: '2px solid #e0e6ed'
      }}>
        {/* Header */}
        <Box sx={{ 
          background: 'white', 
          color: 'black', 
          p: 3,
          borderBottom: '3px solid #333'
        }}>
          <Button 
            variant="outlined" 
            sx={{ 
              color: 'black', 
              borderColor: '#333', 
              mb: 2,
              borderWidth: '2px',
              '&:hover': { borderColor: '#333', backgroundColor: '#f5f5f5' }
            }} 
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight={700} mb={1} color="black">
            Import Detail — {invoiceNumber}
          </Typography>
          {filterInvoiceNumber && (
            <Typography variant="subtitle1" sx={{ opacity: 0.7, color: 'black' }}>
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
                background: 'white',
                border: '2px solid #e0e6ed',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Import ID</Typography>
                    <Typography variant="h6" fontWeight={600} sx={{ 
                      p: 1, 
                      bgcolor: 'white', 
                      borderRadius: 1, 
                      border: '1px solid #ddd',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      {importRecord.id}
                    </Typography>
                  </Grid>
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
                  border: '2px solid #333',
                  bgcolor: 'white',
                  color: 'black'
                }}>
                  {importRecord.notes}
                </Alert>
              )}

              {/* Delivered Assets */}
              <Typography variant="h6" fontWeight={700} mb={2} color="black" sx={{ 
                borderBottom: '2px solid #333', 
                pb: 1
              }}>
                Delivered Assets ({delivered.length})
              </Typography>
              <Paper sx={{ 
                mb: 4, 
                borderRadius: 2, 
                overflow: 'hidden',
                border: '2px solid #e0e6ed',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
                      const assetInfo = getAssetInfo(row.product_code);
                      return (
                        <TableRow key={i} sx={{ 
                          backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                          borderBottom: '1px solid #e0e6ed'
                        }}>
                          <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.category || row.category || ''}</TableCell>
                          <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.group || row.group || row.group_name || ''}</TableCell>
                          <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.type || row.type || ''}</TableCell>
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
              <Typography variant="h6" fontWeight={700} mb={2} color="black" sx={{ 
                borderBottom: '2px solid #333', 
                pb: 1
              }}>
                Returned Assets ({returned.length})
              </Typography>
              <Paper sx={{ 
                borderRadius: 2, 
                overflow: 'hidden',
                border: '2px solid #e0e6ed',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
                          <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.category || row.category || ''}</TableCell>
                          <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.group || row.group || row.group_name || ''}</TableCell>
                          <TableCell sx={{ borderRight: '1px solid #e0e6ed' }}>{assetInfo.type || row.type || ''}</TableCell>
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
                background: 'white',
                color: 'black',
                border: '3px solid #333',
                boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
              }}>
                <Typography variant="h6" fontWeight={700} mb={2} sx={{ 
                  color: 'black',
                  borderBottom: '2px solid #333',
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
                        border: '1px solid #ddd',
                        '&:hover': { 
                          backgroundColor: '#f5f5f5',
                          border: '1px solid #333',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <ListItemText 
                        primary={label} 
                        primaryTypographyProps={{ fontSize: '0.875rem', color: 'black' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              {/* Asset Options */}
              <Paper sx={{ 
                p: 2, 
                borderRadius: 2,
                background: 'white',
                color: 'black',
                border: '3px solid #333',
                boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
              }}>
                <Typography variant="h6" fontWeight={700} mb={2} sx={{ 
                  color: 'black',
                  borderBottom: '2px solid #333',
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
                        border: '1px solid #ddd',
                        '&:hover': { 
                          backgroundColor: '#f5f5f5',
                          border: '1px solid #333',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <ListItemText 
                        primary={label} 
                        primaryTypographyProps={{ fontSize: '0.875rem', color: 'black' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
} 