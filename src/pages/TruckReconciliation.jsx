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
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  LocalShipping as TruckIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  FileDownload as DownloadIcon,
  Sync as SyncIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';

export default function TruckReconciliation() {
  const { profile, organization } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();
  const [activeTab, setActiveTab] = useState(0);
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReconciliation, setNewReconciliation] = useState({
    truck_id: '',
    driver: '',
    route: '',
    expected_assets: 0,
    actual_assets: 0
  });

  useEffect(() => {
    // Simulate loading reconciliation data
    setTimeout(() => {
      setReconciliations([
        {
          id: 1,
          truck_id: 'TRUCK-001',
          driver: 'John Smith',
          route: 'Route A - Downtown',
          date: '2024-01-15',
          status: 'completed',
          expected_assets: 25,
          actual_assets: 25,
          discrepancies: 0,
          items: [
            { asset_id: 'CYL-001', expected: 'loaded', actual: 'loaded', status: 'match' },
            { asset_id: 'CYL-002', expected: 'loaded', actual: 'loaded', status: 'match' },
            { asset_id: 'CYL-003', expected: 'delivered', actual: 'delivered', status: 'match' }
          ]
        },
        {
          id: 2,
          truck_id: 'TRUCK-002',
          driver: 'Jane Doe',
          route: 'Route B - Industrial',
          date: '2024-01-15',
          status: 'discrepancy',
          expected_assets: 30,
          actual_assets: 28,
          discrepancies: 2,
          items: [
            { asset_id: 'CYL-010', expected: 'loaded', actual: 'missing', status: 'missing' },
            { asset_id: 'CYL-011', expected: 'delivered', actual: 'loaded', status: 'not_delivered' },
            { asset_id: 'CYL-012', expected: 'loaded', actual: 'loaded', status: 'match' }
          ]
        },
        {
          id: 3,
          truck_id: 'TRUCK-003',
          driver: 'Mike Johnson',
          route: 'Route C - Suburbs',
          date: '2024-01-15',
          status: 'pending',
          expected_assets: 20,
          actual_assets: null,
          discrepancies: null,
          items: []
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'discrepancy': return 'error';
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      default: return 'default';
    }
  };

  const getItemStatusColor = (status) => {
    switch (status) {
      case 'match': return 'success';
      case 'missing': return 'error';
      case 'not_delivered': return 'warning';
      case 'extra': return 'info';
      default: return 'default';
    }
  };

  const assetName = isReady ? terms.asset : 'Asset';
  const assetsName = isReady ? terms.assets : 'Assets';

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Truck Reconciliation
        </Typography>
        <Typography>Loading reconciliation data...</Typography>
      </Box>
    );
  }

  const completedCount = reconciliations.filter(r => r.status === 'completed').length;
  const discrepancyCount = reconciliations.filter(r => r.status === 'discrepancy').length;
  const pendingCount = reconciliations.filter(r => r.status === 'pending').length;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Truck Reconciliation
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Track and reconcile {assetsName.toLowerCase()} on delivery trucks
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {completedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
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
                <ErrorIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {discrepancyCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Discrepancies
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
                    {pendingCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
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
                <TruckIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4">
                    {reconciliations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Trucks
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
        >
          Start Reconciliation
        </Button>
        <Button
          variant="outlined"
          startIcon={<SyncIcon />}
        >
          Sync Data
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
        >
          Export Report
        </Button>
      </Box>

      {/* Discrepancy Alert */}
      {discrepancyCount > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Discrepancies Found
          </Typography>
          {discrepancyCount} truck(s) have discrepancies that require attention.
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Today's Reconciliations" />
          <Tab label="Historical Data" />
          <Tab label="Discrepancy Reports" />
        </Tabs>
      </Paper>

      {/* Reconciliation Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Truck ID</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expected</TableCell>
                <TableCell>Actual</TableCell>
                <TableCell>Discrepancies</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reconciliations.map((reconciliation) => (
                <TableRow key={reconciliation.id}>
                  <TableCell>{reconciliation.truck_id}</TableCell>
                  <TableCell>{reconciliation.driver}</TableCell>
                  <TableCell>{reconciliation.route}</TableCell>
                  <TableCell>{reconciliation.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={reconciliation.status.replace('_', ' ')}
                      color={getStatusColor(reconciliation.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{reconciliation.expected_assets}</TableCell>
                  <TableCell>{reconciliation.actual_assets || '-'}</TableCell>
                  <TableCell>
                    {reconciliation.discrepancies !== null && reconciliation.discrepancies > 0 ? (
                      <Chip
                        label={reconciliation.discrepancies}
                        color="error"
                        size="small"
                      />
                    ) : reconciliation.discrepancies === 0 ? (
                      <Chip
                        label="0"
                        color="success"
                        size="small"
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Tab Content */}
      {activeTab === 1 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Historical Reconciliation Data
          </Typography>
          <Typography color="text.secondary">
            View reconciliation history and trends over time.
          </Typography>
        </Box>
      )}

      {activeTab === 2 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Discrepancy Reports
          </Typography>
          <Typography color="text.secondary">
            Detailed analysis of discrepancies and resolution tracking.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
