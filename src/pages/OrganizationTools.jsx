import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, CardActions,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Divider, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon, Switch, FormControlLabel
} from '@mui/material';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  DataUsage as DataIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  FileCopy as FileCopyIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Build as BuildIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function OrganizationTools() {
  const { profile, organization } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState({
    customers: { valid: 0, invalid: 0, issues: [] },
    cylinders: { valid: 0, invalid: 0, issues: [] },
    deliveries: { valid: 0, invalid: 0, issues: [] },
    locations: { valid: 0, invalid: 0, issues: [] }
  });
  const [exportDialog, setExportDialog] = useState(false);
  const [cleanupDialog, setCleanupDialog] = useState(false);
  const [validationDialog, setValidationDialog] = useState(false);
  const [duplicateReviewDialog, setDuplicateReviewDialog] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState({
    emails: [],
    customers: [],
    cylinders: []
  });
  const [selectedDuplicates, setSelectedDuplicates] = useState({});
  const [exportParams, setExportParams] = useState({
    format: 'csv',
    dateRange: '30d',
    includeDetails: true,
    dataTypes: ['customers', 'cylinders', 'deliveries']
  });
  const [cleanupParams, setCleanupParams] = useState({
    removeDuplicates: true,
    fixOrphanedRecords: true,
    archiveOldRecords: false,
    dryRun: true
  });
  const [validationParams, setValidationParams] = useState({
    checkDataIntegrity: true,
    validateRelationships: true,
    checkForOrphans: true,
    validateBusinessRules: true
  });

  useEffect(() => {
    if (profile && organization) {
      loadValidationResults();
    }
  }, [profile, organization]);

  const loadValidationResults = async () => {
    setLoading(true);
    try {
      // In production, these would be real Supabase queries filtered by organization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setValidationResults({
        customers: { 
          valid: 245, 
          invalid: 2, 
          issues: [
            { type: 'missing_email', count: 1, description: 'Customer missing email address' },
            { type: 'duplicate_name', count: 1, description: 'Duplicate customer names found' }
          ] 
        },
        cylinders: { 
          valid: 890, 
          invalid: 5, 
          issues: [
            { type: 'missing_serial', count: 3, description: 'Cylinders missing serial numbers' },
            { type: 'invalid_type', count: 2, description: 'Invalid cylinder types' }
          ] 
        },
        deliveries: { 
          valid: 156, 
          invalid: 0, 
          issues: [] 
        },
        locations: { 
          valid: 89, 
          invalid: 1, 
          issues: [
            { type: 'missing_address', count: 1, description: 'Location missing address' }
          ] 
        }
      });
    } catch (error) {
      console.error('Error loading validation results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      setExportDialog(false);
      // In production, this would trigger a file download
      console.log('Exporting organization data with params:', exportParams);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 4000));
      setValidationDialog(false);
      await loadValidationResults();
      // In production, this would run actual validation queries
      console.log('Running validation with params:', validationParams);
    } catch (error) {
      console.error('Error running validation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (cleanupParams.dryRun) {
        // Simulate finding duplicates that need manual review
        const mockDuplicates = {
          emails: [
            {
              id: 'email_1',
              email: 'john.doe@example.com',
              duplicates: [
                { id: 'cust_1', name: 'John Doe', phone: '555-0101', created_at: '2024-01-15' },
                { id: 'cust_2', name: 'John Doe', phone: '555-0102', created_at: '2024-01-20' },
                { id: 'cust_3', name: 'John Doe', phone: '555-0103', created_at: '2024-02-01' }
              ]
            }
          ],
          customers: [
            {
              id: 'customer_1',
              name: 'ABC Company',
              duplicates: [
                { id: 'cust_4', address: '123 Main St', phone: '555-0201', created_at: '2024-01-10' },
                { id: 'cust_5', address: '123 Main Street', phone: '555-0201', created_at: '2024-01-15' }
              ]
            }
          ],
          cylinders: []
        };
        
        setDuplicateResults(mockDuplicates);
        setCleanupDialog(false);
        setDuplicateReviewDialog(true);
      } else {
        setCleanupDialog(false);
        // In production, this would run actual cleanup operations
        console.log('Running cleanup with params:', cleanupParams);
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateResolution = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      setDuplicateReviewDialog(false);
      setSelectedDuplicates({});
      await loadValidationResults();
      // In production, this would apply the selected resolutions
      console.log('Applying duplicate resolutions:', selectedDuplicates);
    } catch (error) {
      console.error('Error resolving duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateSelection = (duplicateType, duplicateId, recordId, action) => {
    setSelectedDuplicates(prev => ({
      ...prev,
      [`${duplicateType}_${duplicateId}_${recordId}`]: action
    }));
  };

  const getValidationColor = (valid, invalid) => {
    if (invalid === 0) return 'success';
    if (invalid < valid * 0.1) return 'warning';
    return 'error';
  };

  const getValidationIcon = (valid, invalid) => {
    if (invalid === 0) return <CheckIcon color="success" />;
    if (invalid < valid * 0.1) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  if (!profile || !organization) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {organization.name} - Data Tools
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadValidationResults}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Data Health Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getValidationIcon(validationResults.customers.valid, validationResults.customers.invalid)}
                <Typography variant="h6" sx={{ ml: 1 }}>Customers</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {validationResults.customers.valid + validationResults.customers.invalid}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {validationResults.customers.valid} valid, {validationResults.customers.invalid} issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getValidationIcon(validationResults.cylinders.valid, validationResults.cylinders.invalid)}
                <Typography variant="h6" sx={{ ml: 1 }}>Cylinders</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {validationResults.cylinders.valid + validationResults.cylinders.invalid}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {validationResults.cylinders.valid} valid, {validationResults.cylinders.invalid} issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getValidationIcon(validationResults.deliveries.valid, validationResults.deliveries.invalid)}
                <Typography variant="h6" sx={{ ml: 1 }}>Deliveries</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {validationResults.deliveries.valid + validationResults.deliveries.invalid}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {validationResults.deliveries.valid} valid, {validationResults.deliveries.invalid} issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getValidationIcon(validationResults.locations.valid, validationResults.locations.invalid)}
                <Typography variant="h6" sx={{ ml: 1 }}>Locations</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {validationResults.locations.valid + validationResults.locations.invalid}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {validationResults.locations.valid} valid, {validationResults.locations.invalid} issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudDownloadIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Export Data</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Export your organization's data in various formats for backup, analysis, or migration.
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialog(true)}
                fullWidth
              >
                Export Data
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Data Validation</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Validate your data integrity, check for issues, and ensure business rule compliance.
              </Typography>
              <Button
                variant="contained"
                startIcon={<CheckIcon />}
                onClick={() => setValidationDialog(true)}
                fullWidth
              >
                Run Validation
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BuildIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Data Cleanup</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Clean up duplicate records, fix data issues, and optimize your database.
              </Typography>
              <Button
                variant="contained"
                startIcon={<DeleteIcon />}
                onClick={() => setCleanupDialog(true)}
                fullWidth
              >
                Run Cleanup
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Issues Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Issues Found
          </Typography>
          {Object.entries(validationResults).map(([key, data]) => (
            <Accordion key={key} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', flex: 1 }}>
                    {key}
                  </Typography>
                  <Chip 
                    label={`${data.invalid} issues`} 
                    color={getValidationColor(data.valid, data.invalid)}
                    size="small"
                    sx={{ mr: 2 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {data.issues.length > 0 ? (
                  <List dense>
                    {data.issues.map((issue, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={issue.description}
                          secondary={`${issue.count} record(s) affected`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="success.main">
                    No issues found - all data is valid!
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Export Organization Data</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={exportParams.format}
                  onChange={(e) => setExportParams(prev => ({ ...prev, format: e.target.value }))}
                  label="Export Format"
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="pdf">PDF Report</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={exportParams.dateRange}
                  onChange={(e) => setExportParams(prev => ({ ...prev, dateRange: e.target.value }))}
                  label="Date Range"
                >
                  <MenuItem value="7d">Last 7 Days</MenuItem>
                  <MenuItem value="30d">Last 30 Days</MenuItem>
                  <MenuItem value="90d">Last 90 Days</MenuItem>
                  <MenuItem value="1y">Last Year</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Data Types to Export
              </Typography>
              <Grid container spacing={1}>
                {['customers', 'cylinders', 'deliveries', 'locations', 'analytics'].map((type) => (
                  <Grid item xs={6} md={4} key={type}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={exportParams.dataTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportParams(prev => ({
                                ...prev,
                                dataTypes: [...prev.dataTypes, type]
                              }));
                            } else {
                              setExportParams(prev => ({
                                ...prev,
                                dataTypes: prev.dataTypes.filter(t => t !== type)
                              }));
                            }
                          }}
                        />
                      }
                      label={type.charAt(0).toUpperCase() + type.slice(1)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={exportParams.includeDetails}
                    onChange={(e) => setExportParams(prev => ({ ...prev, includeDetails: e.target.checked }))}
                  />
                }
                label="Include detailed breakdowns and raw data"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            variant="contained" 
            disabled={loading || exportParams.dataTypes.length === 0}
            startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
          >
            {loading ? 'Exporting...' : 'Export Data'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={validationDialog} onClose={() => setValidationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Data Validation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select validation checks to run on your organization's data:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={validationParams.checkDataIntegrity}
                    onChange={(e) => setValidationParams(prev => ({ ...prev, checkDataIntegrity: e.target.checked }))}
                  />
                }
                label="Data Integrity Checks"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={validationParams.validateRelationships}
                    onChange={(e) => setValidationParams(prev => ({ ...prev, validateRelationships: e.target.checked }))}
                  />
                }
                label="Relationship Validation"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={validationParams.checkForOrphans}
                    onChange={(e) => setValidationParams(prev => ({ ...prev, checkForOrphans: e.target.checked }))}
                  />
                }
                label="Orphaned Record Detection"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={validationParams.validateBusinessRules}
                    onChange={(e) => setValidationParams(prev => ({ ...prev, validateBusinessRules: e.target.checked }))}
                  />
                }
                label="Business Rule Validation"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleValidation} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon />}
          >
            {loading ? 'Validating...' : 'Run Validation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialog} onClose={() => setCleanupDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Data Cleanup</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Warning:</strong> Data cleanup operations can permanently modify your data. 
            Always run a dry run first to see what changes would be made.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cleanupParams.removeDuplicates}
                    onChange={(e) => setCleanupParams(prev => ({ ...prev, removeDuplicates: e.target.checked }))}
                  />
                }
                label="Remove Duplicate Records"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cleanupParams.fixOrphanedRecords}
                    onChange={(e) => setCleanupParams(prev => ({ ...prev, fixOrphanedRecords: e.target.checked }))}
                  />
                }
                label="Fix Orphaned Records"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cleanupParams.archiveOldRecords}
                    onChange={(e) => setCleanupParams(prev => ({ ...prev, archiveOldRecords: e.target.checked }))}
                  />
                }
                label="Archive Old Records"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cleanupParams.dryRun}
                    onChange={(e) => setCleanupParams(prev => ({ ...prev, dryRun: e.target.checked }))}
                  />
                }
                label="Dry Run (Preview Only)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleCleanup} 
            variant="contained" 
            color={cleanupParams.dryRun ? "primary" : "error"}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {loading ? 'Cleaning...' : cleanupParams.dryRun ? 'Preview Changes' : 'Execute Cleanup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Review Dialog */}
      <Dialog open={duplicateReviewDialog} onClose={() => setDuplicateReviewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Review Duplicate Records</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Manual Review Required:</strong> The system found duplicate records that need your review. 
            For each duplicate group, select which record to keep and what to do with the others.
          </Alert>
          
          {/* Email Duplicates */}
          {duplicateResults.emails.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Duplicate Email Addresses ({duplicateResults.emails.length})
              </Typography>
              {duplicateResults.emails.map((emailGroup) => (
                <Card key={emailGroup.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Email: {emailGroup.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Found {emailGroup.duplicates.length} records with this email address
                    </Typography>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Customer Name</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {emailGroup.duplicates.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.name}</TableCell>
                              <TableCell>{record.phone}</TableCell>
                              <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                              <TableCell align="center">
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={selectedDuplicates[`email_${emailGroup.id}_${record.id}`] || 'keep'}
                                    onChange={(e) => handleDuplicateSelection('email', emailGroup.id, record.id, e.target.value)}
                                  >
                                    <MenuItem value="keep">Keep This Record</MenuItem>
                                    <MenuItem value="merge">Merge Into Primary</MenuItem>
                                    <MenuItem value="delete">Delete This Record</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Customer Name Duplicates */}
          {duplicateResults.customers.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Duplicate Customer Names ({duplicateResults.customers.length})
              </Typography>
              {duplicateResults.customers.map((customerGroup) => (
                <Card key={customerGroup.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Customer: {customerGroup.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Found {customerGroup.duplicates.length} records with this name
                    </Typography>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Address</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customerGroup.duplicates.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.address}</TableCell>
                              <TableCell>{record.phone}</TableCell>
                              <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                              <TableCell align="center">
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={selectedDuplicates[`customer_${customerGroup.id}_${record.id}`] || 'keep'}
                                    onChange={(e) => handleDuplicateSelection('customer', customerGroup.id, record.id, e.target.value)}
                                  >
                                    <MenuItem value="keep">Keep This Record</MenuItem>
                                    <MenuItem value="merge">Merge Into Primary</MenuItem>
                                    <MenuItem value="delete">Delete This Record</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Cylinder Duplicates */}
          {duplicateResults.cylinders.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Duplicate Cylinders ({duplicateResults.cylinders.length})
              </Typography>
              {duplicateResults.cylinders.map((cylinderGroup) => (
                <Card key={cylinderGroup.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Serial Number: {cylinderGroup.serial}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Found {cylinderGroup.duplicates.length} records with this serial number
                    </Typography>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {cylinderGroup.duplicates.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.type}</TableCell>
                              <TableCell>{record.location}</TableCell>
                              <TableCell>{record.status}</TableCell>
                              <TableCell align="center">
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={selectedDuplicates[`cylinder_${cylinderGroup.id}_${record.id}`] || 'keep'}
                                    onChange={(e) => handleDuplicateSelection('cylinder', cylinderGroup.id, record.id, e.target.value)}
                                  >
                                    <MenuItem value="keep">Keep This Record</MenuItem>
                                    <MenuItem value="merge">Merge Into Primary</MenuItem>
                                    <MenuItem value="delete">Delete This Record</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {duplicateResults.emails.length === 0 && duplicateResults.customers.length === 0 && duplicateResults.cylinders.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="success.main">
                No duplicates found that require manual review!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All duplicates can be automatically resolved.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateReviewDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDuplicateResolution} 
            variant="contained" 
            disabled={loading || (duplicateResults.emails.length === 0 && duplicateResults.customers.length === 0 && duplicateResults.cylinders.length === 0)}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon />}
          >
            {loading ? 'Applying Changes...' : 'Apply Selected Actions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 