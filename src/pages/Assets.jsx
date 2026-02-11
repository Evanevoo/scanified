import logger from '../utils/logger';
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, TextField, FormControl, InputLabel, Select, MenuItem, Alert, Button
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

async function exportAllBottlesToCSV(organizationId) {
  try {
    // SECURITY: Only export bottles from specified organization
    if (!organizationId) {
      alert('Organization not found. Cannot export bottles.');
      return;
    }
    const { data: allBottles, error } = await supabase
      .from('bottles')
      .select('*')
      .eq('organization_id', organizationId)
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
    logger.error('Error exporting bottles:', error);
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
    
    // Count by status - FIXED: Use mutually exclusive logic
    if (bottle.status === 'lost') {
      summaryByType[type].lost += 1;
    } else if (bottle.assigned_customer && bottle.assigned_customer !== '') {
      summaryByType[type].with_customer += 1;
    } else {
      summaryByType[type].in_house += 1;
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
  const { profile, organization } = useAuth();
  const [organizationName, setOrganizationName] = useState('');

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

  const fetchOrganizations = async () => {
    try {
      // Only fetch organizations for owners, regular users only see their own org
      if (profile?.role === 'owner') {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        setOrganizations(data || []);
      } else {
        // Non-owners only see their own organization
        if (organization?.id) {
          setOrganizations([{ id: organization.id, name: organization.name }]);
        }
      }
    } catch (err) {
      logger.error('Error fetching organizations:', err);
      setError(err.message);
    }
  };

  const fetchBottles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ALWAYS filter by current user's organization - no exceptions!
      if (!organization?.id) {
        setError('No organization found for current user');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id) // CRITICAL: Always filter by current organization
        .order('barcode_number');
      
      // Additional organization filter for owners (if they want to see specific org)
      if (selectedOrg && profile?.role === 'owner') {
        query = query.eq('organization_id', selectedOrg);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // All bottles should be from the same organization now
      const bottlesWithOrg = (data || []).map(bottle => ({
        ...bottle,
        organization_name: organization.name // Use current organization name
      }));
      
      setBottles(bottlesWithOrg);
    } catch (err) {
      logger.error('Error fetching bottles:', err);
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

  // Get all unique gas types from the bottles table - these are the gas assets inside the bottles
  // Group by product_code when present so the same code (e.g. BOX300-16PK) always stays in one row
  const assetTypes = useMemo(() => {
    const assetMap = new Map();

    function cleanedLabel(bottle) {
      let gasType = bottle.description || bottle.product_code || bottle.gas_type || bottle.type;
      if (gasType) {
        gasType = gasType
          .replace(/^AVIATOR\s+/i, '')
          .replace(/\s+BOTTLE.*$/i, '')
          .replace(/\s+ASSET.*$/i, '')
          .replace(/\s+SIZE\s+\d+.*$/i, '')
          .replace(/\s+-\s+SIZE\s+\d+.*$/i, '')
          .replace(/\s+ASSETS.*$/i, '')
          .trim();
        if (gasType.length < 3) {
          gasType = bottle.description || bottle.product_code || bottle.gas_type || bottle.type;
        }
      }
      return gasType || 'Unknown Gas Type';
    }

    bottles.forEach(bottle => {
      const hasProductCode = bottle.product_code && bottle.product_code.trim();
      const normalizedCode = hasProductCode ? bottle.product_code.trim() : null;

      // Group by product_code when present so BOX300-16PK is always one row regardless of description/gas_type
      const groupingKey = normalizedCode || cleanedLabel(bottle);

      if (!assetMap.has(groupingKey)) {
        assetMap.set(groupingKey, []);
      }
      assetMap.get(groupingKey).push(bottle);
    });

    return Array.from(assetMap.entries()).map(([groupingKey, bottlesOfType]) => {
      const sample = bottlesOfType[0];
      const displayLabel = sample?.product_code?.trim() || cleanedLabel(sample) || groupingKey;
      return {
        gasType: displayLabel,
        bottles: bottlesOfType
      };
    }).sort((a, b) => {
      const aLabel = a.gasType;
      const bLabel = b.gasType;
      return (aLabel || '').localeCompare(bLabel || '');
    });
  }, [bottles]);

  // For each gas type, show bottle inventory (counting physical bottles)
  const assetRows = assetTypes.map(({ gasType, bottles: bottlesOfType }) => {
    // Count bottles by status - these are the physical containers we track
    // FIXED: Use mutually exclusive logic to prevent double counting
    const available = bottlesOfType.filter(b => 
      (b.status === 'available' && !b.assigned_customer) || 
      (!b.status || b.status === 'available')
    ).length;
    const rented = bottlesOfType.filter(b => 
      b.assigned_customer && b.assigned_customer !== '' && 
      b.status !== 'maintenance' && b.status !== 'lost' && b.status !== 'retired'
    ).length;
    const maintenance = bottlesOfType.filter(b => b.status === 'maintenance').length;
    const lost = bottlesOfType.filter(b => b.status === 'lost').length;
    const retired = bottlesOfType.filter(b => b.status === 'retired').length;
    const total = bottlesOfType.length;
    
    const sample = bottlesOfType[0] || {};
    
    // Get bottle size information - show the different sizes of bottles for this gas type
    const sizes = [...new Set(bottlesOfType.map(b => {
      let desc = b.description || '';
      // Extract size from description if it contains size info
      const sizeMatch = desc.match(/(?:SIZE|size)\s+(\d+)/i);
      if (sizeMatch) {
        return `${sizeMatch[1]} cu ft`;
      }
      // Clean up description to remove asset/bottle references
      desc = desc
        .replace(/\s+BOTTLE.*$/i, '')
        .replace(/\s+ASSET.*$/i, '')
        .replace(/\s+ASSETS.*$/i, '')
        .trim();
      return desc;
    }).filter(Boolean))];
    
    // Show actual sizes when there are 2-3 sizes, otherwise show count
    const sizeInfo = sizes.length === 1 
      ? sizes[0] 
      : sizes.length > 1 && sizes.length <= 3
      ? sizes.join(', ')
      : sizes.length > 3
      ? `${sizes.length} different sizes`
      : 'Various sizes';
    
    return {
      gasType: gasType,
      product_code: sample.product_code || '',
      sizeInfo: sizeInfo,
      available: available,
      rented: rented,
      maintenance: maintenance,
      lost: lost,
      retired: retired,
      total: total,
      organization_name: sample.organization_name || '',
      id: sample.id || '',
      sizes: sizes,
      sample_bottle: sample
      // Removed all_bottles to prevent storage quota issues
    };
  });


  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        <Box p={4} textAlign="center">
          <CircularProgress />
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1 }}>Bottle Inventory</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Organization: <strong>{organization?.name}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              View-only inventory overview of physical bottles (containers) that hold gas assets
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        {/* Organization Filter - Only for Owners */}
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
            label="Search bottles, barcode, gas type..."
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


        <Paper elevation={2} sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Gas Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Bottle Sizes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Available Bottles</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rented Bottles</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Maintenance</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Lost</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Bottles</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assetRows.map(row => (
                  <TableRow key={row.gasType}>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {row.gasType}
                      </Typography>
                      {row.product_code && (
                        <Typography variant="caption" color="text.secondary">
                          Code: {row.product_code}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {row.sizeInfo}
                      </Typography>
                      {row.sizes.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          {row.sizes.slice(0, 3).join(', ')} +{row.sizes.length - 3} more
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600, 
                          color: row.available > 0 ? 'success.main' : 'text.secondary' 
                        }}
                      >
                        {row.available}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600, 
                          color: row.rented > 0 ? 'primary.main' : 'text.secondary' 
                        }}
                      >
                        {row.rented}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600, 
                          color: row.maintenance > 0 ? 'warning.main' : 'text.secondary' 
                        }}
                      >
                        {row.maintenance}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600, 
                          color: row.lost > 0 ? 'error.main' : 'text.secondary' 
                        }}
                      >
                        {row.lost}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {row.total}
                      </Typography>
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
    </Box>
  );
} 