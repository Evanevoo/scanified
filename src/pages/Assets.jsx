import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Button, TextField, FormControl, InputLabel, Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

function exportBottlesToCSV(bottles) {
  if (!bottles.length) return;
  
  const headers = [
    'Group',
    'Type',
    'Product Code',
    'Description',
    'In House Total',
    'With Customer Total',
    'Lost Total',
    'Total',
    'Dock Stock',
    'Organization'
  ];
  
  const rows = bottles.map(bottle => [
    bottle.group || '',
    bottle.type || '',
    bottle.product_code || '',
    bottle.description || '',
    bottle.in_house_total || '',
    bottle.with_customer_total || '',
    bottle.lost_total || '',
    bottle.total || '',
    bottle.dock_stock || 0,
    bottle.organization_name || ''
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(r => r.map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all_gas_assets_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportAllBottlesToCSV() {
  try {
    const { data: allBottles, error } = await supabase
      .from('bottles')
      .select('*')
      .order('barcode_number');
    
    if (error) throw error;
    
    if (!allBottles || allBottles.length === 0) {
      alert('No bottles found to export.');
      return;
    }
    
    // Fetch organization names separately
    const organizationIds = [...new Set(allBottles.map(bottle => bottle.organization_id).filter(Boolean))];
    let organizationMap = {};
    
    if (organizationIds.length > 0) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', organizationIds);
      
      organizationMap = (orgData || []).reduce((map, org) => {
        map[org.id] = org.name;
        return map;
      }, {});
    }
    
    // Add organization name to each bottle
    const bottlesWithOrg = allBottles.map(bottle => ({
      ...bottle,
      organization_name: bottle.organization_id ? (organizationMap[bottle.organization_id] || 'Unknown') : 'Unknown'
    }));
    
    exportBottlesToCSV(bottlesWithOrg);
  } catch (error) {
    console.error('Error exporting bottles:', error);
    alert('Error exporting bottles: ' + error.message);
  }
}

function exportSummaryByType(bottles) {
  if (!bottles.length) return;
  
  // Group bottles by type
  const summaryByType = {};
  bottles.forEach(bottle => {
    const type = bottle.type || bottle.description || 'Unknown';
    if (!summaryByType[type]) {
      summaryByType[type] = {
        type: type,
        total: 0,
        in_house: 0,
        with_customer: 0,
        lost: 0
      };
    }
    summaryByType[type].total += 1;
    
    // Count by status
    if (bottle.status === 'available' || !bottle.assigned_customer) {
      summaryByType[type].in_house += 1;
    } else if (bottle.status === 'rented' || bottle.assigned_customer) {
      summaryByType[type].with_customer += 1;
    } else if (bottle.status === 'lost') {
      summaryByType[type].lost += 1;
    }
  });
  
  const headers = ['Type', 'Total', 'In House', 'With Customer', 'Lost'];
  const rows = Object.values(summaryByType).map(summary => [
    summary.type,
    summary.total,
    summary.in_house,
    summary.with_customer,
    summary.lost
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(r => r.map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gas_assets_summary_by_type_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Assets() {
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    fetchBottles();
  }, [selectedOrg]);

  useEffect(() => {
    async function fetchOrgName() {
      if (profile?.organization_id) {
        const { data, error } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .single();
        if (data) setOrganizationName(data.name);
      }
    }
    fetchOrgName();
  }, [profile]);

  useEffect(() => {
    if (editDialogOpen && editForm.id) {
      // Try to load draft from localStorage
      const draft = localStorage.getItem(`editAssetDraft_${editForm.id}`);
      if (draft) {
        setEditForm(JSON.parse(draft));
      }
    }
    // eslint-disable-next-line
  }, [editDialogOpen]);

  useEffect(() => {
    if (editDialogOpen && editForm.id) {
      localStorage.setItem(`editAssetDraft_${editForm.id}`, JSON.stringify(editForm));
    }
    // eslint-disable-next-line
  }, [editForm, editDialogOpen]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err.message);
    }
  };

  const fetchBottles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('bottles')
        .select('*')
        .order('barcode_number');
      
      if (selectedOrg) {
        query = query.eq('organization_id', selectedOrg);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch organization names separately
      const organizationIds = [...new Set((data || []).map(bottle => bottle.organization_id).filter(Boolean))];
      let organizationMap = {};
      
      if (organizationIds.length > 0) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', organizationIds);
        
        organizationMap = (orgData || []).reduce((map, org) => {
          map[org.id] = org.name;
          return map;
        }, {});
      }
      
      // Add organization name to each bottle
      const bottlesWithOrg = (data || []).map(bottle => ({
        ...bottle,
        organization_name: bottle.organization_id ? (organizationMap[bottle.organization_id] || 'Unknown') : 'Unknown'
      }));
      
      setBottles(bottlesWithOrg);
    } catch (err) {
      console.error('Error fetching bottles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter bottles by search
  const filteredBottles = bottles.filter(bottle => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (bottle.barcode_number && bottle.barcode_number.toLowerCase().includes(s)) ||
      (bottle.serial_number && bottle.serial_number.toLowerCase().includes(s)) ||
      (bottle.type && bottle.type.toLowerCase().includes(s)) ||
      (bottle.gas_type && bottle.gas_type.toLowerCase().includes(s)) ||
      (bottle.location && bottle.location.toLowerCase().includes(s)) ||
      (bottle.organization_name && bottle.organization_name.toLowerCase().includes(s))
    );
  });

  // Get all unique asset types from the bottles table
  const assetTypes = useMemo(() => {
    const types = new Set();
    bottles.forEach(bottle => {
      if (bottle.type) types.add(bottle.type);
    });
    return Array.from(types);
  }, [bottles]);

  // For each asset type, count bottles by status
  const assetRows = assetTypes.map(type => {
    const bottlesOfType = bottles.filter(b => b.type === type);
    const inHouse = bottlesOfType.filter(b => b.status === 'available').length;
    const withCustomer = bottlesOfType.filter(b => b.status === 'rented').length;
    const lost = bottlesOfType.filter(b => b.status === 'lost').length;
    const total = bottlesOfType.length;
    const sample = bottlesOfType[0] || {};
    return {
      group_name: sample.group_name || '',
      type,
      product_code: sample.product_code || '',
      description: sample.description || '',
      in_house_total: inHouse,
      with_customer_total: withCustomer,
      lost_total: lost,
      total,
      dock_stock: sample.dock_stock || 0,
      organization_name: sample.organization_name || '',
      id: sample.id || ''
    };
  });

  const handleEditClick = (row) => {
    setEditRow(row);
    setEditForm({ ...row });
    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    // Save to supabase
    const { id, ...fields } = editForm;
    const { error } = await supabase.from('bottles').update(fields).eq('id', id);
    if (!error) {
      setEditDialogOpen(false);
      setEditRow(null);
      localStorage.removeItem(`editAssetDraft_${id}`);
      fetchBottles();
    }
  };

  const handleEditCancel = () => {
    if (editForm.id) localStorage.removeItem(`editAssetDraft_${editForm.id}`);
    setEditDialogOpen(false);
    setEditRow(null);
  };

  const handleDeleteClick = (row) => setDeleteRow(row);

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    await supabase.from('bottles').delete().eq('id', deleteRow.id);
    setDeleting(false);
    setDeleteRow(null);
    fetchBottles();
  };

  const handleDeleteCancel = () => setDeleteRow(null);

  const isSelected = (id) => selectedRows.includes(id);
  const handleSelectRow = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(assetRows.map(row => row.id).filter(Boolean));
    } else {
      setSelectedRows([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;
    setDeleting(true);
    await supabase.from('bottles').delete().in('id', selectedRows);
    setDeleting(false);
    setSelectedRows([]);
    fetchBottles();
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    // Fetch all bottle IDs
    const { data: allBottles, error: fetchError } = await supabase.from('bottles').select('id');
    if (fetchError) {
      setDeleting(false);
      alert('Error fetching assets: ' + fetchError.message);
      return;
    }
    const ids = (allBottles || []).map(b => b.id).filter(Boolean);
    if (ids.length === 0) {
      setDeleting(false);
      alert('No assets found to delete.');
      return;
    }
    const { error } = await supabase.from('bottles').delete().in('id', ids);
    setDeleting(false);
    if (error) {
      alert('Error deleting all assets: ' + error.message);
    } else {
      fetchBottles();
      alert('All assets deleted successfully.');
    }
  };

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Box p={4} textAlign="center">
          <CircularProgress />
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1 }}>All Gas Assets</Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={exportAllBottlesToCSV}
            >
              Export All Bottles
            </Button>
            <Button
              variant="contained"
              color="info"
              onClick={() => exportSummaryByType(bottles)}
            >
              Export Summary by Type
            </Button>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/import-asset-balance')}
              >
                Import Assets
              </Button>
            )}
          </Box>
        </Box>

        {/* Filters */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          {profile?.role === 'owner' && (
            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel>Organization</InputLabel>
              <Select
                value={selectedOrg}
                label="Organization"
                onChange={e => setSelectedOrg(e.target.value)}
              >
                <MenuItem value="">All Organizations</MenuItem>
                {organizations.map(org => (
                  <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            size="small"
            label="Search bottles, barcode, type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error: {error}
          </Alert>
        )}

        <Button
          variant="contained"
          color="error"
          sx={{ mb: 2 }}
          onClick={async () => {
            if (!window.confirm('Are you sure you want to delete ALL assets? This cannot be undone.')) return;
            setLoading(true);
            // Fetch all bottle IDs
            const { data: allBottles, error: fetchError } = await supabase.from('bottles').select('id');
            if (fetchError) {
              setLoading(false);
              alert('Error fetching assets: ' + fetchError.message);
              return;
            }
            const ids = (allBottles || []).map(b => b.id).filter(Boolean);
            if (ids.length === 0) {
              setLoading(false);
              alert('No assets found to delete.');
              return;
            }
            const { error } = await supabase.from('bottles').delete().in('id', ids);
            setLoading(false);
            if (error) {
              alert('Error deleting all assets: ' + error.message);
            } else {
              fetchBottles();
              alert('All assets deleted successfully.');
            }
          }}
        >
          Delete All
        </Button>

        <Paper elevation={2} sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedRows.length > 0 && selectedRows.length < assetRows.length}
                      checked={assetRows.length > 0 && selectedRows.length === assetRows.length}
                      onChange={e => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Group</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Organization</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assetRows.map(row => (
                  <TableRow key={row.type} selected={isSelected(row.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </TableCell>
                    <TableCell>{row.group_name}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.product_code}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{organizationName}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        sx={{ mr: 1 }}
                        onClick={() => handleEditClick(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        sx={{ mr: 1 }}
                        onClick={() => handleDeleteClick(row)}
                      >
                        Delete
                      </Button>
                      {row.id ? (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/bottle/${row.id}`)}
                        >
                          View Details
                        </Button>
                      ) : (
                        <span style={{ color: '#aaa' }}>No Details</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {assetRows.length === 0 && (
            <Box p={3} textAlign="center">
              <Typography color="text.secondary">
                No assets found.
              </Typography>
            </Box>
          )}
        </Paper>
      </Paper>
      <Dialog open={editDialogOpen} onClose={handleEditCancel}>
        <DialogTitle>Edit Asset</DialogTitle>
        <DialogContent>
          <TextField label="Group" name="group_name" value={editForm.group_name || ''} onChange={handleEditChange} fullWidth sx={{ mb: 2 }} />
          <TextField label="Type" name="type" value={editForm.type || ''} onChange={handleEditChange} fullWidth sx={{ mb: 2 }} />
          <TextField label="Product Code" name="product_code" value={editForm.product_code || ''} onChange={handleEditChange} fullWidth sx={{ mb: 2 }} />
          <TextField label="Description" name="description" value={editForm.description || ''} onChange={handleEditChange} fullWidth sx={{ mb: 2 }} />
          <TextField label="Dock Stock" name="dock_stock" value={editForm.dock_stock || ''} onChange={handleEditChange} fullWidth sx={{ mb: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditCancel}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!deleteRow} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Asset</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this asset?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 