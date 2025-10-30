import logger from '../utils/logger';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  Divider,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Assignment as AuditIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Assessment as ReportIcon,
  QrCodeScanner as ScanIcon,
  CloudDownload as DownloadIcon,
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  FastForward as FastForwardIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useDebounce, useOptimizedFetch, usePagination } from '../utils/performance';
import { FadeIn, SlideIn, SmoothButton, LoadingOverlay, StatsSkeleton } from '../components/SmoothLoading';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';

const auditTypes = [
  { value: 'full_inventory', label: 'Full Inventory', icon: <InventoryIcon />, color: 'primary' },
  { value: 'location_audit', label: 'Location Audit', icon: <LocationIcon />, color: 'secondary' },
  { value: 'customer_audit', label: 'Customer Audit', icon: <PeopleIcon />, color: 'info' },
  { value: 'cycle_count', label: 'Cycle Count', icon: <RefreshIcon />, color: 'warning' },
  { value: 'compliance_audit', label: 'Compliance Audit', icon: <CheckCircleIcon />, color: 'success' }
];

const auditStatuses = [
  { value: 'planned', label: 'Planned', color: 'info' },
  { value: 'in_progress', label: 'In Progress', color: 'warning' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' }
];

const discrepancyTypes = [
  { value: 'missing', label: 'Missing', color: 'error' },
  { value: 'extra', label: 'Extra', color: 'warning' },
  { value: 'incorrect_location', label: 'Wrong Location', color: 'info' },
  { value: 'damaged', label: 'Damaged', color: 'error' },
  { value: 'incorrect_status', label: 'Wrong Status', color: 'warning' }
];

export default function AuditManagement() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [audits, setAudits] = useState([]);
  const [currentAudit, setCurrentAudit] = useState(null);
  const [auditDialog, setAuditDialog] = useState(false);
  const [scannerDialog, setScannerDialog] = useState(false);
  const [newAudit, setNewAudit] = useState({
    name: '',
    type: 'full_inventory',
    description: '',
    scheduled_date: '',
    locations: [],
    customers: [],
    asset_types: [],
    assigned_users: []
  });
  const [auditProgress, setAuditProgress] = useState({
    total_items: 0,
    scanned_items: 0,
    discrepancies: 0,
    completion_percentage: 0
  });
  const [scannedItems, setScannedItems] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [auditStats, setAuditStats] = useState({
    total_audits: 0,
    active_audits: 0,
    completed_audits: 0,
    total_discrepancies: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState('verify'); // 'verify' or 'add'
  const [expectedItems, setExpectedItems] = useState([]);
  const [quickScanMode, setQuickScanMode] = useState(false);
  const [bulkScanResults, setBulkScanResults] = useState([]);
  const [auditTemplate, setAuditTemplate] = useState(null);
  const [autoResolveDiscrepancies, setAutoResolveDiscrepancies] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch audits
  const { data: auditsData, loading: auditsLoading, refetch: refetchAudits } = useOptimizedFetch(
    useCallback(async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          audit_items(
            id,
            expected_barcode,
            scanned_barcode,
            status,
            discrepancy_type,
            notes
          ),
          audit_users(
            user_id,
            profiles(name, email)
          )
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }, [profile?.organization_id]),
    [profile?.organization_id]
  );

  // Fetch locations and customers for audit setup
  const { data: locations } = useOptimizedFetch(
    useCallback(async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      return data || [];
    }, [profile?.organization_id]),
    [profile?.organization_id]
  );

  const { data: customers } = useOptimizedFetch(
    useCallback(async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, address')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      return data || [];
    }, [profile?.organization_id]),
    [profile?.organization_id]
  );

  // Filter audits
  const filteredAudits = useMemo(() => {
    if (!auditsData) return [];
    
    return auditsData.filter(audit => {
      const matchesSearch = !debouncedSearch || 
        audit.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        audit.description?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
      const matchesType = typeFilter === 'all' || audit.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [auditsData, debouncedSearch, statusFilter, typeFilter]);

  // Calculate audit stats
  useEffect(() => {
    if (auditsData) {
      setAuditStats({
        total_audits: auditsData.length,
        active_audits: auditsData.filter(a => a.status === 'in_progress').length,
        completed_audits: auditsData.filter(a => a.status === 'completed').length,
        total_discrepancies: auditsData.reduce((sum, audit) => 
          sum + (audit.audit_items?.filter(item => item.discrepancy_type).length || 0), 0
        )
      });
    }
  }, [auditsData]);

  const handleCreateAudit = () => {
    setNewAudit({
      name: '',
      type: 'full_inventory',
      description: '',
      scheduled_date: '',
      locations: [],
      customers: [],
      asset_types: [],
      assigned_users: []
    });
    setAuditDialog(true);
  };

  const handleSaveAudit = async () => {
    try {
      const auditData = {
        ...newAudit,
        organization_id: profile.organization_id,
        created_by: profile.id,
        status: 'planned'
      };

      const { data: audit, error } = await supabase
        .from('audits')
        .insert([auditData])
        .select()
        .single();

      if (error) throw error;

      // Generate expected items based on audit type
      await generateExpectedItems(audit);

      setAuditDialog(false);
      refetchAudits();
    } catch (error) {
      logger.error('Error creating audit:', error);
    }
  };

  const generateExpectedItems = async (audit) => {
    try {
      let query = supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', profile.organization_id);

      // Filter based on audit type
      if (audit.type === 'location_audit' && audit.locations?.length > 0) {
        query = query.in('location', audit.locations);
      }

      if (audit.type === 'customer_audit' && audit.customers?.length > 0) {
        query = query.in('assigned_customer', audit.customers);
      }

      const { data: bottles, error } = await query;
      if (error) throw error;

      // Create audit items
      const auditItems = bottles.map(bottle => ({
        audit_id: audit.id,
        expected_barcode: bottle.barcode_number,
        expected_location: bottle.location,
        expected_customer: bottle.assigned_customer,
        expected_status: bottle.status,
        status: 'pending'
      }));

      const { error: itemsError } = await supabase
        .from('audit_items')
        .insert(auditItems);

      if (itemsError) throw itemsError;
    } catch (error) {
      logger.error('Error generating expected items:', error);
    }
  };

  const handleStartAudit = async (auditId) => {
    try {
      const { error } = await supabase
        .from('audits')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', auditId);

      if (error) throw error;
      refetchAudits();
    } catch (error) {
      logger.error('Error starting audit:', error);
    }
  };

  const handleCompleteAudit = async (auditId) => {
    try {
      const { error } = await supabase
        .from('audits')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', auditId);

      if (error) throw error;
      refetchAudits();
    } catch (error) {
      logger.error('Error completing audit:', error);
    }
  };

  const handleScanItem = async (barcode) => {
    if (!currentAudit) return;

    try {
      // Find expected item
      const { data: expectedItem, error: findError } = await supabase
        .from('audit_items')
        .select('*')
        .eq('audit_id', currentAudit.id)
        .eq('expected_barcode', barcode)
        .single();

      let discrepancyType = null;
      let status = 'verified';

      if (findError || !expectedItem) {
        // Item not expected - extra item
        discrepancyType = 'extra';
        status = 'discrepancy';
        
        // Create new audit item for extra item
        const { error: insertError } = await supabase
          .from('audit_items')
          .insert({
            audit_id: currentAudit.id,
            scanned_barcode: barcode,
            discrepancy_type: 'extra',
            status: 'discrepancy',
            notes: 'Item found but not expected in this audit'
          });

        if (insertError) throw insertError;
      } else {
        // Update existing item
        const { error: updateError } = await supabase
          .from('audit_items')
          .update({
            scanned_barcode: barcode,
            scanned_at: new Date().toISOString(),
            status: 'verified'
          })
          .eq('id', expectedItem.id);

        if (updateError) throw updateError;
      }

      // Update local state
      setScannedItems(prev => [...prev, {
        barcode,
        timestamp: new Date(),
        status,
        discrepancyType
      }]);

      // Update progress
      updateAuditProgress(currentAudit.id);

      // Play success/error sound
      if (status === 'verified') {
        playSuccessSound();
      } else {
        playErrorSound();
      }

    } catch (error) {
      logger.error('Error scanning item:', error);
    }
  };

  const updateAuditProgress = async (auditId) => {
    try {
      const { data: items, error } = await supabase
        .from('audit_items')
        .select('status, discrepancy_type')
        .eq('audit_id', auditId);

      if (error) throw error;

      const total = items.length;
      const scanned = items.filter(item => item.status !== 'pending').length;
      const discrepancies = items.filter(item => item.discrepancy_type).length;

      setAuditProgress({
        total_items: total,
        scanned_items: scanned,
        discrepancies,
        completion_percentage: total > 0 ? (scanned / total) * 100 : 0
      });
    } catch (error) {
      logger.error('Error updating progress:', error);
    }
  };

  const playSuccessSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const playErrorSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const exportAuditReport = (audit) => {
    const reportData = [
      ['Audit Report'],
      ['Name:', audit.name],
      ['Type:', audit.type],
      ['Status:', audit.status],
      ['Created:', new Date(audit.created_at).toLocaleDateString()],
      [''],
      ['Item', 'Expected Barcode', 'Scanned Barcode', 'Status', 'Discrepancy', 'Notes'],
      ...audit.audit_items.map(item => [
        item.id,
        item.expected_barcode || '',
        item.scanned_barcode || '',
        item.status,
        item.discrepancy_type || '',
        item.notes || ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Report');
    XLSX.writeFile(wb, `audit-report-${audit.name}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const StatCard = ({ title, value, icon, color = 'primary', onClick }) => (
    <FadeIn>
      <Card 
        sx={{ 
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease-in-out',
          '&:hover': onClick ? {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          } : {}
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" color={`${color}.main`} fontWeight="bold">
                {value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </FadeIn>
  );

  const AuditCard = ({ audit, index }) => (
    <SlideIn delay={index * 100}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {audit.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {audit.description}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip
                label={auditStatuses.find(s => s.value === audit.status)?.label}
                color={auditStatuses.find(s => s.value === audit.status)?.color}
                size="small"
              />
              <Chip
                label={auditTypes.find(t => t.value === audit.type)?.label}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          <Grid container spacing={2} mb={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Total Items</Typography>
              <Typography variant="h6">{audit.audit_items?.length || 0}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Scanned</Typography>
              <Typography variant="h6">
                {audit.audit_items?.filter(item => item.status !== 'pending').length || 0}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Discrepancies</Typography>
              <Typography variant="h6" color="error">
                {audit.audit_items?.filter(item => item.discrepancy_type).length || 0}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Progress</Typography>
              <Typography variant="h6">
                {audit.audit_items?.length > 0 ? 
                  Math.round((audit.audit_items.filter(item => item.status !== 'pending').length / audit.audit_items.length) * 100) :
                  0
                }%
              </Typography>
            </Grid>
          </Grid>

          <LinearProgress
            variant="determinate"
            value={audit.audit_items?.length > 0 ? 
              (audit.audit_items.filter(item => item.status !== 'pending').length / audit.audit_items.length) * 100 :
              0
            }
            sx={{ mb: 2 }}
          />

          <Box display="flex" gap={1} justifyContent="flex-end">
            {audit.status === 'planned' && (
              <SmoothButton
                size="small"
                variant="contained"
                color="primary"
                startIcon={<StartIcon />}
                onClick={() => handleStartAudit(audit.id)}
              >
                Start
              </SmoothButton>
            )}
            {audit.status === 'in_progress' && (
              <>
                <SmoothButton
                  size="small"
                  variant="outlined"
                  startIcon={<ScanIcon />}
                  onClick={() => {
                    setCurrentAudit(audit);
                    setScannerDialog(true);
                  }}
                >
                  Scan
                </SmoothButton>
                <SmoothButton
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  onClick={() => handleCompleteAudit(audit.id)}
                >
                  Complete
                </SmoothButton>
              </>
            )}
            <SmoothButton
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => exportAuditReport(audit)}
            >
              Export
            </SmoothButton>
          </Box>
        </CardContent>
      </Card>
    </SlideIn>
  );

  return (
    <Box p={3}>
      {/* Header */}
      <FadeIn>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Audit Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive inventory auditing and cycle counting
            </Typography>
          </Box>
          <SmoothButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateAudit}
          >
            New Audit
          </SmoothButton>
        </Box>
      </FadeIn>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Audits"
            value={auditStats.total_audits}
            icon={<AuditIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Audits"
            value={auditStats.active_audits}
            icon={<ScheduleIcon />}
            color="warning"
            onClick={() => setStatusFilter('in_progress')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed"
            value={auditStats.completed_audits}
            icon={<CheckCircleIcon />}
            color="success"
            onClick={() => setStatusFilter('completed')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Discrepancies"
            value={auditStats.total_discrepancies}
            icon={<WarningIcon />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <FadeIn delay={200}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search audits..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    {auditStatuses.map(status => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {auditTypes.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Audits List */}
      <FadeIn delay={300}>
        <LoadingOverlay loading={auditsLoading}>
          {auditsLoading ? (
            <StatsSkeleton count={3} />
          ) : (
            <Box>
              {filteredAudits.length === 0 ? (
                <Card>
                  <CardContent>
                    <Box 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center" 
                      justifyContent="center" 
                      py={8}
                    >
                      <AuditIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No audits found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Create your first audit to start tracking inventory
                      </Typography>
                      <SmoothButton
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleCreateAudit}
                        sx={{ mt: 2 }}
                      >
                        Create Audit
                      </SmoothButton>
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                filteredAudits.map((audit, index) => (
                  <AuditCard key={audit.id} audit={audit} index={index} />
                ))
              )}
            </Box>
          )}
        </LoadingOverlay>
      </FadeIn>

      {/* Create Audit Dialog */}
      <Dialog
        open={auditDialog}
        onClose={() => setAuditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Audit</DialogTitle>
        <DialogContent>
          <Box pt={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Audit Name"
                  value={newAudit.name}
                  onChange={(e) => setNewAudit({ ...newAudit, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Audit Type</InputLabel>
                  <Select
                    value={newAudit.type}
                    onChange={(e) => setNewAudit({ ...newAudit, type: e.target.value })}
                    label="Audit Type"
                  >
                    {auditTypes.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {type.icon}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={newAudit.description}
                  onChange={(e) => setNewAudit({ ...newAudit, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Scheduled Date"
                  type="datetime-local"
                  value={newAudit.scheduled_date}
                  onChange={(e) => setNewAudit({ ...newAudit, scheduled_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditDialog(false)}>Cancel</Button>
          <SmoothButton onClick={handleSaveAudit} variant="contained">
            Create Audit
          </SmoothButton>
        </DialogActions>
      </Dialog>

      {/* Scanner Dialog */}
      <Dialog
        open={scannerDialog}
        onClose={() => setScannerDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Audit Scanner - {currentAudit?.name}
        </DialogTitle>
        <DialogContent>
          <Box pt={2}>
            {/* Progress */}
            <Box mb={3}>
              <Typography variant="body2" color="text.secondary">
                Progress: {auditProgress.scanned_items} of {auditProgress.total_items} items
              </Typography>
              <LinearProgress
                variant="determinate"
                value={auditProgress.completion_percentage}
                sx={{ mt: 1 }}
              />
            </Box>

            {/* Scanner Interface */}
            <Box display="flex" gap={2} mb={3}>
              <SmoothButton
                variant={isScanning ? 'contained' : 'outlined'}
                color={isScanning ? 'error' : 'primary'}
                startIcon={isScanning ? <StopIcon /> : <ScanIcon />}
                onClick={() => setIsScanning(!isScanning)}
              >
                {isScanning ? 'Stop Scanner' : 'Start Scanner'}
              </SmoothButton>
              <FormControlLabel
                control={
                  <Switch
                    checked={quickScanMode}
                    onChange={(e) => setQuickScanMode(e.target.checked)}
                  />
                }
                label="Quick Scan Mode"
              />
            </Box>

            {/* Scanner Area */}
            {isScanning && (
              <Box mb={3}>
                <div id="audit-scanner" style={{ width: '100%', height: '300px' }} />
              </Box>
            )}

            {/* Recent Scans */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Recent Scans
              </Typography>
              <List>
                {scannedItems.slice(0, 10).map((item, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {item.status === 'verified' ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="error" />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary={item.barcode}
                      secondary={`${item.status} - ${item.timestamp.toLocaleTimeString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScannerDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 