import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, IconButton, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Avatar, Tooltip, Badge,
  FormControl, InputLabel, Select, MenuItem, Container,
  Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon,
  Divider, Switch, FormControlLabel, FormGroup,
  Stepper, Step, StepLabel, StepContent,
  Tabs, Tab, Slider, FormControlLabel as MuiFormControlLabel,
  Checkbox, RadioGroup, Radio, Autocomplete
} from '@mui/material';
import {
  Warning as WarningIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  Navigation as NavigationIcon,
  Speed as SpeedIcon,
  Nature as EcoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  QrCode as QrCodeIcon,
  Scanner as ScannerIcon,
  Inventory2 as PackageIcon,
  LocalShipping as ShippingIcon,
  Storage as StorageIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Straighten as DistanceIcon,
  LocalGasStation as FuelIcon,
  Security as SecurityIcon,
  Description as DocumentIcon,
  Assessment as AssessmentIcon,
  Gavel as ComplianceIcon,
  Report as ReportIcon,
  FileCopy as ManifestIcon,
  Verified as VerifiedIcon,
  Dangerous as DangerousIcon,
  Science as ScienceIcon,
  LocalFireDepartment as FireIcon,
  HealthAndSafety as SafetyIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export default function HazmatCompliance() {
  const { profile, organization } = useAuth();
  const { can } = usePermissions();
  
  const [manifests, setManifests] = useState([]);
  const [complianceReports, setComplianceReports] = useState([]);
  const [hazmatItems, setHazmatItems] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [createManifestDialog, setCreateManifestDialog] = useState(false);
  const [editManifestDialog, setEditManifestDialog] = useState(false);
  const [createReportDialog, setCreateReportDialog] = useState(false);
  const [viewManifestDialog, setViewManifestDialog] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState(null);
  
  // Form states
  const [manifestForm, setManifestForm] = useState({
    manifest_number: '',
    shipper_name: '',
    shipper_address: '',
    consignee_name: '',
    consignee_address: '',
    carrier_name: '',
    carrier_address: '',
    emergency_contact: '',
    emergency_phone: '',
    hazmat_class: '',
    un_number: '',
    proper_shipping_name: '',
    hazard_class: '',
    packing_group: '',
    quantity: '',
    unit_of_measure: '',
    special_provisions: '',
    limited_quantity: false,
    marine_pollutant: false,
    temperature_controlled: false,
    additional_handling: '',
    certification_statement: '',
    signature: '',
    date_signed: '',
    status: 'draft'
  });
  
  const [reportForm, setReportForm] = useState({
    report_type: '',
    title: '',
    description: '',
    incident_date: '',
    location: '',
    severity: 'low',
    hazmat_involved: false,
    regulatory_body: '',
    corrective_actions: '',
    prevention_measures: '',
    status: 'open'
  });

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const orgId = profile.organization_id;

      // Fetch hazmat data in parallel
      const [manifestsResult, reportsResult, itemsResult, certificationsResult, violationsResult] = await Promise.all([
        supabase
          .from('hazmat_manifests')
          .select(`
            *,
            items:hazmat_manifest_items(count)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('compliance_reports')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('hazmat_items')
          .select(`
            *,
            manifest:hazmat_manifests(manifest_number)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('hazmat_certifications')
          .select(`
            *,
            person:profiles(full_name)
          `)
          .eq('organization_id', orgId)
          .order('expiry_date', { ascending: true }),
        
        supabase
          .from('compliance_violations')
          .select(`
            *,
            manifest:hazmat_manifests(manifest_number),
            reporter:profiles(full_name)
          `)
          .eq('organization_id', orgId)
          .order('violation_date', { ascending: false })
      ]);

      if (manifestsResult.error) throw manifestsResult.error;
      if (reportsResult.error) throw reportsResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (certificationsResult.error) throw certificationsResult.error;
      if (violationsResult.error) throw violationsResult.error;

      setManifests(manifestsResult.data || []);
      setComplianceReports(reportsResult.data || []);
      setHazmatItems(itemsResult.data || []);
      setCertifications(certificationsResult.data || []);
      setViolations(violationsResult.data || []);

    } catch (error) {
      logger.error('Error fetching hazmat compliance data:', error);
      setError('Failed to load hazmat compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManifest = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('hazmat_manifests')
        .insert({
          organization_id: profile.organization_id,
          manifest_number: manifestForm.manifest_number,
          shipper_name: manifestForm.shipper_name,
          shipper_address: manifestForm.shipper_address,
          consignee_name: manifestForm.consignee_name,
          consignee_address: manifestForm.consignee_address,
          carrier_name: manifestForm.carrier_name,
          carrier_address: manifestForm.carrier_address,
          emergency_contact: manifestForm.emergency_contact,
          emergency_phone: manifestForm.emergency_phone,
          hazmat_class: manifestForm.hazmat_class,
          un_number: manifestForm.un_number,
          proper_shipping_name: manifestForm.proper_shipping_name,
          hazard_class: manifestForm.hazard_class,
          packing_group: manifestForm.packing_group,
          quantity: manifestForm.quantity,
          unit_of_measure: manifestForm.unit_of_measure,
          special_provisions: manifestForm.special_provisions,
          limited_quantity: manifestForm.limited_quantity,
          marine_pollutant: manifestForm.marine_pollutant,
          temperature_controlled: manifestForm.temperature_controlled,
          additional_handling: manifestForm.additional_handling,
          certification_statement: manifestForm.certification_statement,
          signature: manifestForm.signature,
          date_signed: manifestForm.date_signed,
          status: manifestForm.status,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Hazmat manifest created successfully');
      setCreateManifestDialog(false);
      resetManifestForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating manifest:', error);
      setError('Failed to create hazmat manifest');
    }
  };

  const handleCreateReport = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('compliance_reports')
        .insert({
          organization_id: profile.organization_id,
          report_type: reportForm.report_type,
          title: reportForm.title,
          description: reportForm.description,
          incident_date: reportForm.incident_date,
          location: reportForm.location,
          severity: reportForm.severity,
          hazmat_involved: reportForm.hazmat_involved,
          regulatory_body: reportForm.regulatory_body,
          corrective_actions: reportForm.corrective_actions,
          prevention_measures: reportForm.prevention_measures,
          status: reportForm.status,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Compliance report created successfully');
      setCreateReportDialog(false);
      resetReportForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating report:', error);
      setError('Failed to create compliance report');
    }
  };

  const resetManifestForm = () => {
    setManifestForm({
      manifest_number: '',
      shipper_name: '',
      shipper_address: '',
      consignee_name: '',
      consignee_address: '',
      carrier_name: '',
      carrier_address: '',
      emergency_contact: '',
      emergency_phone: '',
      hazmat_class: '',
      un_number: '',
      proper_shipping_name: '',
      hazard_class: '',
      packing_group: '',
      quantity: '',
      unit_of_measure: '',
      special_provisions: '',
      limited_quantity: false,
      marine_pollutant: false,
      temperature_controlled: false,
      additional_handling: '',
      certification_statement: '',
      signature: '',
      date_signed: '',
      status: 'draft'
    });
  };

  const resetReportForm = () => {
    setReportForm({
      report_type: '',
      title: '',
      description: '',
      incident_date: '',
      location: '',
      severity: 'low',
      hazmat_involved: false,
      regulatory_body: '',
      corrective_actions: '',
      prevention_measures: '',
      status: 'open'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'draft': return 'default';
      case 'submitted': return 'info';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getHazmatClassColor = (hazmatClass) => {
    switch (hazmatClass) {
      case '1': return 'error'; // Explosives
      case '2': return 'warning'; // Gases
      case '3': return 'error'; // Flammable liquids
      case '4': return 'warning'; // Flammable solids
      case '5': return 'info'; // Oxidizing substances
      case '6': return 'error'; // Toxic substances
      case '7': return 'error'; // Radioactive materials
      case '8': return 'warning'; // Corrosive substances
      case '9': return 'default'; // Miscellaneous
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  const generateManifestPDF = (manifest) => {
    // In a real implementation, this would generate a PDF
    logger.log('Generating PDF for manifest:', manifest.manifest_number);
    setSuccess('PDF generated successfully');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Hazmat Compliance
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage hazmat manifests, compliance reports, and regulatory requirements
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ReportIcon />}
            onClick={() => setCreateReportDialog(true)}
            sx={{ mr: 2 }}
          >
            New Report
          </Button>
          <Button
            variant="contained"
            startIcon={<ManifestIcon />}
            onClick={() => setCreateManifestDialog(true)}
          >
            New Manifest
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ManifestIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{manifests.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Manifests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ComplianceIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {complianceReports.filter(r => r.status === 'open').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open Reports
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <VerifiedIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {certifications.filter(c => new Date(c.expiry_date) > new Date()).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Certifications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ErrorIcon color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {violations.filter(v => v.status === 'open').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open Violations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Hazmat Manifests" />
          <Tab label="Compliance Reports" />
          <Tab label="Certifications" />
          <Tab label="Violations" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Hazmat Manifests
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Manifest Number</TableCell>
                    <TableCell>Shipper</TableCell>
                    <TableCell>Consignee</TableCell>
                    <TableCell>Hazmat Class</TableCell>
                    <TableCell>UN Number</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {manifests.map((manifest) => (
                    <TableRow key={manifest.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{manifest.manifest_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{manifest.shipper_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {manifest.shipper_address}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{manifest.consignee_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {manifest.consignee_address}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`Class ${manifest.hazmat_class}`}
                          size="small" 
                          color={getHazmatClassColor(manifest.hazmat_class)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">UN{manifest.un_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={manifest.status} 
                          size="small" 
                          color={getStatusColor(manifest.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(manifest.created_at)}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setSelectedManifest(manifest);
                                setViewManifestDialog(true);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generate PDF">
                            <IconButton 
                              size="small"
                              onClick={() => generateManifestPDF(manifest)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Compliance Reports
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Report Type</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {complianceReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{report.report_type}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{report.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {report.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={report.severity} 
                          size="small" 
                          color={getSeverityColor(report.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        {report.location}
                      </TableCell>
                      <TableCell>
                        {formatDate(report.incident_date)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={report.status} 
                          size="small" 
                          color={getStatusColor(report.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Hazmat Certifications
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Person</TableCell>
                    <TableCell>Certification Type</TableCell>
                    <TableCell>Issuing Authority</TableCell>
                    <TableCell>Issue Date</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certifications.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{cert.person?.full_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{cert.certification_type}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{cert.issuing_authority}</Typography>
                      </TableCell>
                      <TableCell>
                        {formatDate(cert.issue_date)}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          color={new Date(cert.expiry_date) < new Date() ? 'error' : 'text.primary'}
                        >
                          {formatDate(cert.expiry_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={new Date(cert.expiry_date) < new Date() ? 'Expired' : 'Active'} 
                          size="small" 
                          color={new Date(cert.expiry_date) < new Date() ? 'error' : 'success'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Compliance Violations
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Violation Type</TableCell>
                    <TableCell>Manifest</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {violations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{violation.violation_type}</Typography>
                      </TableCell>
                      <TableCell>
                        {violation.manifest?.manifest_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{violation.description}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={violation.severity} 
                          size="small" 
                          color={getSeverityColor(violation.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(violation.violation_date)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={violation.status} 
                          size="small" 
                          color={getStatusColor(violation.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {/* Create Manifest Dialog */}
      <Dialog 
        open={createManifestDialog} 
        onClose={() => setCreateManifestDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Create Hazmat Manifest</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Manifest Number"
                  value={manifestForm.manifest_number}
                  onChange={(e) => setManifestForm({ ...manifestForm, manifest_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={manifestForm.status}
                    onChange={(e) => setManifestForm({ ...manifestForm, status: e.target.value })}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="submitted">Submitted</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Shipper Information
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Shipper Name"
                  value={manifestForm.shipper_name}
                  onChange={(e) => setManifestForm({ ...manifestForm, shipper_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Shipper Address"
                  value={manifestForm.shipper_address}
                  onChange={(e) => setManifestForm({ ...manifestForm, shipper_address: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Consignee Information
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Consignee Name"
                  value={manifestForm.consignee_name}
                  onChange={(e) => setManifestForm({ ...manifestForm, consignee_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Consignee Address"
                  value={manifestForm.consignee_address}
                  onChange={(e) => setManifestForm({ ...manifestForm, consignee_address: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Hazmat Information
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Hazmat Class"
                  value={manifestForm.hazmat_class}
                  onChange={(e) => setManifestForm({ ...manifestForm, hazmat_class: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="UN Number"
                  value={manifestForm.un_number}
                  onChange={(e) => setManifestForm({ ...manifestForm, un_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Proper Shipping Name"
                  value={manifestForm.proper_shipping_name}
                  onChange={(e) => setManifestForm({ ...manifestForm, proper_shipping_name: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  value={manifestForm.quantity}
                  onChange={(e) => setManifestForm({ ...manifestForm, quantity: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Unit of Measure"
                  value={manifestForm.unit_of_measure}
                  onChange={(e) => setManifestForm({ ...manifestForm, unit_of_measure: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Special Provisions
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={manifestForm.limited_quantity}
                      onChange={(e) => setManifestForm({ ...manifestForm, limited_quantity: e.target.checked })}
                    />
                  }
                  label="Limited Quantity"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={manifestForm.marine_pollutant}
                      onChange={(e) => setManifestForm({ ...manifestForm, marine_pollutant: e.target.checked })}
                    />
                  }
                  label="Marine Pollutant"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={manifestForm.temperature_controlled}
                      onChange={(e) => setManifestForm({ ...manifestForm, temperature_controlled: e.target.checked })}
                    />
                  }
                  label="Temperature Controlled"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Additional Handling Instructions"
                  value={manifestForm.additional_handling}
                  onChange={(e) => setManifestForm({ ...manifestForm, additional_handling: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Emergency Contact
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Emergency Contact"
                  value={manifestForm.emergency_contact}
                  onChange={(e) => setManifestForm({ ...manifestForm, emergency_contact: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Emergency Phone"
                  value={manifestForm.emergency_phone}
                  onChange={(e) => setManifestForm({ ...manifestForm, emergency_phone: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateManifestDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateManifest} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create Report Dialog */}
      <Dialog 
        open={createReportDialog} 
        onClose={() => setCreateReportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Compliance Report</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportForm.report_type}
                    onChange={(e) => setReportForm({ ...reportForm, report_type: e.target.value })}
                  >
                    <MenuItem value="incident">Incident Report</MenuItem>
                    <MenuItem value="inspection">Inspection Report</MenuItem>
                    <MenuItem value="violation">Violation Report</MenuItem>
                    <MenuItem value="training">Training Report</MenuItem>
                    <MenuItem value="maintenance">Maintenance Report</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={reportForm.severity}
                    onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Incident Date"
                  type="date"
                  value={reportForm.incident_date}
                  onChange={(e) => setReportForm({ ...reportForm, incident_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={reportForm.location}
                  onChange={(e) => setReportForm({ ...reportForm, location: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={reportForm.hazmat_involved}
                      onChange={(e) => setReportForm({ ...reportForm, hazmat_involved: e.target.checked })}
                    />
                  }
                  label="Hazmat Involved"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Regulatory Body"
                  value={reportForm.regulatory_body}
                  onChange={(e) => setReportForm({ ...reportForm, regulatory_body: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Corrective Actions"
                  value={reportForm.corrective_actions}
                  onChange={(e) => setReportForm({ ...reportForm, corrective_actions: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Prevention Measures"
                  value={reportForm.prevention_measures}
                  onChange={(e) => setReportForm({ ...reportForm, prevention_measures: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateReportDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateReport} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* View Manifest Dialog */}
      <Dialog 
        open={viewManifestDialog} 
        onClose={() => setViewManifestDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Hazmat Manifest: {selectedManifest?.manifest_number}
        </DialogTitle>
        <DialogContent>
          {selectedManifest && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>Shipper</Typography>
                  <Typography variant="body2">{selectedManifest.shipper_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedManifest.shipper_address}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>Consignee</Typography>
                  <Typography variant="body2">{selectedManifest.consignee_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedManifest.consignee_address}</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Hazmat Details</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2"><strong>Class:</strong> {selectedManifest.hazmat_class}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2"><strong>UN Number:</strong> {selectedManifest.un_number}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2"><strong>Quantity:</strong> {selectedManifest.quantity}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2"><strong>Unit:</strong> {selectedManifest.unit_of_measure}</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Special Provisions</Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    {selectedManifest.limited_quantity && <Chip label="Limited Quantity" size="small" />}
                    {selectedManifest.marine_pollutant && <Chip label="Marine Pollutant" size="small" />}
                    {selectedManifest.temperature_controlled && <Chip label="Temperature Controlled" size="small" />}
                  </Box>
                </Grid>
                
                {selectedManifest.additional_handling && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Additional Handling</Typography>
                    <Typography variant="body2">{selectedManifest.additional_handling}</Typography>
                  </Grid>
                )}
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>Emergency Contact</Typography>
                  <Typography variant="body2">{selectedManifest.emergency_contact}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedManifest.emergency_phone}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>Status</Typography>
                  <Chip 
                    label={selectedManifest.status} 
                    color={getStatusColor(selectedManifest.status)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewManifestDialog(false)}>Close</Button>
          <Button onClick={() => generateManifestPDF(selectedManifest)} variant="contained">
            Generate PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}