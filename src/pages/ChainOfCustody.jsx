import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert
} from '@mui/material';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  FileDownload as DownloadIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocalShipping as ShippingIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';

export default function ChainOfCustody() {
  const { profile, organization } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();
  const [custodyRecords, setCustodyRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newRecord, setNewRecord] = useState({
    asset_id: '',
    from_party: '',
    to_party: '',
    transfer_reason: '',
    notes: ''
  });

  useEffect(() => {
    // Simulate loading custody data
    setTimeout(() => {
      setCustodyRecords([
        {
          id: 1,
          asset_id: 'CYL-001',
          chain: [
            {
              id: 1,
              timestamp: '2024-01-10T08:00:00Z',
              from_party: 'Warehouse',
              to_party: 'Driver - John Smith',
              transfer_reason: 'Delivery Preparation',
              notes: 'Asset loaded for delivery route A',
              verified_by: 'Warehouse Manager',
              signature: 'verified'
            },
            {
              id: 2,
              timestamp: '2024-01-10T14:30:00Z',
              from_party: 'Driver - John Smith',
              to_party: 'Customer - ABC Corp',
              transfer_reason: 'Delivery',
              notes: 'Delivered to customer location, signed receipt obtained',
              verified_by: 'Customer Rep',
              signature: 'verified'
            }
          ],
          current_custodian: 'Customer - ABC Corp',
          status: 'active',
          created_date: '2024-01-10',
          last_updated: '2024-01-10T14:30:00Z'
        },
        {
          id: 2,
          asset_id: 'CYL-002',
          chain: [
            {
              id: 1,
              timestamp: '2024-01-12T09:15:00Z',
              from_party: 'Warehouse',
              to_party: 'Maintenance Team',
              transfer_reason: 'Scheduled Maintenance',
              notes: 'Transferred for routine inspection and maintenance',
              verified_by: 'Maintenance Supervisor',
              signature: 'verified'
            },
            {
              id: 2,
              timestamp: '2024-01-12T16:45:00Z',
              from_party: 'Maintenance Team',
              to_party: 'Warehouse',
              transfer_reason: 'Maintenance Complete',
              notes: 'Maintenance completed, returned to warehouse',
              verified_by: 'Warehouse Manager',
              signature: 'verified'
            }
          ],
          current_custodian: 'Warehouse',
          status: 'active',
          created_date: '2024-01-12',
          last_updated: '2024-01-12T16:45:00Z'
        },
        {
          id: 3,
          asset_id: 'CYL-003',
          chain: [
            {
              id: 1,
              timestamp: '2024-01-08T10:00:00Z',
              from_party: 'Warehouse',
              to_party: 'Driver - Jane Doe',
              transfer_reason: 'Delivery Preparation',
              notes: 'Asset prepared for delivery',
              verified_by: 'Warehouse Staff',
              signature: 'pending'
            }
          ],
          current_custodian: 'Driver - Jane Doe',
          status: 'pending_verification',
          created_date: '2024-01-08',
          last_updated: '2024-01-08T10:00:00Z'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending_verification': return 'warning';
      case 'disputed': return 'error';
      case 'resolved': return 'info';
      default: return 'default';
    }
  };

  const getTransferIcon = (reason) => {
    switch (reason.toLowerCase()) {
      case 'delivery': return <ShippingIcon />;
      case 'maintenance': return <AssignmentIcon />;
      case 'delivery preparation': return <PersonIcon />;
      default: return <BusinessIcon />;
    }
  };

  const handleAddRecord = () => {
    const newId = Math.max(...custodyRecords.map(r => r.id), 0) + 1;
    const newCustodyRecord = {
      id: newId,
      asset_id: newRecord.asset_id,
      chain: [{
        id: 1,
        timestamp: new Date().toISOString(),
        from_party: newRecord.from_party,
        to_party: newRecord.to_party,
        transfer_reason: newRecord.transfer_reason,
        notes: newRecord.notes,
        verified_by: profile?.full_name || 'Current User',
        signature: 'verified'
      }],
      current_custodian: newRecord.to_party,
      status: 'active',
      created_date: new Date().toISOString().split('T')[0],
      last_updated: new Date().toISOString()
    };

    setCustodyRecords([...custodyRecords, newCustodyRecord]);
    setNewRecord({
      asset_id: '',
      from_party: '',
      to_party: '',
      transfer_reason: '',
      notes: ''
    });
    setAddDialog(false);
  };

  const assetName = isReady ? terms.asset : 'Asset';
  const assetsName = isReady ? terms.assets : 'Assets';

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Chain of Custody
        </Typography>
        <Typography>Loading custody data...</Typography>
      </Box>
    );
  }

  const activeCount = custodyRecords.filter(r => r.status === 'active').length;
  const pendingCount = custodyRecords.filter(r => r.status === 'pending_verification').length;
  const disputedCount = custodyRecords.filter(r => r.status === 'disputed').length;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Chain of Custody
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Track and manage custody transfers for your {assetsName.toLowerCase()}
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SecurityIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {activeCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AssignmentIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {pendingCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Verification
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SecurityIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {disputedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Disputed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SecurityIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {custodyRecords.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialog(true)}
        >
          Record Transfer
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
        >
          Export Records
        </Button>
      </Box>

      {/* Alert for Pending Verifications */}
      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Pending Verifications
          </Typography>
          {pendingCount} custody transfer(s) require signature verification.
        </Alert>
      )}

      {/* Custody Records Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{assetName} ID</TableCell>
                <TableCell>Current Custodian</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Chain Length</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {custodyRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.asset_id}</TableCell>
                  <TableCell>{record.current_custodian}</TableCell>
                  <TableCell>
                    <Chip
                      label={record.status.replace('_', ' ')}
                      color={getStatusColor(record.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{record.chain.length} transfers</TableCell>
                  <TableCell>{record.created_date}</TableCell>
                  <TableCell>
                    {new Date(record.last_updated).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedRecord(record);
                        setDetailDialog(true);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Record Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Custody Transfer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`${assetName} ID`}
                value={newRecord.asset_id}
                onChange={(e) => setNewRecord({ ...newRecord, asset_id: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="From Party"
                value={newRecord.from_party}
                onChange={(e) => setNewRecord({ ...newRecord, from_party: e.target.value })}
                placeholder="e.g., Warehouse, Driver - John Smith"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="To Party"
                value={newRecord.to_party}
                onChange={(e) => setNewRecord({ ...newRecord, to_party: e.target.value })}
                placeholder="e.g., Customer - ABC Corp, Maintenance Team"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Transfer Reason</InputLabel>
                <Select
                  value={newRecord.transfer_reason}
                  onChange={(e) => setNewRecord({ ...newRecord, transfer_reason: e.target.value })}
                  label="Transfer Reason"
                >
                  <MenuItem value="Delivery">Delivery</MenuItem>
                  <MenuItem value="Delivery Preparation">Delivery Preparation</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                  <MenuItem value="Return">Return</MenuItem>
                  <MenuItem value="Storage">Storage</MenuItem>
                  <MenuItem value="Quality Check">Quality Check</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={newRecord.notes}
                onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                placeholder="Additional details about the transfer..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddRecord} variant="contained">
            Record Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Chain of Custody - {selectedRecord?.asset_id}
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Custody Chain
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Current Custodian: {selectedRecord.current_custodian}
              </Typography>
              
              <Timeline>
                {selectedRecord.chain.map((transfer, index) => (
                  <TimelineItem key={transfer.id}>
                    <TimelineSeparator>
                      <TimelineDot color="primary">
                        {getTransferIcon(transfer.transfer_reason)}
                      </TimelineDot>
                      {index < selectedRecord.chain.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                      <Typography variant="h6" component="span">
                        {transfer.transfer_reason}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(transfer.timestamp).toLocaleString()}
                      </Typography>
                      <Box mt={1}>
                        <Typography variant="body2">
                          <strong>From:</strong> {transfer.from_party}
                        </Typography>
                        <Typography variant="body2">
                          <strong>To:</strong> {transfer.to_party}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Verified by:</strong> {transfer.verified_by}
                        </Typography>
                        {transfer.notes && (
                          <Typography variant="body2" mt={1}>
                            <strong>Notes:</strong> {transfer.notes}
                          </Typography>
                        )}
                        <Box mt={1}>
                          <Chip
                            label={transfer.signature === 'verified' ? 'Verified' : 'Pending'}
                            color={transfer.signature === 'verified' ? 'success' : 'warning'}
                            size="small"
                          />
                        </Box>
                      </Box>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          <Button variant="contained">Add Transfer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}