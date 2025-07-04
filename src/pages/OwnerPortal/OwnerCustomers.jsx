import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, IconButton, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Avatar, Tooltip, Badge
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';

export default function OwnerCustomers() {
  const { profile } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgDetailDialog, setOrgDetailDialog] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trial: 0,
    expired: 0
  });

  useEffect(() => {
    if (profile?.role === 'owner') {
      fetchOrganizations();
    }
  }, [profile]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // Fetch all organizations with their subscription status
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles:profiles(count),
          customers:customers(count),
          bottles:bottles(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrganizations(orgs || []);
      
      // Calculate stats
      const total = orgs?.length || 0;
      const active = orgs?.filter(org => org.status === 'active').length || 0;
      const trial = orgs?.filter(org => org.status === 'trial').length || 0;
      const expired = orgs?.filter(org => org.status === 'expired').length || 0;
      
      setStats({ total, active, trial, expired });
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.organization_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'expired': return 'error';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircleIcon />;
      case 'trial': return <WarningIcon />;
      case 'expired': return <WarningIcon />;
      case 'suspended': return <WarningIcon />;
      default: return <WarningIcon />;
    }
  };

  const handleViewDetails = (org) => {
    setSelectedOrg(org);
    setOrgDetailDialog(true);
  };

  const StatCard = ({ title, value, color, icon }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, mr: 2 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={800} color="primary">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (profile?.role !== 'owner') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only available to platform owners.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="primary">
          Customer Organizations
        </Typography>
        <IconButton onClick={fetchOrganizations} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Organizations"
            value={stats.total}
            color="primary"
            icon={<BusinessIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Subscriptions"
            value={stats.active}
            color="success"
            icon={<CheckCircleIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Trial Accounts"
            value={stats.trial}
            color="warning"
            icon={<WarningIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Expired Accounts"
            value={stats.expired}
            color="error"
            icon={<WarningIcon />}
          />
        </Grid>
      </Grid>

      {/* Search */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search organizations by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Paper>

      {/* Organizations Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Organization</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Users</TableCell>
                <TableCell>Customers</TableCell>
                <TableCell>Assets</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <BusinessIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {org.name || 'Unnamed Organization'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {org.organization_id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        {org.email}
                      </Typography>
                      {org.phone && (
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                          <PhoneIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          {org.phone}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(org.status)}
                      label={org.status}
                      color={getStatusColor(org.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge badgeContent={org.profiles?.[0]?.count || 0} color="primary">
                      <PeopleIcon />
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {org.customers?.[0]?.count || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {org.bottles?.[0]?.count || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(org.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(org)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Organization">
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
      )}

      {/* Organization Detail Dialog */}
      <Dialog 
        open={orgDetailDialog} 
        onClose={() => setOrgDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedOrg && (
          <>
            <DialogTitle>
              <Typography variant="h6" fontWeight={700}>
                {selectedOrg.name || 'Unnamed Organization'}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Organization Details
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Organization ID
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrg.organization_id}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      icon={getStatusIcon(selectedOrg.status)}
                      label={selectedOrg.status}
                      color={getStatusColor(selectedOrg.status)}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedOrg.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Contact Information
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrg.email}
                    </Typography>
                  </Box>
                  {selectedOrg.phone && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography variant="body1">
                        {selectedOrg.phone}
                      </Typography>
                    </Box>
                  )}
                  {selectedOrg.address && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Address
                      </Typography>
                      <Typography variant="body1">
                        {selectedOrg.address}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {selectedOrg.profiles?.[0]?.count || 0}
                        </Typography>
                        <Typography variant="caption">Users</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {selectedOrg.customers?.[0]?.count || 0}
                        </Typography>
                        <Typography variant="caption">Customers</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {selectedOrg.bottles?.[0]?.count || 0}
                        </Typography>
                        <Typography variant="caption">Assets</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOrgDetailDialog(false)}>Close</Button>
              <Button variant="contained">Edit Organization</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
} 