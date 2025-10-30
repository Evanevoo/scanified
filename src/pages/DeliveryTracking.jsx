import logger from '../utils/logger';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Tabs,
  Tab
} from '@mui/material';
import {
  LocalShipping as DeliveryIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Route as RouteIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useDebounce, useOptimizedFetch, usePagination } from '../utils/performance';
import { FadeIn, SlideIn, TableSkeleton, SmoothButton, LoadingOverlay } from '../components/SmoothLoading';
import { useNavigate } from 'react-router-dom';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';

const deliveryStatuses = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'in_progress', label: 'In Progress', color: 'info' },
  { value: 'delivered', label: 'Delivered', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' }
];

const deliveryTypes = [
  { value: 'pickup', label: 'Pickup', icon: <InventoryIcon /> },
  { value: 'delivery', label: 'Delivery', icon: <DeliveryIcon /> },
  { value: 'exchange', label: 'Exchange', icon: <RouteIcon /> }
];

export default function DeliveryTracking() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('view'); // 'view', 'add', 'edit'
  const [newDelivery, setNewDelivery] = useState({
    customer_id: '',
    customer_name: '',
    delivery_type: 'delivery',
    status: 'pending',
    scheduled_date: '',
    address: '',
    notes: '',
    bottles: []
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Optimized data fetching
  const { data: deliveries, loading: deliveriesLoading, refetch: refetchDeliveries } = useOptimizedFetch(
    useCallback(async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          customers(name, address, phone),
          delivery_items(
            quantity,
            bottles(barcode_number, serial_number, product_code)
          )
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }, [profile?.organization_id]),
    [profile?.organization_id]
  );

  // Filter deliveries based on search and filters
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return [];
    
    return deliveries.filter(delivery => {
      const matchesSearch = !debouncedSearch || 
        delivery.customers?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        delivery.delivery_number?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        delivery.address?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
      const matchesType = typeFilter === 'all' || delivery.delivery_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [deliveries, debouncedSearch, statusFilter, typeFilter]);

  // Pagination
  const { 
    currentPage, 
    totalPages, 
    paginatedData: paginatedDeliveries, 
    goToPage 
  } = usePagination(filteredDeliveries, 20);

  // Delivery stats
  const deliveryStats = useMemo(() => {
    if (!deliveries) return { total: 0, pending: 0, inProgress: 0, delivered: 0, cancelled: 0 };
    
    return {
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      inProgress: deliveries.filter(d => d.status === 'in_progress').length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      cancelled: deliveries.filter(d => d.status === 'cancelled').length
    };
  }, [deliveries]);

  const handleCreateDelivery = () => {
    setNewDelivery({
      customer_id: '',
      customer_name: '',
      delivery_type: 'delivery',
      status: 'pending',
      scheduled_date: '',
      address: '',
      notes: '',
      bottles: []
    });
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleEditDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setNewDelivery({
      ...delivery,
      scheduled_date: delivery.scheduled_date?.split('T')[0] || ''
    });
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleViewDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleSaveDelivery = async () => {
    try {
      const deliveryData = {
        ...newDelivery,
        organization_id: profile.organization_id
      };

      if (dialogMode === 'add') {
        // Generate delivery number
        const deliveryNumber = `DEL-${Date.now()}`;
        deliveryData.delivery_number = deliveryNumber;

        const { error } = await supabase
          .from('deliveries')
          .insert([deliveryData]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deliveries')
          .update(deliveryData)
          .eq('id', selectedDelivery.id);

        if (error) throw error;
      }

      setDialogOpen(false);
      refetchDeliveries();
    } catch (error) {
      logger.error('Error saving delivery:', error);
    }
  };

  const handleStatusChange = async (deliveryId, newStatus) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) throw error;
      refetchDeliveries();
    } catch (error) {
      logger.error('Error updating status:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ScheduleIcon />;
      case 'in_progress': return <StartIcon />;
      case 'delivered': return <CheckCircleIcon />;
      case 'cancelled': return <CancelIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const getStatusColor = (status) => {
    const statusObj = deliveryStatuses.find(s => s.value === status);
    return statusObj?.color || 'default';
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

  const DeliveryTimeline = ({ delivery }) => (
    <Timeline>
      <TimelineItem>
        <TimelineSeparator>
          <TimelineDot color="primary">
            <AddIcon />
          </TimelineDot>
          <TimelineConnector />
        </TimelineSeparator>
        <TimelineContent>
          <Typography variant="h6">Delivery Created</Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(delivery.created_at).toLocaleString()}
          </Typography>
        </TimelineContent>
      </TimelineItem>
      
      {delivery.status !== 'pending' && (
        <TimelineItem>
          <TimelineSeparator>
            <TimelineDot color="info">
              <StartIcon />
            </TimelineDot>
            <TimelineConnector />
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="h6">In Progress</Typography>
            <Typography variant="body2" color="text.secondary">
              Delivery started
            </Typography>
          </TimelineContent>
        </TimelineItem>
      )}
      
      {delivery.status === 'delivered' && (
        <TimelineItem>
          <TimelineSeparator>
            <TimelineDot color="success">
              <CheckCircleIcon />
            </TimelineDot>
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="h6">Delivered</Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(delivery.updated_at).toLocaleString()}
            </Typography>
          </TimelineContent>
        </TimelineItem>
      )}
      
      {delivery.status === 'cancelled' && (
        <TimelineItem>
          <TimelineSeparator>
            <TimelineDot color="error">
              <CancelIcon />
            </TimelineDot>
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="h6">Cancelled</Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(delivery.updated_at).toLocaleString()}
            </Typography>
          </TimelineContent>
        </TimelineItem>
      )}
    </Timeline>
  );

  return (
    <Box p={3}>
      {/* Header */}
      <FadeIn>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Delivery Tracking
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and track all deliveries and pickups
            </Typography>
          </Box>
          <SmoothButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDelivery}
          >
            New Delivery
          </SmoothButton>
        </Box>
      </FadeIn>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Total Deliveries"
            value={deliveryStats.total}
            icon={<DeliveryIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Pending"
            value={deliveryStats.pending}
            icon={<ScheduleIcon />}
            color="warning"
            onClick={() => setStatusFilter('pending')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="In Progress"
            value={deliveryStats.inProgress}
            icon={<StartIcon />}
            color="info"
            onClick={() => setStatusFilter('in_progress')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Delivered"
            value={deliveryStats.delivered}
            icon={<CheckCircleIcon />}
            color="success"
            onClick={() => setStatusFilter('delivered')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Cancelled"
            value={deliveryStats.cancelled}
            icon={<CancelIcon />}
            color="error"
            onClick={() => setStatusFilter('cancelled')}
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
                  placeholder="Search deliveries..."
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
                    {deliveryStatuses.map(status => (
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
                    {deliveryTypes.map(type => (
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

      {/* Deliveries Table */}
      <FadeIn delay={300}>
        <Card>
          <CardContent>
            <LoadingOverlay loading={deliveriesLoading}>
              {deliveriesLoading ? (
                <TableSkeleton rows={10} columns={6} />
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Delivery #</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Scheduled</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedDeliveries.map((delivery, index) => (
                        <SlideIn key={delivery.id} delay={index * 50}>
                          <TableRow hover>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                color="primary" 
                                sx={{ cursor: 'pointer' }}
                                onClick={() => handleViewDelivery(delivery)}
                              >
                                {delivery.delivery_number}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                                  <PersonIcon />
                                </Avatar>
                                <Box>
                                  <Typography variant="body2">
                                    {delivery.customers?.name || delivery.customer_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {delivery.address}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={deliveryTypes.find(t => t.value === delivery.delivery_type)?.label}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(delivery.status)}
                                label={deliveryStatuses.find(s => s.value === delivery.status)?.label}
                                color={getStatusColor(delivery.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {delivery.scheduled_date ? 
                                new Date(delivery.scheduled_date).toLocaleDateString() : 
                                'Not scheduled'
                              }
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {delivery.delivery_items?.length || 0} items
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleViewDelivery(delivery)}
                                >
                                  <SearchIcon />
                                </IconButton>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleEditDelivery(delivery)}
                                >
                                  <EditIcon />
                                </IconButton>
                                {delivery.status === 'pending' && (
                                  <IconButton 
                                    size="small"
                                    color="primary"
                                    onClick={() => handleStatusChange(delivery.id, 'in_progress')}
                                  >
                                    <StartIcon />
                                  </IconButton>
                                )}
                                {delivery.status === 'in_progress' && (
                                  <IconButton 
                                    size="small"
                                    color="success"
                                    onClick={() => handleStatusChange(delivery.id, 'delivered')}
                                  >
                                    <CheckIcon />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        </SlideIn>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </LoadingOverlay>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Delivery Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? 'New Delivery' :
           dialogMode === 'edit' ? 'Edit Delivery' :
           'Delivery Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedDelivery ? (
            <Box>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab label="Details" />
                <Tab label="Timeline" />
                <Tab label="Items" />
              </Tabs>
              {activeTab === 0 && (
                <Box pt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Delivery Number</Typography>
                      <Typography variant="body1" mb={2}>{selectedDelivery.delivery_number}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Customer</Typography>
                      <Typography variant="body1" mb={2}>{selectedDelivery.customers?.name}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Address</Typography>
                      <Typography variant="body1" mb={2}>{selectedDelivery.address}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Notes</Typography>
                      <Typography variant="body1" mb={2}>{selectedDelivery.notes || 'None'}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              {activeTab === 1 && (
                <Box pt={2}>
                  <DeliveryTimeline delivery={selectedDelivery} />
                </Box>
              )}
              {activeTab === 2 && (
                <Box pt={2}>
                  <Typography variant="h6" mb={2}>Delivery Items</Typography>
                  {selectedDelivery.delivery_items?.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Barcode</TableCell>
                          <TableCell>Serial</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell>Quantity</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedDelivery.delivery_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.bottles?.barcode_number}</TableCell>
                            <TableCell>{item.bottles?.serial_number}</TableCell>
                            <TableCell>{item.bottles?.product_code}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No items added to this delivery
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <Box pt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    value={newDelivery.customer_name}
                    onChange={(e) => setNewDelivery({ ...newDelivery, customer_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Delivery Type</InputLabel>
                    <Select
                      value={newDelivery.delivery_type}
                      onChange={(e) => setNewDelivery({ ...newDelivery, delivery_type: e.target.value })}
                      label="Delivery Type"
                    >
                      {deliveryTypes.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    value={newDelivery.address}
                    onChange={(e) => setNewDelivery({ ...newDelivery, address: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Scheduled Date"
                    type="date"
                    value={newDelivery.scheduled_date}
                    onChange={(e) => setNewDelivery({ ...newDelivery, scheduled_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={newDelivery.status}
                      onChange={(e) => setNewDelivery({ ...newDelivery, status: e.target.value })}
                      label="Status"
                    >
                      {deliveryStatuses.map(status => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={newDelivery.notes}
                    onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <SmoothButton onClick={handleSaveDelivery} variant="contained">
              Save
            </SmoothButton>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
} 