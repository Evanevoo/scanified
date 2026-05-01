import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import logger from '../utils/logger';

function normalizeDetails(details) {
  if (!details) return {};
  if (typeof details === 'object') {
    if (details.field_changes && typeof details.field_changes === 'object') return details;
    if (details.details) return normalizeDetails(details.details);
    return details;
  }
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return normalizeDetails(parsed);
    } catch {
      return {};
    }
  }
  return {};
}

function toDisplay(value) {
  if (value == null || value === '') return 'empty';
  return String(value);
}

function isCustomerOwnedValue(value) {
  const normalized = (value || '').toString().trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes('customer') && normalized.includes('own');
}

function normalizeStatusLabel(value) {
  const normalized = (value || '').toString().trim().toLowerCase();
  if (!normalized || normalized === 'empty') return 'empty';
  if (normalized === 'filled' || normalized === 'full' || normalized === 'available') return 'Full';
  if (normalized === 'rented') return 'Rented';
  if (normalized === 'lost') return 'Lost';
  if (normalized === 'empty') return 'Empty';
  return String(value);
}

function extractChangedFields(row) {
  const details = normalizeDetails(row.details);
  const fieldChanges = details?.field_changes || {};
  let resolvedChanges = {};
  if (fieldChanges && typeof fieldChanges === 'object' && Object.keys(fieldChanges).length > 0) {
    resolvedChanges = fieldChanges;
  } else {
    const before =
      details?.old_values ||
      details?.previous_values ||
      details?.before ||
      {};
    const after =
      details?.new_values ||
      details?.current_values ||
      details?.after ||
      details?.updated_fields ||
      {};
    const keys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);
    keys.forEach((key) => {
      resolvedChanges[key] = {
        from: before?.[key],
        to: after?.[key],
      };
    });
  }
  const ownershipChange = resolvedChanges?.ownership;
  const ownershipCandidates = [
    ownershipChange?.to,
    ownershipChange?.from,
    details?.ownership,
    details?.bottle?.ownership,
    details?.record?.ownership,
    details?.new_values?.ownership,
    details?.updated_fields?.ownership,
  ];
  const isCustomerOwned = ownershipCandidates.some((candidate) => isCustomerOwnedValue(candidate));

  const mapped = Object.entries(resolvedChanges).map(([field, change]) => ({
    field,
    from:
      field === 'status' && isCustomerOwned
        ? 'N/A'
        : field === 'status'
          ? normalizeStatusLabel(change?.from)
          : toDisplay(change?.from),
    to:
      field === 'status' && isCustomerOwned
        ? 'N/A'
        : field === 'status'
          ? normalizeStatusLabel(change?.to)
          : toDisplay(change?.to),
  }));

  if (mapped.length > 0) return mapped;

  // Legacy / non-standard payload fallback:
  // Collect primitive keys that look like bottle attributes when explicit diffs are missing.
  const fallbackKeys = ['gas_type', 'ownership', 'status', 'assigned_customer', 'customer_name', 'location', 'product_code', 'description', 'type', 'group_name', 'category'];
  const fallbackMapped = fallbackKeys
    .filter((key) => details?.[key] != null || details?.updated_fields?.[key] != null || details?.new_values?.[key] != null)
    .map((key) => ({
      field: key,
      from: toDisplay(details?.old_values?.[key] ?? details?.previous_values?.[key] ?? details?.before?.[key]),
      to: toDisplay(details?.[key] ?? details?.updated_fields?.[key] ?? details?.new_values?.[key] ?? details?.after?.[key]),
    }));

  if (fallbackMapped.length > 0) return fallbackMapped;

  // Final fallback for string-based details payloads.
  const detailsText = (
    typeof row?.details === 'string'
      ? row.details
      : JSON.stringify(details || {})
  ).toLowerCase();

  return fallbackKeys
    .filter((key) => detailsText.includes(key.toLowerCase()))
    .map((key) => ({
      field: key,
      from: 'unknown',
      to: 'updated',
    }));
}

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function getActivityTimestamp(row) {
  return row.created_at || row.timestamp || null;
}

function getActivityRecordId(row) {
  const details = normalizeDetails(row.details);
  return (
    row.record_id ||
    details?.bottle_id ||
    details?.record_id ||
    details?.asset_id ||
    null
  );
}

function getActivityBarcode(row) {
  const details = normalizeDetails(row.details);
  return (
    details?.barcode_number ||
    details?.bottle_barcode ||
    details?.barcode ||
    details?.asset_barcode ||
    '-'
  );
}

