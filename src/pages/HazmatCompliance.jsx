import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as DownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';

export default function HazmatCompliance() {
  const { profile, organization } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();
  const [complianceRecords, setComplianceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [newRecord, setNewRecord] = useState({
    asset_id: '',
    regulation: '',
    status: 'compliant',
    next_inspection: '',
    notes: ''
  });

  useEffect(() => {
    // Simulate loading compliance data
    setTimeout(() => {
      setComplianceRecords([
        {
          id: 1,
          asset_id: 'CYL-001',
          regulation: 'DOT 49 CFR 180.205',
          status: 'compliant',
          last_inspection: '2024-01-15',
          next_inspection: '2024-07-15',
          inspector: 'John Smith',
          notes: 'Visual inspection passed'
        },
        {
          id: 2,
          asset_id: 'CYL-002',
          regulation: 'DOT 49 CFR 180.209',
          status: 'expires_soon',
          last_inspection: '2023-12-10',
          next_inspection: '2024-02-10',
          inspector: 'Jane Doe',
          notes: 'Hydrostatic test required'
        },
        {
          id: 3,
          asset_id: 'CYL-003',
          regulation: 'OSHA 1910.101',
          status: 'non_compliant',
          last_inspection: '2023-08-20',
          next_inspection: '2024-01-01',
          inspector: 'Mike Johnson',
          notes: 'Failed pressure test - requires repair'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'compliant': return 'success';
      case 'expires_soon': return 'warning';
      case 'non_compliant': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'compliant': return 'Compliant';
      case 'expires_soon': return 'Expires Soon';
      case 'non_compliant': return 'Non-Compliant';
      default: return status;
    }
  };

  const handleAddRecord = () => {
    const newId = Math.max(...complianceRecords.map(r => r.id), 0) + 1;
    setComplianceRecords([...complianceRecords, {
      ...newRecord,
      id: newId,
      last_inspection: new Date().toISOString().split('T')[0],
      inspector: profile?.full_name || 'Current User'
    }]);
    setNewRecord({
      asset_id: '',
      regulation: '',
      status: 'compliant',
      next_inspection: '',
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
          Hazmat Compliance
        </Typography>
        <Typography>Loading compliance data...</Typography>
      </Box>
    );
  }

  const compliantCount = complianceRecords.filter(r => r.status === 'compliant').length;
  const expiringCount = complianceRecords.filter(r => r.status === 'expires_soon').length;
  const nonCompliantCount = complianceRecords.filter(r => r.status === 'non_compliant').length;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Hazmat Compliance
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Monitor and manage hazardous material compliance for your {assetsName.toLowerCase()}
      </Typography>

      {/* Compliance Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {compliantCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Compliant {assetsName}
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
                <WarningIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {expiringCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expiring Soon
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
                <WarningIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {nonCompliantCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Non-Compliant
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
                <Box>
                  <Typography variant="h4">
                    {complianceRecords.length}
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
          Add Compliance Record
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
        >
          Export Report
        </Button>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
        >
          Import Records
        </Button>
      </Box>

      {/* Alerts for Non-Compliant Items */}
      {nonCompliantCount > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Immediate Action Required
          </Typography>
          You have {nonCompliantCount} non-compliant {assetsName.toLowerCase()} that require immediate attention.
        </Alert>
      )}

      {expiringCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Inspections Due Soon
          </Typography>
          {expiringCount} {assetsName.toLowerCase()} have inspections due within 30 days.
        </Alert>
      )}

      {/* Compliance Records Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{assetName} ID</TableCell>
                <TableCell>Regulation</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Inspection</TableCell>
                <TableCell>Next Inspection</TableCell>
                <TableCell>Inspector</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {complianceRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.asset_id}</TableCell>
                  <TableCell>{record.regulation}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(record.status)}
                      color={getStatusColor(record.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{record.last_inspection}</TableCell>
                  <TableCell>{record.next_inspection}</TableCell>
                  <TableCell>{record.inspector}</TableCell>
                  <TableCell>{record.notes}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
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
        <DialogTitle>Add Compliance Record</DialogTitle>
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
              <FormControl fullWidth>
                <InputLabel>Regulation</InputLabel>
                <Select
                  value={newRecord.regulation}
                  onChange={(e) => setNewRecord({ ...newRecord, regulation: e.target.value })}
                  label="Regulation"
                >
                  <MenuItem value="DOT 49 CFR 180.205">DOT 49 CFR 180.205 - Visual Inspection</MenuItem>
                  <MenuItem value="DOT 49 CFR 180.209">DOT 49 CFR 180.209 - Hydrostatic Test</MenuItem>
                  <MenuItem value="OSHA 1910.101">OSHA 1910.101 - Compressed Gases</MenuItem>
                  <MenuItem value="NFPA 55">NFPA 55 - Compressed Gases</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newRecord.status}
                  onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="compliant">Compliant</MenuItem>
                  <MenuItem value="expires_soon">Expires Soon</MenuItem>
                  <MenuItem value="non_compliant">Non-Compliant</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Next Inspection Date"
                value={newRecord.next_inspection}
                onChange={(e) => setNewRecord({ ...newRecord, next_inspection: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={newRecord.notes}
                onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddRecord} variant="contained">
            Add Record
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}