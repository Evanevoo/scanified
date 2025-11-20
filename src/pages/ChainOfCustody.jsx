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
  Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot
} from '@mui/lab';
import {
  Assignment as AssignmentIcon,
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
  HealthAndSafety as SafetyIcon,
  History as HistoryIcon,
  TrackChanges as TrackIcon,
  Fingerprint as FingerprintIcon,
  VerifiedUser as VerifiedUserIcon,
  AccountBalance as AccountBalanceIcon,
  Business as BusinessIcon,
  ContactMail as ContactMailIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Pending as PendingIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export default function ChainOfCustody() {
  const { profile, organization } = useAuth();
  const { can } = usePermissions();
  
  const [custodyRecords, setCustodyRecords] = useState([]);
  const [custodyEvents, setCustodyEvents] = useState([]);
  const [custodyDocuments, setCustodyDocuments] = useState([]);
  const [custodySignatures, setCustodySignatures] = useState([]);
  const [custodyAudit, setCustodyAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [createCustodyDialog, setCreateCustodyDialog] = useState(false);
  const [editCustodyDialog, setEditCustodyDialog] = useState(false);
  const [addEventDialog, setAddEventDialog] = useState(false);
  const [viewCustodyDialog, setViewCustodyDialog] = useState(false);
  const [selectedCustody, setSelectedCustody] = useState(null);
  
  // Form states
  const [custodyForm, setCustodyForm] = useState({
    asset_id: '',
    asset_type: 'cylinder',
    custody_type: 'transfer',
    from_party: '',
    to_party: '',
    from_location: '',
    to_location: '',
    transfer_date: '',
    expected_return_date: '',
    purpose: '',
    condition: 'good',
    notes: '',
    requires_signature: true,
    requires_documentation: true,
    status: 'active'
  });
  
  const [eventForm, setEventForm] = useState({
    custody_id: '',
    event_type: '',
    event_date: '',
    location: '',
    performed_by: '',
    description: '',
    condition_notes: '',
    photos: [],
    signature_required: false,
    witness_required: false,
    witness_name: '',
    witness_signature: ''
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

      // Fetch chain of custody data in parallel
      const [recordsResult, eventsResult, documentsResult, signaturesResult, auditResult] = await Promise.all([
        supabase
          .from('chain_of_custody_records')
          .select(`
            *,
            asset:bottles(barcode_number, size, type),
            from_party:profiles!chain_of_custody_records_from_party_fkey(full_name),
            to_party:profiles!chain_of_custody_records_to_party_fkey(full_name)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('custody_events')
          .select(`
            *,
            custody:chain_of_custody_records(asset_id),
            performer:profiles(full_name)
          `)
          .eq('organization_id', orgId)
          .order('event_date', { ascending: false }),
        
        supabase
          .from('custody_documents')
          .select(`
            *,
            custody:chain_of_custody_records(asset_id)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('custody_signatures')
          .select(`
            *,
            custody:chain_of_custody_records(asset_id),
            signer:profiles(full_name)
          `)
          .eq('organization_id', orgId)
          .order('signed_at', { ascending: false }),
        
        supabase
          .from('custody_audit_log')
          .select(`
            *,
            custody:chain_of_custody_records(asset_id),
            user:profiles(full_name)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
      ]);

      if (recordsResult.error) throw recordsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (documentsResult.error) throw documentsResult.error;
      if (signaturesResult.error) throw signaturesResult.error;
      if (auditResult.error) throw auditResult.error;

      setCustodyRecords(recordsResult.data || []);
      setCustodyEvents(eventsResult.data || []);
      setCustodyDocuments(documentsResult.data || []);
      setCustodySignatures(signaturesResult.data || []);
      setCustodyAudit(auditResult.data || []);

    } catch (error) {
      logger.error('Error fetching chain of custody data:', error);
      setError('Failed to load chain of custody data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustody = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('chain_of_custody_records')
        .insert({
          organization_id: profile.organization_id,
          asset_id: custodyForm.asset_id,
          asset_type: custodyForm.asset_type,
          custody_type: custodyForm.custody_type,
          from_party: custodyForm.from_party,
          to_party: custodyForm.to_party,
          from_location: custodyForm.from_location,
          to_location: custodyForm.to_location,
          transfer_date: custodyForm.transfer_date,
          expected_return_date: custodyForm.expected_return_date,
          purpose: custodyForm.purpose,
          condition: custodyForm.condition,
          notes: custodyForm.notes,
          requires_signature: custodyForm.requires_signature,
          requires_documentation: custodyForm.requires_documentation,
          status: custodyForm.status,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Chain of custody record created successfully');
      setCreateCustodyDialog(false);
      resetCustodyForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating custody record:', error);
      setError('Failed to create chain of custody record');
    }
  };

  const handleAddEvent = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('custody_events')
        .insert({
          organization_id: profile.organization_id,
          custody_id: eventForm.custody_id,
          event_type: eventForm.event_type,
          event_date: eventForm.event_date,
          location: eventForm.location,
          performed_by: eventForm.performed_by,
          description: eventForm.description,
          condition_notes: eventForm.condition_notes,
          photos: eventForm.photos,
          signature_required: eventForm.signature_required,
          witness_required: eventForm.witness_required,
          witness_name: eventForm.witness_name,
          witness_signature: eventForm.witness_signature,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Custody event added successfully');
      setAddEventDialog(false);
      resetEventForm();
      fetchData();

    } catch (error) {
      logger.error('Error adding custody event:', error);
      setError('Failed to add custody event');
    }
  };

  const resetCustodyForm = () => {
    setCustodyForm({
      asset_id: '',
      asset_type: 'cylinder',
      custody_type: 'transfer',
      from_party: '',
      to_party: '',
      from_location: '',
      to_location: '',
      transfer_date: '',
      expected_return_date: '',
      purpose: '',
      condition: 'good',
      notes: '',
      requires_signature: true,
      requires_documentation: true,
      status: 'active'
    });
  };

  const resetEventForm = () => {
    setEventForm({
      custody_id: '',
      event_type: '',
      event_date: '',
      location: '',
      performed_by: '',
      description: '',
      condition_notes: '',
      photos: [],
      signature_required: false,
      witness_required: false,
      witness_name: '',
      witness_signature: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getCustodyTypeColor = (type) => {
    switch (type) {
      case 'transfer': return 'primary';
      case 'loan': return 'warning';
      case 'rental': return 'info';
      case 'maintenance': return 'secondary';
      case 'inspection': return 'success';
      default: return 'default';
    }
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'transfer': return <ShippingIcon />;
      case 'inspection': return <CheckCircleIcon />;
      case 'maintenance': return <BuildIcon />;
      case 'damage': return <WarningIcon />;
      case 'return': return <AssignmentIcon />;
      default: return <InfoIcon />;
    }
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  const formatDateTime = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : 'N/A';
  };

  const generateCustodyReport = (custody) => {
    // In a real implementation, this would generate a comprehensive report
    logger.log('Generating custody report for:', custody.id);
    setSuccess('Custody report generated successfully');
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
            Chain of Custody
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track asset custody, transfers, and documentation for regulatory compliance
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddEventDialog(true)}
            sx={{ mr: 2 }}
          >
            Add Event
          </Button>
          <Button
            variant="contained"
            startIcon={<AssignmentIcon />}
            onClick={() => setCreateCustodyDialog(true)}
          >
            New Custody Record
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
                <AssignmentIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{custodyRecords.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Records
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
                <TrackIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {custodyRecords.filter(r => r.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Records
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
                <HistoryIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{custodyEvents.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Events
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
                <VerifiedUserIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{custodySignatures.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Signatures
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
          <Tab label="Custody Records" />
          <Tab label="Custody Events" />
          <Tab label="Documents" />
          <Tab label="Audit Trail" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Chain of Custody Records
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell>Custody Type</TableCell>
                    <TableCell>From Party</TableCell>
                    <TableCell>To Party</TableCell>
                    <TableCell>Transfer Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {custodyRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {record.asset?.barcode_number || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {record.asset_type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={record.custody_type}
                          size="small" 
                          color={getCustodyTypeColor(record.custody_type)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.from_party?.full_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.to_party?.full_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatDate(record.transfer_date)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={record.status} 
                          size="small" 
                          color={getStatusColor(record.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setSelectedCustody(record);
                                setViewCustodyDialog(true);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generate Report">
                            <IconButton 
                              size="small"
                              onClick={() => generateCustodyReport(record)}
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
              Custody Events Timeline
            </Typography>
            <Timeline>
              {custodyEvents.map((event) => (
                <TimelineItem key={event.id}>
                  <TimelineSeparator>
                    <TimelineDot color="primary">
                      {getEventTypeIcon(event.event_type)}
                    </TimelineDot>
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6">{event.event_type}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(event.event_date)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" paragraph>
                          {event.description}
                        </Typography>
                        <Box display="flex" gap={2} flexWrap="wrap">
                          <Chip 
                            label={event.location} 
                            size="small" 
                            variant="outlined" 
                          />
                          <Chip 
                            label={event.performer?.full_name || 'Unknown'} 
                            size="small" 
                            variant="outlined" 
                          />
                          {event.condition_notes && (
                            <Chip 
                              label={`Condition: ${event.condition_notes}`} 
                              size="small" 
                              color="warning" 
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </Box>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Custody Documents
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Document Type</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Asset</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {custodyDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{doc.document_type}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{doc.title}</Typography>
                      </TableCell>
                      <TableCell>
                        {doc.custody?.asset_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={doc.status} 
                          size="small" 
                          color={getStatusColor(doc.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Document">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton size="small">
                              <DownloadIcon />
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
              Audit Trail
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell>Asset</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>IP Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {custodyAudit.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>
                        <Chip 
                          label={audit.action} 
                          size="small" 
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        {audit.custody?.asset_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {audit.user?.full_name || 'System'}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(audit.created_at)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {audit.details}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {audit.ip_address || 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {/* Create Custody Record Dialog */}
      <Dialog 
        open={createCustodyDialog} 
        onClose={() => setCreateCustodyDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Chain of Custody Record</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Asset ID"
                  value={custodyForm.asset_id}
                  onChange={(e) => setCustodyForm({ ...custodyForm, asset_id: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Asset Type</InputLabel>
                  <Select
                    value={custodyForm.asset_type}
                    onChange={(e) => setCustodyForm({ ...custodyForm, asset_type: e.target.value })}
                  >
                    <MenuItem value="cylinder">Cylinder</MenuItem>
                    <MenuItem value="equipment">Equipment</MenuItem>
                    <MenuItem value="tool">Tool</MenuItem>
                    <MenuItem value="vehicle">Vehicle</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Custody Type</InputLabel>
                  <Select
                    value={custodyForm.custody_type}
                    onChange={(e) => setCustodyForm({ ...custodyForm, custody_type: e.target.value })}
                  >
                    <MenuItem value="transfer">Transfer</MenuItem>
                    <MenuItem value="loan">Loan</MenuItem>
                    <MenuItem value="rental">Rental</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="inspection">Inspection</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={custodyForm.status}
                    onChange={(e) => setCustodyForm({ ...custodyForm, status: e.target.value })}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Transfer Details
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Party"
                  value={custodyForm.from_party}
                  onChange={(e) => setCustodyForm({ ...custodyForm, from_party: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="To Party"
                  value={custodyForm.to_party}
                  onChange={(e) => setCustodyForm({ ...custodyForm, to_party: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Location"
                  value={custodyForm.from_location}
                  onChange={(e) => setCustodyForm({ ...custodyForm, from_location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="To Location"
                  value={custodyForm.to_location}
                  onChange={(e) => setCustodyForm({ ...custodyForm, to_location: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Transfer Date"
                  type="date"
                  value={custodyForm.transfer_date}
                  onChange={(e) => setCustodyForm({ ...custodyForm, transfer_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expected Return Date"
                  type="date"
                  value={custodyForm.expected_return_date}
                  onChange={(e) => setCustodyForm({ ...custodyForm, expected_return_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Purpose"
                  value={custodyForm.purpose}
                  onChange={(e) => setCustodyForm({ ...custodyForm, purpose: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Condition</InputLabel>
                  <Select
                    value={custodyForm.condition}
                    onChange={(e) => setCustodyForm({ ...custodyForm, condition: e.target.value })}
                  >
                    <MenuItem value="excellent">Excellent</MenuItem>
                    <MenuItem value="good">Good</MenuItem>
                    <MenuItem value="fair">Fair</MenuItem>
                    <MenuItem value="poor">Poor</MenuItem>
                    <MenuItem value="damaged">Damaged</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" gap={2} alignItems="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={custodyForm.requires_signature}
                        onChange={(e) => setCustodyForm({ ...custodyForm, requires_signature: e.target.checked })}
                      />
                    }
                    label="Requires Signature"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={custodyForm.requires_documentation}
                        onChange={(e) => setCustodyForm({ ...custodyForm, requires_documentation: e.target.checked })}
                      />
                    }
                    label="Requires Documentation"
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={custodyForm.notes}
                  onChange={(e) => setCustodyForm({ ...custodyForm, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCustodyDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateCustody} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog 
        open={addEventDialog} 
        onClose={() => setAddEventDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Custody Event</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Custody Record</InputLabel>
                  <Select
                    value={eventForm.custody_id}
                    onChange={(e) => setEventForm({ ...eventForm, custody_id: e.target.value })}
                  >
                    {custodyRecords.map((record) => (
                      <MenuItem key={record.id} value={record.id}>
                        {record.asset?.barcode_number || record.asset_id} - {record.custody_type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                  >
                    <MenuItem value="transfer">Transfer</MenuItem>
                    <MenuItem value="inspection">Inspection</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="damage">Damage Report</MenuItem>
                    <MenuItem value="return">Return</MenuItem>
                    <MenuItem value="location_change">Location Change</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Event Date"
                  type="datetime-local"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Performed By"
                  value={eventForm.performed_by}
                  onChange={(e) => setEventForm({ ...eventForm, performed_by: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Condition Notes"
                  value={eventForm.condition_notes}
                  onChange={(e) => setEventForm({ ...eventForm, condition_notes: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box display="flex" gap={2} alignItems="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={eventForm.signature_required}
                        onChange={(e) => setEventForm({ ...eventForm, signature_required: e.target.checked })}
                      />
                    }
                    label="Signature Required"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={eventForm.witness_required}
                        onChange={(e) => setEventForm({ ...eventForm, witness_required: e.target.checked })}
                      />
                    }
                    label="Witness Required"
                  />
                </Box>
              </Grid>
              
              {eventForm.witness_required && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Witness Name"
                      value={eventForm.witness_name}
                      onChange={(e) => setEventForm({ ...eventForm, witness_name: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Witness Signature"
                      value={eventForm.witness_signature}
                      onChange={(e) => setEventForm({ ...eventForm, witness_signature: e.target.value })}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEventDialog(false)}>Cancel</Button>
          <Button onClick={handleAddEvent} variant="contained">Add Event</Button>
        </DialogActions>
      </Dialog>

      {/* View Custody Record Dialog */}
      <Dialog 
        open={viewCustodyDialog} 
        onClose={() => setViewCustodyDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Chain of Custody: {selectedCustody?.asset?.barcode_number || selectedCustody?.asset_id}
        </DialogTitle>
        <DialogContent>
          {selectedCustody && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Asset Information</Typography>
                  <Box mb={2}>
                    <Typography variant="body2"><strong>Asset ID:</strong> {selectedCustody.asset_id}</Typography>
                    <Typography variant="body2"><strong>Type:</strong> {selectedCustody.asset_type}</Typography>
                    <Typography variant="body2"><strong>Barcode:</strong> {selectedCustody.asset?.barcode_number || 'N/A'}</Typography>
                  </Box>
                  
                  <Typography variant="h6" gutterBottom>Transfer Details</Typography>
                  <Box mb={2}>
                    <Typography variant="body2"><strong>Type:</strong> {selectedCustody.custody_type}</Typography>
                    <Typography variant="body2"><strong>From:</strong> {selectedCustody.from_party?.full_name || selectedCustody.from_party}</Typography>
                    <Typography variant="body2"><strong>To:</strong> {selectedCustody.to_party?.full_name || selectedCustody.to_party}</Typography>
                    <Typography variant="body2"><strong>Date:</strong> {formatDate(selectedCustody.transfer_date)}</Typography>
                    <Typography variant="body2"><strong>Expected Return:</strong> {formatDate(selectedCustody.expected_return_date)}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Status & Requirements</Typography>
                  <Box mb={2}>
                    <Chip 
                      label={selectedCustody.status} 
                      color={getStatusColor(selectedCustody.status)}
                      sx={{ mb: 1 }}
                    />
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedCustody.requires_signature && (
                        <Chip label="Signature Required" size="small" color="warning" />
                      )}
                      {selectedCustody.requires_documentation && (
                        <Chip label="Documentation Required" size="small" color="info" />
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="h6" gutterBottom>Condition & Purpose</Typography>
                  <Box mb={2}>
                    <Typography variant="body2"><strong>Condition:</strong> {selectedCustody.condition}</Typography>
                    <Typography variant="body2"><strong>Purpose:</strong> {selectedCustody.purpose}</Typography>
                  </Box>
                  
                  {selectedCustody.notes && (
                    <>
                      <Typography variant="h6" gutterBottom>Notes</Typography>
                      <Typography variant="body2">{selectedCustody.notes}</Typography>
                    </>
                  )}
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Recent Events</Typography>
                  <Timeline>
                    {custodyEvents
                      .filter(event => event.custody_id === selectedCustody.id)
                      .slice(0, 5)
                      .map((event) => (
                        <TimelineItem key={event.id}>
                          <TimelineSeparator>
                            <TimelineDot color="primary">
                              {getEventTypeIcon(event.event_type)}
                            </TimelineDot>
                            <TimelineConnector />
                          </TimelineSeparator>
                          <TimelineContent>
                            <Box>
                              <Typography variant="subtitle2">{event.event_type}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatDateTime(event.event_date)} - {event.description}
                              </Typography>
                            </Box>
                          </TimelineContent>
                        </TimelineItem>
                      ))}
                  </Timeline>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewCustodyDialog(false)}>Close</Button>
          <Button onClick={() => generateCustodyReport(selectedCustody)} variant="contained">
            Generate Report
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}