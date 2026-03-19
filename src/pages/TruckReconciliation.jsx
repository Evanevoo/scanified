import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  LocalShipping as TruckIcon,
  Assignment as ManifestIcon,
  CheckCircle as CompleteIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Print as PrintIcon,
  CloudDownload as ExportIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { TruckReconciliationService } from '../services/truckReconciliationService';
import logger from '../utils/logger';

export default function TruckReconciliation() {
  const { profile, organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [manifests, setManifests] = useState([]);
  const [selectedManifest, setSelectedManifest] = useState(null);
  const [reconciliationDialog, setReconciliationDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [actualCounts, setActualCounts] = useState({
    out: 0,
    in: 0,
    exchange: 0
  });
  const [notes, setNotes] = useState('');
  const [stats, setStats] = useState({
    totalManifests: 0,
    pendingReconciliation: 0,
    completedToday: 0,
    accuracyRate: 0
  });

  useEffect(() => {
    if (profile?.organization_id) {
      loadData();
    }
  }, [profile?.organization_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load manifests
      const manifestsData = await TruckReconciliationService.getDeliveryManifests(
        profile.organization_id,
        { status: 'all' }
      );
      setManifests(manifestsData || []);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const pendingCount = manifestsData?.filter(m => m.status === 'pending').length || 0;
      const completedToday = manifestsData?.filter(m => 
        m.status === 'completed' && 
        m.updated_at?.startsWith(today)
      ).length || 0;

      // Calculate accuracy rate
      const completed = manifestsData?.filter(m => m.reconciliation) || [];
      const accuracySum = completed.reduce((sum, m) => {
        const expected = m.expected_out + m.expected_in;
        const actual = m.reconciliation?.actual_out + m.reconciliation?.actual_in;
        return sum + (expected > 0 ? (actual / expected) * 100 : 100);
      }, 0);
      const accuracyRate = completed.length > 0 ? (accuracySum / completed.length).toFixed(1) : 100;

      setStats({
        totalManifests: manifestsData?.length || 0,
        pendingReconciliation: pendingCount,
        completedToday,
        accuracyRate
      });

    } catch (error) {
      logger.error('Error loading truck reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReconciliation = async (manifest) => {
    try {
      setSelectedManifest(manifest);
      setActualCounts({
        out: manifest.expected_out || 0,
        in: manifest.expected_in || 0,
        exchange: manifest.expected_exchange || 0
      });
      setNotes('');
      setActiveStep(0);
      setReconciliationDialog(true);
    } catch (error) {
      logger.error('Error starting reconciliation:', error);
    }
  };

  const handleCompleteReconciliation = async () => {
    try {
      // Start reconciliation first
      const reconciliation = await TruckReconciliationService.startTruckReconciliation(
        selectedManifest.id,
        profile.id
      );

      // Complete it with actual counts
      await TruckReconciliationService.completeTruckReconciliation(
        reconciliation.id,
        actualCounts,
        notes
      );

      setReconciliationDialog(false);
      loadData();
      
    } catch (error) {
      logger.error('Error completing reconciliation:', error);
      alert('Failed to complete reconciliation: ' + error.message);
    }
  };

  const handleViewReconciliation = async (manifest) => {
    try {
      const report = await TruckReconciliationService.generateReconciliationReport(
        manifest.reconciliation.id
      );
      
      // Show report in a new dialog or navigate to report page
      logger.log('Reconciliation report:', report);
      alert('Reconciliation report generated. See console for details.');
      
    } catch (error) {
      logger.error('Error viewing reconciliation:', error);
    }
  };

  const steps = [
    'Verify Expected Counts',
    'Enter Actual Counts',
    'Review Discrepancies',
    'Complete Reconciliation'
  ];

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>Truck Reconciliation</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={() => logger.log('Export data')}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => logger.log('Create manifest')}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
            >
              Create Manifest
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Manifests</Typography>
              <Typography variant="h4">{stats.totalManifests}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Pending Reconciliation</Typography>
              <Typography variant="h4" color="warning.main">{stats.pendingReconciliation}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Completed Today</Typography>
              <Typography variant="h4" color="success.main">{stats.completedToday}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Accuracy Rate</Typography>
              <Typography variant="h4" color="info.main">{`${stats.accuracyRate}%`}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manifests Table */}
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Delivery Manifests
        </Typography>

        {manifests.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <ManifestIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, display: 'block', mx: 'auto' }} />
            <Typography variant="h6" color="text.secondary">No manifests found</Typography>
            <Button
              variant="contained"
              onClick={() => logger.log('Create manifest')}
              sx={{ mt: 2, borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
            >
              Create Manifest
            </Button>
          </Box>
        ) : (
          <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell>Manifest #</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Expected Out/In</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {manifests.map((manifest) => (
                  <TableRow key={manifest.id}>
                    <TableCell>{manifest.manifest_number}</TableCell>
                    <TableCell>{manifest.driver?.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(manifest.manifest_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {manifest.expected_out} / {manifest.expected_in}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={manifest.status}
                        size="small"
                        color={manifest.status === 'completed' ? 'success' : manifest.status === 'pending' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {manifest.status === 'pending' ? (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleStartReconciliation(manifest)}
                          sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
                        >
                          Reconcile
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => handleViewReconciliation(manifest)}
                          sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Reconciliation Dialog */}
      <Dialog
        open={reconciliationDialog}
        onClose={() => setReconciliationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Truck Reconciliation - {selectedManifest?.manifest_number}
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Verify Expected Counts</StepLabel>
              <StepContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Expected counts from manifest:
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography>Out: {selectedManifest?.expected_out}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography>In: {selectedManifest?.expected_in}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography>Exchange: {selectedManifest?.expected_exchange}</Typography>
                  </Grid>
                </Grid>
                <Button onClick={() => setActiveStep(1)} sx={{ mt: 2 }}>
                  Continue
                </Button>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Enter Actual Counts</StepLabel>
              <StepContent>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      label="Actual Out"
                      type="number"
                      fullWidth
                      value={actualCounts.out}
                      onChange={(e) => setActualCounts({
                        ...actualCounts,
                        out: parseInt(e.target.value) || 0
                      })}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Actual In"
                      type="number"
                      fullWidth
                      value={actualCounts.in}
                      onChange={(e) => setActualCounts({
                        ...actualCounts,
                        in: parseInt(e.target.value) || 0
                      })}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Actual Exchange"
                      type="number"
                      fullWidth
                      value={actualCounts.exchange}
                      onChange={(e) => setActualCounts({
                        ...actualCounts,
                        exchange: parseInt(e.target.value) || 0
                      })}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button onClick={() => setActiveStep(0)} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveStep(2)}>
                    Continue
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Review Discrepancies</StepLabel>
              <StepContent>
                {(actualCounts.out !== selectedManifest?.expected_out ||
                  actualCounts.in !== selectedManifest?.expected_in ||
                  actualCounts.exchange !== selectedManifest?.expected_exchange) ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Discrepancies detected!
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Out: {actualCounts.out - (selectedManifest?.expected_out || 0)}<br />
                      In: {actualCounts.in - (selectedManifest?.expected_in || 0)}<br />
                      Exchange: {actualCounts.exchange - (selectedManifest?.expected_exchange || 0)}
                    </Typography>
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    All counts match! No discrepancies found.
                  </Alert>
                )}
                
                <TextField
                  label="Reconciliation Notes"
                  multiline
                  rows={4}
                  fullWidth
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any notes about discrepancies or issues..."
                />
                
                <Box sx={{ mt: 2 }}>
                  <Button onClick={() => setActiveStep(1)} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveStep(3)}>
                    Continue
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Complete Reconciliation</StepLabel>
              <StepContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Review and confirm the reconciliation details before completing.
                </Alert>
                <Box sx={{ mt: 2 }}>
                  <Button onClick={() => setActiveStep(2)} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button variant="contained" onClick={handleCompleteReconciliation} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
                    Complete Reconciliation
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReconciliationDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}