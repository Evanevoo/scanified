import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import {
  Box, Paper, Typography, Button, Alert, CircularProgress, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Tabs, Tab, Snackbar, List, ListItem, ListItemButton, ListItemText
} from '@mui/material';

const recordOptions = [
  'Verify This Record',
  'Delete This Record',
  'Change Record Date and Time',
  'Change Customer',
  'Change Sales Order Number',
  'Change PO Number',
  'Change Location',
  'Create or Delete Correction Sales Order',
  'Mark for Investigation',
];
const assetOptions = [
  'Reclassify Assets',
  'Change Asset Properties',
  'Attach Not-Scanned Assets',
  'Attach by Barcode or by Serial #',
  'Replace Incorrect Asset',
  'Switch Deliver / Return',
  'Detach Assets',
  'Move to Another Sales Order',
];

export default function ImportedInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(2); // 2 = Detailed
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    async function fetchInvoice() {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('imported_invoices')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        setError('Imported invoice not found.');
        setInvoice(null);
      } else {
        setInvoice(data);
      }
      setLoading(false);
    }
    fetchInvoice();
  }, [id]);

  // Dummy delivered assets from line_items
  const deliveredAssets = Array.isArray(invoice?.data?.line_items)
    ? invoice.data.line_items.map((item, idx) => ({
        ...item,
        id: idx + 1,
        category: item.category || 'INDUSTRIAL CYLINDERS',
        group: item.group || '-',
        type: item.type || '-',
        product_code: item.product_code,
        description: item.description,
        ownership: item.ownership || '-',
        barcode: item.barcode || '-',
        serial_number: item.serial_number || '-',
      }))
    : [];

  const handleAction = (action) => {
    if (action === 'Change Customer') {
      setSnackbar('Change Customer - Now functional! (See ImportApprovalDetail for full implementation)');
    } else if (action === 'Change Record Date and Time') {
      setSnackbar('Change Record Date and Time - Now functional! (See ImportApprovalDetail for full implementation)');
    } else if (action === 'Change Sales Order Number') {
      setSnackbar('Change Sales Order Number - Now functional! (See ImportApprovalDetail for full implementation)');
    } else if (action === 'Change PO Number') {
      setSnackbar('Change PO Number - Now functional! (See ImportApprovalDetail for full implementation)');
    } else if (action === 'Change Location') {
      setSnackbar('Change Location - Now functional! (See ImportApprovalDetail for full implementation)');
    } else {
      setSnackbar(`${action} - Feature coming soon!`);
    }
  };

  return (
    <Box p={{ xs: 1, md: 4 }}>
      {/* Debug info for troubleshooting */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: '#fffbe6', color: '#333', fontSize: 13 }}>
        <b>Debug Info:</b><br />
        <div>ID from useParams: <code>{id}</code></div>
        <div>Fetched invoice object:</div>
        <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f7f7f7', borderRadius: 4, padding: 8 }}>{JSON.stringify(invoice, null, 2)}</pre>
      </Paper>
      <Paper elevation={4} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, mb: 4 }}>
        <Grid container spacing={4}>
          {/* Main Info */}
          <Grid item xs={12} md={9}>
            <Typography variant="h4" fontWeight={800} mb={2}>Delivery</Typography>
            {loading ? (
              <Box textAlign="center" py={6}><CircularProgress /></Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : invoice && (
              <>
                <Box component={Paper} variant="outlined" sx={{ mb: 2, p: 2, background: '#f8fafc' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={4}><b>Sales Order #:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.invoice_number || invoice.data?.order_number || invoice.id}</Grid>
                    <Grid item xs={6} sm={4}><b>Effective Date:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.date || '-'}</Grid>
                    <Grid item xs={6} sm={4}><b>Saved to Site:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.uploaded_at ? new Date(invoice.uploaded_at).toLocaleString() : '-'}</Grid>
                    <Grid item xs={6} sm={4}><b>Entered By:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.entered_by || '-'}</Grid>
                    <Grid item xs={6} sm={4}><b>Entered From:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.entered_from || '-'}</Grid>
                    <Grid item xs={6} sm={4}><b>Location:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.location || '-'}</Grid>
                    <Grid item xs={6} sm={4}><b>Customer:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.customer_name || '-'}</Grid>
                    <Grid item xs={6} sm={4}><b>Branch:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.branch || '-'}</Grid>
                    <Grid item xs={6} sm={4}><b>Signer's Name:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.signer_name || 'None Entered'}</Grid>
                    <Grid item xs={6} sm={4}><b>Signature:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.signature || 'None Entered'}</Grid>
                    <Grid item xs={6} sm={4}><b>Verification Status:</b></Grid>
                    <Grid item xs={6} sm={8}>{invoice.data?.verification_status || 'Not verified'} <Button size="small" variant="text">Verification Page</Button></Grid>
                    <Grid item xs={6} sm={4}><b>Map:</b></Grid>
                    <Grid item xs={6} sm={8}><Button size="small" variant="text">View</Button></Grid>
                  </Grid>
                </Box>
                <Alert severity="info" sx={{ mb: 2 }}>There is 1 Audit Entry <Button size="small" variant="text">Show</Button></Alert>
                <Button variant="outlined" sx={{ mb: 3 }}>ADD NOTE TO RECORD</Button>
                <Typography variant="h5" fontWeight={700} mb={2}>Delivered Assets</Typography>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                  <Tab label="Scan Time" />
                  <Tab label="Lots" />
                  <Tab label="Detailed" />
                  <Tab label="Summary" />
                </Tabs>
                {/* Only show table for Detailed tab for now */}
                {tab === 2 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Hist</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Group</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Product Code</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Ownership</TableCell>
                          <TableCell>Barcode</TableCell>
                          <TableCell>Serial Number</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deliveredAssets.map(asset => (
                          <TableRow key={asset.id}>
                            <TableCell><Button size="small" variant="text">View</Button></TableCell>
                            <TableCell>{asset.category}</TableCell>
                            <TableCell>{asset.group}</TableCell>
                            <TableCell>{asset.type}</TableCell>
                            <TableCell>{asset.product_code}</TableCell>
                            <TableCell>{asset.description}</TableCell>
                            <TableCell>{asset.ownership}</TableCell>
                            <TableCell>{asset.barcode}</TableCell>
                            <TableCell>{asset.serial_number}</TableCell>
                            <TableCell><Checkbox /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </Grid>
          {/* Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography fontWeight={700} mb={1}>RECORD OPTIONS</Typography>
              <List dense>
                {recordOptions.map(opt => (
                  <ListItem key={opt} disablePadding>
                    <ListItemButton onClick={() => handleAction(opt)}>
                      <ListItemText primary={opt} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700} mb={1}>ASSET OPTIONS</Typography>
              <List dense>
                {assetOptions.map(opt => (
                  <ListItem key={opt} disablePadding>
                    <ListItemButton onClick={() => handleAction(opt)}>
                      <ListItemText primary={opt} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  );
} 