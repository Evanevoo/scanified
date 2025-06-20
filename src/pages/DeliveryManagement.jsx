import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert,
  CircularProgress, Tabs, Tab, Badge, Tooltip, Divider
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  LocationOn as LocationIcon, DirectionsCar as CarIcon,
  Schedule as ScheduleIcon, CheckCircle as CheckIcon,
  Warning as WarningIcon, Refresh as RefreshIcon,
  Map as MapIcon, Person as PersonIcon
} from '@mui/icons-material';
import { deliveryService } from '../services/deliveryService';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';

export default function DeliveryManagement() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    delivery_date: '',
    delivery_time: '',
    driver_id: '',
    notes: '',
    bottles: []
  });

  useEffect(() => {
    if (profile?.id) {
      fetchDeliveries();
      fetchDrivers();
    }
  }, [profile]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const data = await deliveryService.getDrivers();
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const handleCreateDelivery = async () => {
    try {
      setLoading(true);
      const delivery = await deliveryService.createDelivery(formData);

      // Send notification
      await notificationService.createInAppNotification(
        delivery.driver_id,
        'New Delivery Assigned',
        `You have a new delivery scheduled for ${formData.delivery_date}`,
        'info',
        { deliveryId: delivery.id }
      );

      setOpenDialog(false);
      setFormData({
        customer_id: '',
        delivery_date: '',
        delivery_time: '',
        driver_id: '',
        notes: '',
        bottles: []
      });
      fetchDeliveries();
    } catch (error) {
      console.error('Error creating delivery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (deliveryId, status) => {
    try {
      await deliveryService.updateDeliveryStatus(deliveryId, status);
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAssignDriver = async (deliveryId, driverId) => {
    try {
      await deliveryService.assignDriver(deliveryId, driverId);
      fetchDeliveries();
    } catch (error) {
      console.error('Error assigning driver:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'in_transit':
        return 'warning';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <ScheduleIcon />;
      case 'in_transit':
        return <CarIcon />;
      case 'delivered':
        return <CheckIcon />;
      case 'cancelled':
        return <WarningIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  const filteredDeliveries = () => {
    switch (activeTab) {
      case 0: // All
        return deliveries;
      case 1: // Scheduled
        return deliveries.filter(d => d.status === 'scheduled');
      case 2: // In Transit
        return deliveries.filter(d => d.status === 'in_transit');
      case 3: // Delivered
        return deliveries.filter(d => d.status === 'delivered');
      default:
        return deliveries;
    }
  };

  const stats = {
    total: deliveries.length,
    scheduled: deliveries.filter(d => d.status === 'scheduled').length,
    inTransit: deliveries.filter(d => d.status === 'in_transit').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Delivery Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          New Delivery
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Deliveries
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Scheduled
              </Typography>
              <Typography variant="h4" color="primary">{stats.scheduled}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Transit
              </Typography>
              <Typography variant="h4" color="warning.main">{stats.inTransit}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Delivered
              </Typography>
              <Typography variant="h4" color="success.main">{stats.delivered}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={`All (${stats.total})`} />
          <Tab label={`Scheduled (${stats.scheduled})`} />
          <Tab label={`In Transit (${stats.inTransit})`} />
          <Tab label={`Delivered (${stats.delivered})`} />
        </Tabs>
      </Paper>

      {/* Deliveries Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredDeliveries().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">
                      No deliveries found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries().map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>#{delivery.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {delivery.customer?.name || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {delivery.customer?.phone || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(delivery.delivery_date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {delivery.delivery_time || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {delivery.driver ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                          {delivery.driver.full_name}
                        </Box>
                      ) : (
                        <Chip
                          label="Unassigned"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(delivery.status)}
                        label={delivery.status.replace('_', ' ')}
                        color={getStatusColor(delivery.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Update Status">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedDelivery(delivery)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Track Location">
                          <IconButton size="small">
                            <LocationIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Route">
                          <IconButton size="small">
                            <MapIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Delivery Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Delivery</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer"
                select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              >
                {/* Add customer options */}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Delivery Date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Delivery Time"
                type="time"
                value={formData.delivery_time}
                onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Driver</InputLabel>
                <Select
                  value={formData.driver_id}
                  onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                  label="Driver"
                >
                  {drivers.map((driver) => (
                    <MenuItem key={driver.id} value={driver.id}>
                      {driver.full_name}
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
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateDelivery}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Create Delivery'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      {selectedDelivery && (
        <Dialog open={!!selectedDelivery} onClose={() => setSelectedDelivery(null)}>
          <DialogTitle>Update Delivery Status</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Delivery #{selectedDelivery.id} - {selectedDelivery.customer?.name}
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedDelivery.status}
                onChange={(e) => handleUpdateStatus(selectedDelivery.id, e.target.value)}
                label="Status"
              >
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="in_transit">In Transit</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            {!selectedDelivery.driver_id && (
              <FormControl fullWidth>
                <InputLabel>Assign Driver</InputLabel>
                <Select
                  onChange={(e) => handleAssignDriver(selectedDelivery.id, e.target.value)}
                  label="Assign Driver"
                >
                  {drivers.map((driver) => (
                    <MenuItem key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedDelivery(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
} 