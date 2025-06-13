import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Grid, List, ListItem, ListItemText, Divider, Alert } from '@mui/material';

const mockDelivered = [
  {
    category: 'INDUSTRIAL CYLINDERS', group: 'MIXGAS', type: 'BCS68-300', product_code: 'BCS68-300', description: 'ARGON 92% CO2 8% BOTTLE - SIZE 300', ownership: 'RP&G', barcode: '660331182', serial_number: '24D150064', addendum: '1'
  },
  {
    category: 'INDUSTRIAL CYLINDERS', group: 'OXYGEN', type: 'BOX125', product_code: 'BOX125', description: 'OXYGEN BOTTLE - SIZE 125', ownership: 'RP&G', barcode: '660335443', serial_number: '24D366019', addendum: '1'
  }
];
const mockReturned = [
  {
    category: 'INDUSTRIAL CYLINDERS', group: 'MIXGAS', type: 'BCS68-300', product_code: 'BCS68-300', description: 'ARGON 92% CO2 8% BOTTLE - SIZE 300', ownership: 'RP&G', barcode: '660333418', serial_number: '25D378039', addendum: 'ORIG'
  },
  {
    category: 'INDUSTRIAL CYLINDERS', group: 'MIXGAS', type: 'BCS68-300', product_code: 'BCS68-300', description: 'ARGON 92% CO2 8% BOTTLE - SIZE 300', ownership: 'WeldCor', barcode: '634456181', serial_number: 'HP705108', addendum: 'ORIG'
  },
  {
    category: 'INDUSTRIAL CYLINDERS', group: 'OXYGEN', type: 'BOX125', product_code: 'BOX125', description: 'OXYGEN BOTTLE - SIZE 125', ownership: 'WeldCor', barcode: '660328887', serial_number: 'H3515', addendum: 'ORIG'
  }
];

const deliveryInfo = {
  salesOrder: '63310',
  effectiveDate: '5/14/2025 2:49:19 PM (UTC -6:00)',
  savedToSite: '5/14/2025 2:50:49 PM (UTC -6:00)',
  enteredBy: 'Hayden Soloway',
  enteredFrom: 'Smartphone/Tablet',
  customer: 'Hydraulitechs Solutions Ltd. (80000A7B-1713380745A)',
  branch: 'In-House: Saskatoon (4)',
  signer: 'None Entered',
  signature: 'None Entered',
  verificationStatus: 'Not verified',
  verificationPage: '#',
  map: '#',
};

export default function ImportApprovalDetail() {
  try {
    const { invoiceNumber } = useParams();
    const navigate = useNavigate();
    console.log('Detail page loaded for invoice:', invoiceNumber);

    // TODO: Fetch real data by invoiceNumber
    const delivered = mockDelivered;
    const returned = mockReturned;

    return (
      <Box p={3}>
        <Button variant="outlined" sx={{ mb: 2 }} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Invoice {invoiceNumber} — Detailed Assets
        </Typography>
        <Grid container spacing={3} alignItems="flex-start">
          {/* Left: Delivery Info and Tables */}
          <Grid item xs={12} md={9}>
            <Typography variant="h6" fontWeight={700} mb={2}>Delivery</Typography>
            <Paper sx={{ mb: 2 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Sales Order #:</TableCell>
                    <TableCell>{deliveryInfo.salesOrder}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Effective Date:</TableCell>
                    <TableCell>{deliveryInfo.effectiveDate}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Saved to Site:</TableCell>
                    <TableCell>{deliveryInfo.savedToSite}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Entered By:</TableCell>
                    <TableCell>{deliveryInfo.enteredBy}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Entered From:</TableCell>
                    <TableCell>{deliveryInfo.enteredFrom}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Location:</TableCell>
                    <TableCell>
                      <b>Customer:</b> {deliveryInfo.customer} <Button size="small" variant="text">View</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Branch:</TableCell>
                    <TableCell>{deliveryInfo.branch}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Signer&apos;s Name:</TableCell>
                    <TableCell>{deliveryInfo.signer}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Signature:</TableCell>
                    <TableCell>{deliveryInfo.signature}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Verification Status:</TableCell>
                    <TableCell>
                      {deliveryInfo.verificationStatus} <Button size="small" variant="text">Verification Page</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Map:</TableCell>
                    <TableCell><Button size="small" variant="text">View</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
            <Box mb={2}>
              <Alert severity="info" sx={{ mb: 1 }}>There is 1 Audit Entry <Button size="small">Show</Button></Alert>
              <Alert severity="info">There is 1 Addendum <Button size="small">Show</Button></Alert>
            </Box>
            <Button variant="outlined" sx={{ mb: 3 }}>Add Note to Record</Button>
            <Typography variant="h6" fontWeight={700} mt={3} mb={1}>Delivered Assets</Typography>
            <Paper sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Product Code</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Ownership</TableCell>
                    <TableCell>Barcode</TableCell>
                    <TableCell>Serial Number</TableCell>
                    <TableCell>Addendum</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {delivered.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.group}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.product_code}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{row.ownership}</TableCell>
                      <TableCell>{row.barcode}</TableCell>
                      <TableCell>{row.serial_number}</TableCell>
                      <TableCell>{row.addendum}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
            <Typography variant="h6" fontWeight={700} mt={3} mb={1}>Returned Assets</Typography>
            <Paper>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Product Code</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Ownership</TableCell>
                    <TableCell>Barcode</TableCell>
                    <TableCell>Serial Number</TableCell>
                    <TableCell>Addendum</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {returned.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.group}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.product_code}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{row.ownership}</TableCell>
                      <TableCell>{row.barcode}</TableCell>
                      <TableCell>{row.serial_number}</TableCell>
                      <TableCell>{row.addendum}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
          {/* Right: Record/Asset Options */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1} color="text.secondary">RECORD OPTIONS</Typography>
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
                ].map((label, i) => (
                  <ListItem button key={label} onClick={() => alert(label)}>
                    <ListItemText primary={label} />
                  </ListItem>
                ))}
              </List>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1} color="text.secondary">ASSET OPTIONS</Typography>
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
                ].map((label, i) => (
                  <ListItem button key={label} onClick={() => alert(label)}>
                    <ListItemText primary={label} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  } catch (e) {
    console.error('Error in ImportApprovalDetail:', e);
    return <div style={{ color: 'red', padding: 32 }}>Error: {e.message}</div>;
  }
} 