import logger from '../utils/logger';
import React, { useEffect, useState, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, Button, Card, CardContent, Grid, Stack, Chip
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

function normalizeFillStatus(status) {
  const value = (status || '').toString().trim().toLowerCase();
  if (!value) return 'unknown';
  if (value === 'empty') return 'empty';
  if (['full', 'filled', 'available'].includes(value)) return 'full';
  return 'unknown';
}

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
  const [rnbCount, setRnbCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { profile, organization } = useAuth();
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    fetchBottles();
  }, [organization?.id]);

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

      const [bottlesResponse, rnbResponse] = await Promise.all([
        supabase
          .from('bottles')
          .select('*')
          .eq('organization_id', organization.id)
          .order('barcode_number'),
        supabase
          .from('rentals')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('is_dns', true)
          .is('rental_end_date', null)
          .ilike('dns_description', '%Return not on balance%')
      ]);

      const { data, error } = bottlesResponse;
      const { count: activeRnbCount, error: rnbError } = rnbResponse;
      
      if (error) throw error;
      if (rnbError) throw rnbError;
      
      // All bottles should be from the same organization now
      const bottlesWithOrg = (data || []).map(bottle => ({
        ...bottle,
        organization_name: organization.name // Use current organization name
      }));
      
      setBottles(bottlesWithOrg);
      setRnbCount(activeRnbCount || 0);
    } catch (err) {
      logger.error('Error fetching bottles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get all unique gas types from the bottles table - these are the gas assets inside the bottles
  // Group by product_code when set (one row per SKU); otherwise roll up by cleaned description
  const assetTypes = useMemo(() => {
    const assetMap = new Map();

    function cleanedLabel(bottle, { includeProductCodeFallback = true } = {}) {
      let gasType = bottle.description || bottle.gas_type || bottle.type;
      if (!gasType && includeProductCodeFallback) {
        gasType = bottle.product_code;
      }
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
          gasType = bottle.description || bottle.gas_type || bottle.type || (includeProductCodeFallback ? bottle.product_code : '');
        }
      }
      return gasType || 'Unknown Gas Type';
    }

    function normalizedGroupKey(bottle) {
      // When product_code is set, it is the SKU — never merge different codes (e.g. BNI300 vs BNI125).
      const code = (bottle.product_code || '').toString().trim();
      if (code) {
        return code.toUpperCase();
      }
      // No code: fall back to cleaned description so similar free-text rows still roll up.
      const descriptive = cleanedLabel(bottle, { includeProductCodeFallback: false });
      const base = descriptive || cleanedLabel(bottle);
      return (base || 'Unknown Gas Type').toString().trim().toUpperCase();
    }

    bottles.forEach(bottle => {
      const groupingKey = normalizedGroupKey(bottle);

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
    const full = bottlesOfType.filter(b => normalizeFillStatus(b.status) === 'full').length;
    const empty = bottlesOfType.filter(b => normalizeFillStatus(b.status) === 'empty').length;

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
      full: full,
      empty: empty,
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
  const physicalTotal = assetRows.reduce((sum, row) => sum + row.total, 0);
  const inventoryMetrics = {
    assetTypes: assetRows.length,
    totalBottles: physicalTotal,
    physicalBottlesHelper:
      rnbCount > 0
        ? `${rnbCount} open RNB (return not on balance) — billing exceptions only, not extra physical bottles`
        : 'Cylinder rows in bottle inventory',
    full: assetRows.reduce((sum, row) => sum + row.full, 0),
    empty: assetRows.reduce((sum, row) => sum + row.empty, 0),
    available: assetRows.reduce((sum, row) => sum + row.available, 0),
    rented: assetRows.reduce((sum, row) => sum + row.rented, 0),
    maintenance: assetRows.reduce((sum, row) => sum + row.maintenance, 0),
    lost: assetRows.reduce((sum, row) => sum + row.lost, 0),
  };


  if (loading) return (
    <Box sx={{ minHeight: '100%', bgcolor: 'transparent', py: 2, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 3 }, borderRadius: 3, boxShadow: 'none', border: '1px solid rgba(15, 23, 42, 0.08)', bgcolor: '#fcfcfb', overflow: 'visible' }}>
        <Box p={4} textAlign="center">
          <CircularProgress />
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'transparent', py: 2, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 3 }, borderRadius: 3, boxShadow: 'none', border: '1px solid rgba(15, 23, 42, 0.08)', bgcolor: '#fcfcfb', overflow: 'visible' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap' }}>
                <Chip label="Inventory" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
                <Chip label={organization?.name || organizationName || 'Organization'} size="small" variant="outlined" sx={{ borderRadius: 999 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
                Bottle inventory
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
                Check full vs empty bottle counts per gas type, plus other inventory statuses across the organization.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button
                component={RouterLink}
                to="/bottle-locations"
                variant="outlined"
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
              >
                Where bottles are
              </Button>
              <Button
                variant="outlined"
                onClick={() => exportSummaryByType(bottles)}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
              >
                Export summary
              </Button>
              <Button
                variant="outlined"
                onClick={() => exportAllBottlesToCSV(organization.id)}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
              >
                Export inventory
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Asset types', value: inventoryMetrics.assetTypes, helper: 'Grouped inventory categories' },
            {
              label: 'Physical bottles',
              value: inventoryMetrics.totalBottles.toLocaleString(),
              helper: inventoryMetrics.physicalBottlesHelper,
            },
            { label: 'Full', value: inventoryMetrics.full, helper: 'Bottles ready for delivery/use' },
            { label: 'Empty', value: inventoryMetrics.empty, helper: 'Bottles to refill or return' },
            { label: 'Available', value: inventoryMetrics.available, helper: 'Ready for allocation or movement' },
            { label: 'Rented', value: inventoryMetrics.rented, helper: 'Currently assigned to customers' },
            { label: 'Maintenance', value: inventoryMetrics.maintenance, helper: 'Temporarily unavailable for service' },
          ].map((metric) => (
            <Grid item xs={12} sm={6} lg={3} key={metric.label}>
              <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5, letterSpacing: '-0.03em' }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 0.75 }}>
                    {metric.helper}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error: {error}
          </Alert>
        )}


        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'none' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Gas Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Bottle Sizes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Full Bottles</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Empty Bottles</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Available Bottles</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rented Bottles</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Maintenance</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Lost</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Bottles</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assetRows.map(row => (
                  <TableRow key={row.gasType} sx={{ '&:hover': { backgroundColor: '#fcfcfd' } }}>
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
                          fontWeight: 700,
                          color: row.full > 0 ? 'success.main' : 'text.secondary'
                        }}
                      >
                        {row.full}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 700,
                          color: row.empty > 0 ? 'warning.main' : 'text.secondary'
                        }}
                      >
                        {row.empty}
                      </Typography>
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