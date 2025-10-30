import logger from '../utils/logger';
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
  
  // Platform owners are blocked at route level, so this check is no longer needed
  
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState({
    customers: { valid: 0, invalid: 0, issues: [] },
    bottles: { valid: 0, invalid: 0, issues: [] },
    deliveries: { valid: 0, invalid: 0, issues: [] },
    locations: { valid: 0, invalid: 0, issues: [] }
  });
  const [detailedData, setDetailedData] = useState({
    customers: [],
    bottles: [],
    deliveries: [],
    locations: []
  });
  const [editingBottle, setEditingBottle] = useState(null);
  const [editForm, setEditForm] = useState({
    serial_number: '',
    barcode_number: '',
    gas_type: '',
    status: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [bulkCleanupDialog, setBulkCleanupDialog] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    if (profile && organization) {
      loadValidationResults();
    }
  }, [profile, organization]);

  const loadValidationResults = async () => {
    setLoading(true);
    try {
      if (!organization?.id) {
        logger.error('No organization ID available');
        return;
      }

      // Fetch real data from Supabase with error handling
      const [customersResult, bottlesResult, deliveriesResult, locationsResult] = await Promise.allSettled([
        // Customers - Use same query pattern as Customers page
        supabase
          .from('customers')
          .select('*', { count: 'exact' })
          .eq('organization_id', organization.id),
        
        // Bottles
        supabase
          .from('bottles')
          .select('id, serial_number, barcode_number, gas_type, status')
          .eq('organization_id', organization.id),
        
        // Delivery Manifests
        supabase
          .from('delivery_manifests')
          .select('id, manifest_date, status, driver_id')
          .eq('organization_id', organization.id),
        
        // Locations
        supabase
          .from('locations')
          .select('id, name, address, city, state')
          .eq('organization_id', organization.id)
      ]);

      // Extract data from Promise.allSettled results
      const customers = customersResult.status === 'fulfilled' ? (customersResult.value.data || []) : [];
      const bottles = bottlesResult.status === 'fulfilled' ? (bottlesResult.value.data || []) : [];
      const deliveries = deliveriesResult.status === 'fulfilled' ? (deliveriesResult.value.data || []) : [];
      const locations = locationsResult.status === 'fulfilled' ? (locationsResult.value.data || []) : [];
      
      logger.log('Organization Tools - Data loaded:', {
        customers: customers.length,
        bottles: bottles.length,
        deliveries: deliveries.length,
        locations: locations.length,
        organizationId: organization.id,
        organizationName: organization.name
      });
      
      // Enhanced error logging
      if (customersResult.status === 'rejected') {
        logger.error('❌ Customers query failed:', customersResult.reason);
      } else if (customersResult.status === 'fulfilled') {
        logger.log('✅ Customers query successful:', {
          count: customers.length,
          error: customersResult.value.error,
          data: customers.slice(0, 3) // Show first 3 customers
        });
      }
      
      if (bottlesResult.status === 'rejected') logger.error('❌ Bottles query failed:', bottlesResult.reason);
      if (deliveriesResult.status === 'rejected') logger.error('❌ Deliveries query failed:', deliveriesResult.reason);
      if (locationsResult.status === 'rejected') logger.error('❌ Locations query failed:', locationsResult.reason);

      // If no customers found, try a broader query to debug
      if (customers.length === 0) {
        logger.log('🔍 No customers found for organization, running debug queries...');
        
        // Check if customers table has any data at all - Use same pattern as Customers page
        const { data: allCustomers, error: allCustomersError } = await supabase
          .from('customers')
          .select('*', { count: 'exact' })
          .eq('organization_id', organization.id)
          .limit(5);
        
        logger.log('🔍 All customers in database:', {
          count: allCustomers?.length || 0,
          error: allCustomersError,
          sample: allCustomers
        });
        
        // Check if there are customers with different organization IDs
        const { data: customersWithOrgs, error: orgError } = await supabase
          .from('customers')
          .select('organization_id')
          .not('organization_id', 'is', null);
        
        logger.log('🔍 Customers with organization IDs:', {
          count: customersWithOrgs?.length || 0,
          error: orgError,
          uniqueOrgs: [...new Set(customersWithOrgs?.map(c => c.organization_id) || [])]
        });
      }

      // Process customers
      const customerIssues = [];
      let validCustomers = 0;
      
      customers.forEach(customer => {
        let hasIssue = false;
        if (!customer.email) {
          hasIssue = true;
        }
        if (!customer.name) {
          hasIssue = true;
        }
        if (!hasIssue) validCustomers++;
      });

      const missingEmails = customers.filter(c => !c.email).length;
      const missingNames = customers.filter(c => !c.name).length;
      
      if (missingEmails > 0) {
        customerIssues.push({
          type: 'missing_email',
          count: missingEmails,
          description: 'Customers missing email addresses'
        });
      }
      if (missingNames > 0) {
        customerIssues.push({
          type: 'missing_name',
          count: missingNames,
          description: 'Customers missing names'
        });
      }

      // Process bottles with detailed tracking
      const bottleIssues = [];
      let validBottles = 0;
      const bottlesWithIssues = [];
      
      bottles.forEach(bottle => {
        const issues = [];
        // Only check for REQUIRED fields
        if (!bottle.serial_number) {
          issues.push('Missing serial number');
        }
        if (!bottle.barcode_number) {
          issues.push('Missing barcode number');
        }
        // Optional fields - only flag if completely missing (not just empty string)
        if (bottle.gas_type === null || bottle.gas_type === undefined) {
          issues.push('Missing gas type');
        }
        if (!bottle.status) {
          issues.push('Missing status');
        }
        
        if (issues.length === 0) {
          validBottles++;
        } else {
          bottlesWithIssues.push({
            id: bottle.id,
            serial_number: bottle.serial_number || 'N/A',
            barcode_number: bottle.barcode_number || 'N/A',
            gas_type: bottle.gas_type || 'N/A',
            status: bottle.status || 'N/A',
            issues: issues
          });
        }
      });

      const missingSerials = bottles.filter(b => !b.serial_number).length;
      const missingBarcodes = bottles.filter(b => !b.barcode_number).length;
      const missingGasTypes = bottles.filter(b => b.gas_type === null || b.gas_type === undefined).length;
      const missingStatus = bottles.filter(b => !b.status).length;
      
      if (missingSerials > 0) {
        bottleIssues.push({
          type: 'missing_serial',
          count: missingSerials,
          description: 'Bottles missing serial numbers',
          records: bottles.filter(b => !b.serial_number).map(b => ({
            id: b.id,
            serial_number: b.serial_number || 'N/A',
            barcode_number: b.barcode_number || 'N/A'
          }))
        });
      }
      if (missingBarcodes > 0) {
        bottleIssues.push({
          type: 'missing_barcode',
          count: missingBarcodes,
          description: 'Bottles missing barcode numbers',
          records: bottles.filter(b => !b.barcode_number).map(b => ({
            id: b.id,
            serial_number: b.serial_number || 'N/A',
            barcode_number: b.barcode_number || 'N/A'
          }))
        });
      }
      if (missingGasTypes > 0) {
        bottleIssues.push({
          type: 'missing_gas_type',
          count: missingGasTypes,
          description: 'Bottles missing gas type',
          records: bottles.filter(b => !b.gas_type).map(b => ({
            id: b.id,
            serial_number: b.serial_number || 'N/A',
            gas_type: b.gas_type || 'N/A'
          }))
        });
      }
      if (missingStatus > 0) {
        bottleIssues.push({
          type: 'missing_status',
          count: missingStatus,
          description: 'Bottles missing status',
          records: bottles.filter(b => !b.status).map(b => ({
            id: b.id,
            serial_number: b.serial_number || 'N/A',
            status: b.status || 'N/A'
          }))
        });
      }

      // Process delivery manifests
      const deliveryIssues = [];
      let validDeliveries = 0;
      
      deliveries.forEach(delivery => {
        let hasIssue = false;
        if (!delivery.manifest_date) {
          hasIssue = true;
        }
        if (!delivery.status) {
          hasIssue = true;
        }
        if (!hasIssue) validDeliveries++;
      });

      const missingDates = deliveries.filter(d => !d.manifest_date).length;
      const missingDeliveryStatus = deliveries.filter(d => !d.status).length;
      
      if (missingDates > 0) {
        deliveryIssues.push({
          type: 'missing_date',
          count: missingDates,
          description: 'Delivery manifests missing dates'
        });
      }
      if (missingDeliveryStatus > 0) {
        deliveryIssues.push({
          type: 'missing_status',
          count: missingDeliveryStatus,
          description: 'Delivery manifests missing status'
        });
      }

      // Process locations
      const locationIssues = [];
      let validLocations = 0;
      
      locations.forEach(location => {
        let hasIssue = false;
        if (!location.address) {
          hasIssue = true;
        }
        if (!location.name) {
          hasIssue = true;
        }
        if (!hasIssue) validLocations++;
      });

      const missingAddresses = locations.filter(l => !l.address).length;
      const missingLocationNames = locations.filter(l => !l.name).length;
      
      if (missingAddresses > 0) {
        locationIssues.push({
          type: 'missing_address',
          count: missingAddresses,
          description: 'Locations missing addresses'
        });
      }
      if (missingLocationNames > 0) {
        locationIssues.push({
          type: 'missing_name',
          count: missingLocationNames,
          description: 'Locations missing names'
        });
      }

      // Set validation results with real data
      setValidationResults({
        customers: { 
          valid: validCustomers, 
          invalid: customers.length - validCustomers, 
          issues: customerIssues
        },
        bottles: { 
          valid: validBottles, 
          invalid: bottles.length - validBottles, 
          issues: bottleIssues
        },
        deliveries: { 
          valid: validDeliveries, 
          invalid: deliveries.length - validDeliveries, 
          issues: deliveryIssues
        },
        locations: { 
          valid: validLocations, 
          invalid: locations.length - validLocations, 
          issues: locationIssues
        }
      });

      // Store detailed data for display
      setDetailedData({
        customers: customers,
        bottles: bottlesWithIssues,
        deliveries: deliveries,
        locations: locations
      });
    } catch (error) {
      logger.error('Error loading validation results:', error);
      // Set empty results on error
      setValidationResults({
        customers: { valid: 0, invalid: 0, issues: [] },
        bottles: { valid: 0, invalid: 0, issues: [] },
        deliveries: { valid: 0, invalid: 0, issues: [] },
        locations: { valid: 0, invalid: 0, issues: [] }
      });
    } finally {
      setLoading(false);
    }
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

  const handleEditBottle = (bottle) => {
    setEditingBottle(bottle.id);
    setEditForm({
      serial_number: bottle.serial_number || '',
      barcode_number: bottle.barcode_number || '',
      gas_type: bottle.gas_type || '',
      status: bottle.status || 'available'
    });
  };

  const handleSaveBottle = async () => {
    if (!editingBottle) return;
    
    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from('bottles')
        .update({
          serial_number: editForm.serial_number,
          barcode_number: editForm.barcode_number,
          gas_type: editForm.gas_type || null,
          status: editForm.status
        })
        .eq('id', editingBottle);

      if (error) throw error;

      // Refresh the data
      await loadValidationResults();
      setEditingBottle(null);
      
      logger.log('Bottle updated successfully');
    } catch (error) {
      logger.error('Error updating bottle:', error);
      alert('Failed to update bottle: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingBottle(null);
    setEditForm({
      serial_number: '',
      barcode_number: '',
      gas_type: '',
      status: ''
    });
  };

  const handleBulkCleanup = async () => {
    setCleanupLoading(true);
    try {
      // Find bottles with invalid data (N/A values)
      const invalidBottles = detailedData.bottles.filter(bottle => 
        bottle.serial_number === 'N/A' || 
        bottle.barcode_number === 'N/A' ||
        bottle.serial_number === '' ||
        bottle.barcode_number === ''
      );

      if (invalidBottles.length === 0) {
        alert('No invalid bottles found to clean up!');
        return;
      }

      const confirmMessage = `Found ${invalidBottles.length} bottles with invalid data (N/A or empty serial/barcode numbers).\n\nThese bottles will be DELETED permanently.\n\nAre you sure you want to proceed?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }

      // Delete invalid bottles
      const bottleIds = invalidBottles.map(bottle => bottle.id);
      const { error } = await supabase
        .from('bottles')
        .delete()
        .in('id', bottleIds);

      if (error) throw error;

      // Refresh the data
      await loadValidationResults();
      setBulkCleanupDialog(false);
      
      alert(`Successfully deleted ${invalidBottles.length} invalid bottles!`);
      logger.log('Bulk cleanup completed successfully');
    } catch (error) {
      logger.error('Error during bulk cleanup:', error);
      alert('Failed to clean up bottles: ' + error.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const getInvalidBottlesCount = () => {
    return detailedData.bottles.filter(bottle => 
      bottle.serial_number === 'N/A' || 
      bottle.barcode_number === 'N/A' ||
      bottle.serial_number === '' ||
      bottle.barcode_number === ''
    ).length;
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
                {getValidationIcon(validationResults.bottles.valid, validationResults.bottles.invalid)}
                <Typography variant="h6" sx={{ ml: 1 }}>Bottles</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {validationResults.bottles.valid + validationResults.bottles.invalid}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {validationResults.bottles.valid} valid, {validationResults.bottles.invalid} issues
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
                onClick={loadValidationResults}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Validating...' : 'Run Validation'}
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
                fullWidth
              >
                Run Cleanup
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Data Issues */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detailed Data Analysis
          </Typography>
          {Object.entries(validationResults).map(([key, data]) => (
            <Accordion key={key} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', flex: 1 }}>
                    {key} ({data.valid + data.invalid} total)
                  </Typography>
                  <Chip 
                    label={`${data.invalid} issues`} 
                    color={getValidationColor(data.valid, data.invalid)}
                    size="small"
                    sx={{ mr: 2 }}
                  />
                  <Chip 
                    label={`${data.valid} valid`} 
                    color="success"
                    size="small"
                    sx={{ mr: 2 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {data.issues.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom color="error">
                      Issues Found:
                    </Typography>
                    <List dense>
                      {data.issues.map((issue, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <ErrorIcon color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={issue.description}
                            secondary={`${issue.count} record(s) affected`}
                          />
                          <Chip 
                            label={`${issue.count} records`} 
                            color="error" 
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>

                    {/* Show specific bottles with issues */}
                    {key === 'bottles' && detailedData.bottles.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom color="error">
                            Specific Bottles with Issues:
                          </Typography>
                          {getInvalidBottlesCount() > 0 && (
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              startIcon={<DeleteIcon />}
                              onClick={() => setBulkCleanupDialog(true)}
                            >
                              Clean Up {getInvalidBottlesCount()} Invalid Bottles
                            </Button>
                          )}
                        </Box>
                        <TableContainer sx={{ maxHeight: 300 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Serial Number</strong></TableCell>
                                <TableCell><strong>Barcode Number</strong></TableCell>
                                <TableCell><strong>Gas Type</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell><strong>Issues</strong></TableCell>
                                <TableCell><strong>Actions</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {detailedData.bottles.map((bottle) => (
                                <TableRow key={bottle.id}>
                                  <TableCell>
                                    {editingBottle === bottle.id ? (
                                      <TextField
                                        size="small"
                                        value={editForm.serial_number}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, serial_number: e.target.value }))}
                                        placeholder="Enter serial number"
                                        error={!editForm.serial_number}
                                        helperText={!editForm.serial_number ? "Required" : ""}
                                      />
                                    ) : (
                                      <Typography 
                                        color={bottle.serial_number === 'N/A' ? "error.main" : "text.primary"}
                                        sx={{ fontWeight: bottle.serial_number === 'N/A' ? 'bold' : 'normal' }}
                                      >
                                        {bottle.serial_number}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingBottle === bottle.id ? (
                                      <TextField
                                        size="small"
                                        value={editForm.barcode_number}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, barcode_number: e.target.value }))}
                                        placeholder="Enter barcode number"
                                        error={!editForm.barcode_number}
                                        helperText={!editForm.barcode_number ? "Required" : ""}
                                      />
                                    ) : (
                                      <Typography 
                                        color={bottle.barcode_number === 'N/A' ? "error.main" : "text.primary"}
                                        sx={{ fontWeight: bottle.barcode_number === 'N/A' ? 'bold' : 'normal' }}
                                      >
                                        {bottle.barcode_number}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingBottle === bottle.id ? (
                                      <TextField
                                        size="small"
                                        value={editForm.gas_type}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, gas_type: e.target.value }))}
                                        placeholder="Enter gas type (optional)"
                                      />
                                    ) : (
                                      <Typography 
                                        color={bottle.gas_type === 'N/A' ? "error.main" : "text.primary"}
                                        sx={{ fontWeight: bottle.gas_type === 'N/A' ? 'bold' : 'normal' }}
                                      >
                                        {bottle.gas_type}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingBottle === bottle.id ? (
                                      <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <Select
                                          value={editForm.status}
                                          onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                        >
                                          <MenuItem value="available">Available</MenuItem>
                                          <MenuItem value="rented">Rented</MenuItem>
                                          <MenuItem value="maintenance">Maintenance</MenuItem>
                                          <MenuItem value="retired">Retired</MenuItem>
                                        </Select>
                                      </FormControl>
                                    ) : (
                                      <Typography 
                                        color={bottle.status === 'N/A' ? "error.main" : "text.primary"}
                                        sx={{ fontWeight: bottle.status === 'N/A' ? 'bold' : 'normal' }}
                                      >
                                        {bottle.status}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {bottle.issues.map((issue, idx) => (
                                        <Chip 
                                          key={idx}
                                          label={issue} 
                                          color="error" 
                                          size="small"
                                          variant="outlined"
                                        />
                                      ))}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    {editingBottle === bottle.id ? (
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                          size="small"
                                          variant="contained"
                                          color="success"
                                          onClick={handleSaveBottle}
                                          disabled={saveLoading || !editForm.serial_number || !editForm.barcode_number}
                                          startIcon={saveLoading ? <CircularProgress size={16} /> : <CheckIcon />}
                                        >
                                          {saveLoading ? 'Saving...' : 'Save'}
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={handleCancelEdit}
                                          disabled={saveLoading}
                                        >
                                          Cancel
                                        </Button>
                                      </Box>
                                    ) : (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<BuildIcon />}
                                        onClick={() => handleEditBottle(bottle)}
                                      >
                                        Fix
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}

                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Action Required:</strong> These issues should be addressed to ensure data integrity and proper system functionality.
                      </Typography>
                    </Alert>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
                      ✅ No issues found - all data is valid!
                    </Typography>
                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>Great!</strong> All {key} records are properly formatted and contain all required information.
                      </Typography>
                    </Alert>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      {/* Data Summary Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Summary
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Data Type</strong></TableCell>
                  <TableCell align="right"><strong>Total Records</strong></TableCell>
                  <TableCell align="right"><strong>Valid Records</strong></TableCell>
                  <TableCell align="right"><strong>Issues</strong></TableCell>
                  <TableCell align="right"><strong>Health Score</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(validationResults).map(([key, data]) => {
                  const total = data.valid + data.invalid;
                  const healthScore = total > 0 ? Math.round((data.valid / total) * 100) : 100;
                  return (
                    <TableRow key={key}>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{key}</TableCell>
                      <TableCell align="right">{total}</TableCell>
                      <TableCell align="right">
                        <Typography color="success.main">{data.valid}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={data.invalid > 0 ? "error.main" : "success.main"}>
                          {data.invalid}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Typography 
                            variant="body2" 
                            color={healthScore >= 90 ? "success.main" : healthScore >= 70 ? "warning.main" : "error.main"}
                            sx={{ mr: 1 }}
                          >
                            {healthScore}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={healthScore} 
                            sx={{ width: 60, height: 8, borderRadius: 4 }}
                            color={healthScore >= 90 ? "success" : healthScore >= 70 ? "warning" : "error"}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Bulk Cleanup Dialog */}
      <Dialog open={bulkCleanupDialog} onClose={() => setBulkCleanupDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Clean Up Invalid Bottles</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Warning:</strong> This action will permanently delete bottles with invalid data (N/A or empty serial/barcode numbers).
          </Alert>
          
          <Typography variant="body1" gutterBottom>
            The following bottles will be deleted:
          </Typography>
          
          <List dense>
            {detailedData.bottles
              .filter(bottle => 
                bottle.serial_number === 'N/A' || 
                bottle.barcode_number === 'N/A' ||
                bottle.serial_number === '' ||
                bottle.barcode_number === ''
              )
              .map((bottle, index) => (
                <ListItem key={bottle.id}>
                  <ListItemIcon>
                    <ErrorIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Bottle ${index + 1}`}
                    secondary={`Serial: ${bottle.serial_number}, Barcode: ${bottle.barcode_number}, Status: ${bottle.status}`}
                  />
                </ListItem>
              ))}
          </List>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Total bottles to be deleted: <strong>{getInvalidBottlesCount()}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkCleanupDialog(false)} disabled={cleanupLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleBulkCleanup} 
            variant="contained" 
            color="error"
            disabled={cleanupLoading || getInvalidBottlesCount() === 0}
            startIcon={cleanupLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {cleanupLoading ? 'Deleting...' : `Delete ${getInvalidBottlesCount()} Bottles`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}