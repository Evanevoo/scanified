import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import {
  Box, Paper, Typography, Button, TextField, Grid, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';
import toast from 'react-hot-toast';

const PlanManagement = () => {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isNewPlan, setIsNewPlan] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      toast.error('Failed to fetch plans.');
      console.error(error);
    } else {
      setPlans(data);
    }
    setLoading(false);
  };

  const openModal = (plan = null) => {
    if (plan) {
      setSelectedPlan({ ...plan, features: JSON.stringify(plan.features || [], null, 2) });
      setIsNewPlan(false);
    } else {
      setSelectedPlan({
        name: '',
        description: '',
        price: 0,
        price_interval: 'month',
        max_users: 5,
        max_cylinders: 100,
        max_customers: 100,
        features: '[]',
        is_active: true,
        is_most_popular: false,
      });
      setIsNewPlan(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    let planToSave = { ...selectedPlan };
    try {
      // Ensure features are valid JSON before saving
      planToSave.features = JSON.parse(planToSave.features);
    } catch (e) {
      toast.error('Features field contains invalid JSON. Please correct it.');
      return;
    }

    // Remove the id for insert operations
    if (isNewPlan) {
      delete planToSave.id;
    }

    const { data, error } = isNewPlan
      ? await supabase.from('subscription_plans').insert(planToSave).select().single()
      : await supabase.from('subscription_plans').update(planToSave).eq('id', selectedPlan.id).select().single();

    if (error) {
      toast.error(`Failed to save plan: ${error.message}`);
    } else {
      toast.success(`Plan successfully ${isNewPlan ? 'created' : 'updated'}!`);
      setIsModalOpen(false);
      fetchPlans();
    }
  };

  const handleModalChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSelectedPlan(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Subscription Plan Management</Typography>
      <Button startIcon={<AddIcon />} variant="contained" onClick={() => openModal()} sx={{ mb: 2 }}>
        Create New Plan
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Max Users</TableCell>
              <TableCell>Max Cylinders</TableCell>
              <TableCell>Max Customers</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map(plan => (
              <TableRow key={plan.id}>
                <TableCell>{plan.name}</TableCell>
                <TableCell>${plan.price}/{plan.price_interval}</TableCell>
                <TableCell>{plan.max_users === -1 ? 'Unlimited' : plan.max_users}</TableCell>
                <TableCell>{plan.max_cylinders === -1 ? 'Unlimited' : plan.max_cylinders}</TableCell>
                <TableCell>{plan.max_customers === -1 ? 'Unlimited' : plan.max_customers}</TableCell>
                <TableCell>{plan.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => openModal(plan)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isNewPlan ? 'Create New Plan' : 'Edit Plan'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField name="name" label="Plan Name" value={selectedPlan?.name || ''} onChange={handleModalChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="description" label="Description" value={selectedPlan?.description || ''} onChange={handleModalChange} fullWidth />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField name="price" label="Price" type="number" value={selectedPlan?.price || 0} onChange={handleModalChange} fullWidth />
            </Grid>
             <Grid item xs={6} sm={3}>
              <TextField name="price_interval" label="Interval (e.g., month)" value={selectedPlan?.price_interval || 'month'} onChange={handleModalChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography color="text.secondary" sx={{mt: 1}}>Set to -1 for unlimited.</Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField name="max_users" label="Max Users" type="number" value={selectedPlan?.max_users || 0} onChange={handleModalChange} fullWidth />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField name="max_cylinders" label="Max Cylinders" type="number" value={selectedPlan?.max_cylinders || 0} onChange={handleModalChange} fullWidth />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField name="max_customers" label="Max Customers" type="number" value={selectedPlan?.max_customers || 0} onChange={handleModalChange} fullWidth />
            </Grid>
            <Grid item xs={12}>
               <TextField
                name="features"
                label="Features (JSON Array)"
                multiline
                rows={6}
                value={selectedPlan?.features || '[]'}
                onChange={handleModalChange}
                fullWidth
                helperText='Enter a valid JSON array of strings, e.g., ["Feature 1", "Feature 2"]'
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel control={<Switch name="is_active" checked={selectedPlan?.is_active || false} onChange={handleModalChange} />} label="Plan is Active" />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel control={<Switch name="is_most_popular" checked={selectedPlan?.is_most_popular || false} onChange={handleModalChange} />} label="Most Popular Plan" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanManagement; 