function getActivityLocation(row) {
  const details = normalizeDetails(row.details);
  return (
    details?.location ||
    details?.new_values?.location ||
    details?.updated_fields?.location ||
    details?.after?.location ||
    '-'
  );
}

function getActivityUserId(row) {
  const details = normalizeDetails(row.details);
  return (
    row.user_id ||
    details?.user_id ||
    details?.actor_id ||
    details?.updated_by ||
    null
  );
}

function getActivityUserLabel(row, usersById) {
  const details = normalizeDetails(row.details);
  const id = getActivityUserId(row);
  if (id && usersById[id]) return usersById[id];
  if (id && typeof id === 'string' && id.includes('@')) return id;

  const candidates = [
    details?.user_name,
    details?.full_name,
    details?.actor_name,
    details?.actor_email,
    details?.email,
    details?.updated_by_name,
    details?.updated_by_email,
    details?.performed_by,
    details?.user,
    details?.actor,
  ];

  const firstString = candidates.find((value) => typeof value === 'string' && value.trim());
  if (firstString) return firstString.trim();
  if (id) return String(id);
  return 'System / Unknown';
}

function isBottleRelatedRow(row) {
  const details = normalizeDetails(row.details);
  const action = (row.action || '').toString().toLowerCase();
  const serialized = JSON.stringify(details || {}).toLowerCase();
  if (action.includes('bottle') || action.includes('cylinder') || action.includes('asset')) return true;
  if ((row.table_name || '').toString().toLowerCase() === 'bottles') return true;
  if (serialized.includes('field_changes') && (serialized.includes('ownership') || serialized.includes('gas_type'))) return true;
  if (serialized.includes('ownership') || serialized.includes('gas_type') || serialized.includes('assigned_customer')) return true;
  if (details?.event_type && String(details.event_type).toLowerCase().includes('bottle')) return true;
  return false;
}

export default function BottleActivity() {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [orgUsers, setOrgUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError('');
    try {
      const attempts = [
        {
          select: 'id, user_id, action, details, table_name, record_id, created_at, organization_id',
          orderBy: 'created_at',
        },
        {
          select: 'id, user_id, action, details, created_at, organization_id',
          orderBy: 'created_at',
        },
        {
          select: 'id, user_id, action, details, table_name, record_id, timestamp, organization_id',
          orderBy: 'timestamp',
        },
        {
          select: 'id, user_id, action, details, timestamp, organization_id',
          orderBy: 'timestamp',
        },
      ];

      let queryResult = { data: null, error: null };
      for (const attempt of attempts) {
        let query = supabase
          .from('audit_logs')
          .select(attempt.select)
          .eq('organization_id', organization.id)
          .eq('action', 'BOTTLE_UPDATE')
          .order(attempt.orderBy, { ascending: false });
        if (attempt.select.includes('table_name')) {
          query = query.eq('table_name', 'bottles');
        }
        queryResult = await query.limit(1000);
        if (!queryResult.error) break;
      }

      // Some orgs log bottle edits under different action names.
      if (!queryResult.error && (queryResult.data || []).length === 0) {
        const broadAttempts = [
          { select: 'id, user_id, action, details, table_name, record_id, created_at, organization_id', orderBy: 'created_at' },
          { select: 'id, user_id, action, details, created_at, organization_id', orderBy: 'created_at' },
          { select: 'id, user_id, action, details, table_name, record_id, timestamp, organization_id', orderBy: 'timestamp' },
          { select: 'id, user_id, action, details, timestamp, organization_id', orderBy: 'timestamp' },
        ];
        for (const attempt of broadAttempts) {
          queryResult = await supabase
            .from('audit_logs')
            .select(attempt.select)
            .eq('organization_id', organization.id)
            .order(attempt.orderBy, { ascending: false })
            .limit(1500);
          if (!queryResult.error) break;
        }
      }

      if (queryResult.error) throw queryResult.error;
      const rawData = queryResult.data || [];
      const data = rawData.filter(isBottleRelatedRow);
      setRows(data);

      const userIds = [...new Set((data || []).map((row) => row.user_id).filter(Boolean))];
      const { data: orgUserRows, error: orgUsersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', organization.id)
        .order('full_name', { ascending: true });
      if (!orgUsersError) {
        setOrgUsers(orgUserRows || []);
      } else {
        logger.warn('Failed to load organization users for activity filter:', orgUsersError);
        setOrgUsers([]);
      }

      if (userIds.length > 0) {
        const { data: userRows, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (usersError) {
          logger.warn('Failed to load activity users:', usersError);
          setUsersById({});
        } else {
          const nextMap = (userRows || []).reduce((acc, user) => {
            acc[user.id] = user.full_name || user.email || user.id;
            return acc;
          }, {});
          setUsersById(nextMap);
        }
      } else {
        setUsersById({});
      }
    } catch (err) {
      logger.error('Failed to load bottle activity:', err);
      setError(err.message || 'Failed to load bottle activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organization?.id]);

  const userOptions = useMemo(() => {
    const labelsFromAudit = rows.map((r) => getActivityUserLabel(r, usersById) || 'System / Unknown');
    const labelsFromOrgUsers = (orgUsers || []).map((u) => u.full_name || u.email || u.id).filter(Boolean);
    const unique = [...new Set([...labelsFromOrgUsers, ...labelsFromAudit])];
    if (unique.length === 0) unique.push('System / Unknown');
    return unique
      .map((label) => ({ id: label, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, usersById, orgUsers]);

  const fieldOptions = useMemo(() => {
    const baselineFields = [
      'ownership',
      'gas_type',
      'status',
      'assigned_customer',
      'customer_name',
      'location',
      'product_code',
      'description',
      'type',
      'group_name',
      'category',
    ];
    const fields = new Set();
    baselineFields.forEach((f) => fields.add(f));
    rows.forEach((row) => {
      extractChangedFields(row).forEach((f) => fields.add(f.field));
    });
    return [...fields].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;
    return rows.filter((row) => {
      const activityUserLabel = getActivityUserLabel(row, usersById);
      if (userFilter && activityUserLabel !== userFilter) return false;
      const changed = extractChangedFields(row);
      if (fieldFilter && !changed.some((c) => c.field === fieldFilter)) return false;

      const ts = new Date(getActivityTimestamp(row)).getTime();
      if (start != null && !Number.isNaN(ts) && ts < start) return false;
      if (end != null && !Number.isNaN(ts) && ts > end) return false;

      if (!q) return true;
      const details = normalizeDetails(row.details);
      const barcode = (details?.barcode_number || '').toString().toLowerCase();
      const recordId = (getActivityRecordId(row) || '').toString().toLowerCase();
      const userLabel = activityUserLabel.toString().toLowerCase();
      const changesBlob = changed
        .map((c) => `${c.field} ${c.from} ${c.to}`.toLowerCase())
        .join(' ');
      return barcode.includes(q) || recordId.includes(q) || userLabel.includes(q) || changesBlob.includes(q);
    });
  }, [rows, userFilter, fieldFilter, startDate, endDate, search, usersById]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.25 },
          mb: 2,
          borderRadius: 2.5,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} flexDirection={{ xs: 'column', md: 'row' }} gap={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Bottle Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Organization-wide edit history from web and mobile apps.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}>
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2 }, mb: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} flexWrap="wrap">
          <TextField
            size="small"
            select
            label="User"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All users</MenuItem>
            {userOptions.map((user) => (
              <MenuItem key={user.id} value={user.id}>{user.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            label="Changed Field"
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Any field</MenuItem>
            {fieldOptions.map((field) => (
              <MenuItem key={field} value={field}>{field}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            label="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            placeholder="Search barcode, user, field..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260, flex: 1 }}
          />
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 1.25, mb: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredRows.length} of {rows.length} activity events
        </Typography>
      </Paper>

      <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Changes</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={26} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No activity events match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const changes = extractChangedFields(row);
                const barcode = getActivityBarcode(row);
                const locationLabel = getActivityLocation(row);
                const recordId = getActivityRecordId(row);
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatDate(getActivityTimestamp(row))}</TableCell>
                    <TableCell>{getActivityUserLabel(row, usersById)}</TableCell>
                    <TableCell>{barcode}</TableCell>
                    <TableCell>{locationLabel}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {changes.length === 0 ? (
                          <Chip size="small" variant="outlined" label="No field map" />
                        ) : (
                          changes.map((change) => (
                            <Chip
                              key={`${row.id}-${change.field}`}
                              size="small"
                              label={`${change.field}: ${change.from} -> ${change.to}`}
                            />
                          ))
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {recordId ? (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<VisibilityIcon />}
                          component={RouterLink}
                          to={`/assets/${recordId}`}
                        >
                          Open
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
