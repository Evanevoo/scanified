import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Paper, Stack, Button, List, ListItemButton, ListItemText,
  Collapse, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, LinearProgress, Divider, Chip, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, ExpandMore, ChevronRight,
  AccountTree as AccountTreeIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { supabase } from '../supabase/client';
import { useTheme, resolveAccentToHex } from '../context/ThemeContext';
import { formatCurrency } from '../utils/subscriptionUtils';
import { PageSearchInput } from '../components/ui/search-input-with-icon';

function buildChildrenMap(nodes) {
  const map = new Map();
  for (const n of nodes) {
    const key = n.parent_id || 'ROOT';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.sort_order - b.sort_order) || String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }));
  }
  return map;
}

function buildNodeMap(nodes) {
  return new Map((nodes || []).map((n) => [n.id, n]));
}

function nodePath(nodesById, node) {
  const parts = [];
  let cur = node;
  const seen = new Set();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.unshift(cur.name);
    cur = cur.parent_id ? nodesById.get(cur.parent_id) : null;
  }
  return parts.join(' → ');
}

function classificationPath(nodesById, nodeId) {
  if (!nodeId || !nodesById?.size) return '';
  const node = nodesById.get(nodeId);
  return node ? nodePath(nodesById, node) : '';
}

/** All node ids in the subtree rooted at rootId (including rootId). */
function collectSubtreeNodeIds(rootId, childrenMap) {
  const out = new Set([rootId]);
  const walk = (id) => {
    for (const k of childrenMap.get(id) || []) {
      out.add(k.id);
      walk(k.id);
    }
  };
  walk(rootId);
  return out;
}

function TreeBranch({
  nodes,
  childrenMap,
  expanded,
  toggleExpand,
  selectedId,
  onSelect,
  depth,
}) {
  return (
    <List dense disablePadding sx={{ pl: depth > 0 ? 1.5 : 0 }}>
      {nodes.map((node) => {
        const kids = childrenMap.get(node.id) || [];
        const hasKids = kids.length > 0;
        const open = expanded.has(node.id);
        return (
          <React.Fragment key={node.id}>
            <ListItemButton
              selected={selectedId === node.id}
              onClick={() => onSelect(node)}
              sx={{ borderRadius: 1, py: 0.5 }}
            >
              <Box sx={{ width: 32, display: 'flex', justifyContent: 'center', mr: 0.5 }}>
                {hasKids ? (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(node.id);
                    }}
                    aria-label={open ? 'Collapse' : 'Expand'}
                  >
                    {open ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                  </IconButton>
                ) : (
                  <Box sx={{ width: 32 }} />
                )}
              </Box>
              <ListItemText
                primary={node.name}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: { fontFamily: hasKids ? 'inherit' : 'monospace', fontWeight: hasKids ? 600 : 500 },
                }}
              />
              {!hasKids && (
                <Chip label="Code" size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
              )}
            </ListItemButton>
            {hasKids && (
              <Collapse in={open} timeout="auto" unmountOnExit>
                <TreeBranch
                  nodes={kids}
                  childrenMap={childrenMap}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              </Collapse>
            )}
          </React.Fragment>
        );
      })}
    </List>
  );
}

export default function AssetClassificationTreePricing() {
  const { organization } = useAuth();
  const ctx = useSubscriptions();
  const { accent } = useTheme();
  const primaryColor = resolveAccentToHex(accent);

  const [nodes, setNodes] = useState([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [defaultPricingSupported, setDefaultPricingSupported] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const [categoryMonthly, setCategoryMonthly] = useState('');
  const [categoryYearly, setCategoryYearly] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [rowSaving, setRowSaving] = useState(false);

  const [pricingClsSupported, setPricingClsSupported] = useState(true);

  const loadNodes = useCallback(async () => {
    if (!organization?.id) return;
    setNodesLoading(true);
    setError(null);
    setTableMissing(false);
    let r = await supabase
      .from('asset_classification_nodes')
      .select('id, organization_id, parent_id, name, sort_order, default_monthly_price, default_yearly_price, created_at, updated_at')
      .eq('organization_id', organization.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (r.error?.code === '42703') {
      setDefaultPricingSupported(false);
      r = await supabase
        .from('asset_classification_nodes')
        .select('id, organization_id, parent_id, name, sort_order, created_at, updated_at')
        .eq('organization_id', organization.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
    } else {
      setDefaultPricingSupported(true);
    }
    const { data, error: err } = r;
    if (err) {
      if (err.code === '42P01') {
        setTableMissing(true);
        setNodes([]);
      } else {
        setError(err.message);
      }
      setNodesLoading(false);
      return;
    }
    setNodes(data || []);
    const childCount = {};
    for (const n of data || []) {
      if (n.parent_id) childCount[n.parent_id] = (childCount[n.parent_id] || 0) + 1;
    }
    const nextExp = new Set();
    for (const n of data || []) {
      if (childCount[n.id]) nextExp.add(n.id);
    }
    setExpanded(nextExp);
    setNodesLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { error: err } = await supabase.from('asset_type_pricing').select('classification_node_id').limit(1);
      if (!cancelled && err?.code === '42703') setPricingClsSupported(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setSelected(null);
  }, [organization?.id]);

  const nodesById = useMemo(() => buildNodeMap(nodes), [nodes]);
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const roots = useMemo(() => childrenMap.get('ROOT') || [], [childrenMap]);

  const subtreeIds = useMemo(() => {
    if (!selected?.id) return null;
    return collectSubtreeNodeIds(selected.id, childrenMap);
  }, [selected?.id, childrenMap]);

  const toggleExpand = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selected) {
      setCategoryMonthly('');
      setCategoryYearly('');
      return;
    }
    setCategoryMonthly(
      selected.default_monthly_price != null && String(selected.default_monthly_price) !== ''
        ? String(selected.default_monthly_price)
        : '',
    );
    setCategoryYearly(
      selected.default_yearly_price != null && String(selected.default_yearly_price) !== ''
        ? String(selected.default_yearly_price)
        : '',
    );
  }, [selected]);

  useEffect(() => {
    if (!selected?.id) return;
    const n = nodes.find((x) => x.id === selected.id);
    if (n) setSelected(n);
    else setSelected(null);
  }, [nodes]);

  const classificationSelectOptions = useMemo(() => {
    const opts = (nodes || []).map((n) => ({
      id: n.id,
      label: classificationPath(nodesById, n.id),
    }));
    opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return opts;
  }, [nodes, nodesById]);

  const filteredRows = useMemo(() => {
    const rows = (ctx.assetTypePricing || []).filter((p) => {
      if (!pricingClsSupported) return false;
      if (!subtreeIds || !p.classification_node_id) return false;
      return subtreeIds.has(p.classification_node_id);
    });
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((p) => {
      const path = pricingClsSupported ? classificationPath(nodesById, p.classification_node_id).toLowerCase() : '';
      return (
        (p.product_code || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        path.includes(q)
      );
    });
  }, [ctx.assetTypePricing, subtreeIds, pricingClsSupported, search, nodesById]);

  const handleSaveCategory = async () => {
    if (!organization?.id || !selected?.id || tableMissing || !defaultPricingSupported) return;
    const nodeId = selected.id;
    setCategorySaving(true);
    setError(null);
    const m = parseFloat(categoryMonthly);
    const y = parseFloat(categoryYearly);
    try {
      const payload = {
        default_monthly_price: categoryMonthly.trim() === '' ? null : (Number.isFinite(m) ? m : null),
        default_yearly_price: categoryYearly.trim() === '' ? null : (Number.isFinite(y) ? y : null),
        updated_at: new Date().toISOString(),
      };
      const { error: err } = await supabase
        .from('asset_classification_nodes')
        .update(payload)
        .eq('id', nodeId)
        .eq('organization_id', organization.id);
      if (err) throw err;
      await loadNodes();
      const { data: fresh } = await supabase.from('asset_classification_nodes').select('*').eq('id', nodeId).single();
      if (fresh) setSelected(fresh);
      try {
        window.dispatchEvent(new Event('gas-cylinder-subscription-refresh'));
      } catch { /* ignore */ }
    } catch (err) {
      const msg = err.message || String(err);
      if (String(msg).includes('42703') || String(msg).includes('column')) {
        setError('Run sql/asset_classification_nodes_default_pricing.sql in Supabase to enable category default rates.');
      } else {
        setError(msg);
      }
    } finally {
      setCategorySaving(false);
    }
  };

  const openNewRow = () => {
    if (!pricingClsSupported) {
      setError('Run sql/asset_type_pricing_classification_node.sql so pricing rows can be tied to this tree.');
      return;
    }
    if (!selected?.id) {
      setError('Select a branch in the tree first.');
      return;
    }
    setError(null);
    setEditItem({
      product_code: '',
      category: '',
      description: '',
      monthly_price: '',
      yearly_price: '',
      is_active: true,
      classification_node_id: selected.id,
    });
    setEditOpen(true);
  };

  const openEditRow = (item) => {
    setEditItem({ ...item });
    setEditOpen(true);
  };

  const handleSaveRow = async () => {
    if (!organization?.id || !editItem?.product_code?.trim()) {
      setError('Product code is required.');
      return;
    }
    setRowSaving(true);
    setError(null);
    try {
      const payload = {
        organization_id: organization.id,
        product_code: editItem.product_code.trim(),
        category: editItem.category || null,
        description: editItem.description || null,
        monthly_price: parseFloat(editItem.monthly_price) || 0,
        yearly_price: parseFloat(editItem.yearly_price) || 0,
        is_active: editItem.is_active !== false,
        ...(pricingClsSupported ? { classification_node_id: editItem.classification_node_id || null } : {}),
      };
      if (editItem.id) {
        const { error: err } = await supabase.from('asset_type_pricing').update(payload).eq('id', editItem.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('asset_type_pricing').insert(payload);
        if (err) throw err;
      }
      setEditOpen(false);
      setEditItem(null);
      ctx.refreshSilent();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setRowSaving(false);
    }
  };

  const handleDeleteRow = async (id) => {
    if (!window.confirm('Delete this product pricing row?')) return;
    try {
      const { error: err } = await supabase.from('asset_type_pricing').delete().eq('id', id);
      if (err) throw err;
      setEditOpen(false);
      setEditItem(null);
      ctx.refreshSilent();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  if (!organization?.id) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Select an organization to set classification tree pricing.</Alert>
      </Box>
    );
  }

  if (ctx.loading && !(ctx.assetTypePricing || []).length) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading…</Typography>
      </Box>
    );
  }

  if (tableMissing) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Classification tree pricing</Typography>
        <Alert severity="warning">
          Run{' '}
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>sql/asset_classification_nodes.sql</Typography>
          {' '}in Supabase first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <AccountTreeIcon sx={{ color: primaryColor, fontSize: 36 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Classification tree pricing</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 760 }}>
              Same tree as{' '}
              <RouterLink to="/inventory/asset-classifications" style={{ color: primaryColor, fontWeight: 600 }}>
                Inventory → Asset Classifications
              </RouterLink>
              . Set default monthly/yearly for a branch, and SKU-level rates on <strong>asset_type_pricing</strong> rows linked under that branch. Customer overrides still win elsewhere.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Reload tree and pricing">
            <span>
              <IconButton onClick={() => { loadNodes(); ctx.refreshSilent(); }} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewRow} sx={{ textTransform: 'none', borderRadius: 2, bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.92 } }}>
            Add product rate
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {!pricingClsSupported && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Run{' '}
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>sql/asset_type_pricing_classification_node.sql</Typography>
          {' '}to link <strong>asset_type_pricing</strong> rows to classification nodes. Until then, the product table cannot be scoped by tree branch.
        </Alert>
      )}

      {!defaultPricingSupported && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Run{' '}
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>sql/asset_classification_nodes_default_pricing.sql</Typography>
          {' '}to save default monthly/yearly on each tree node from this page.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
        <Paper elevation={0} sx={{ flex: { md: '0 0 300px' }, maxWidth: { md: 380 }, width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>Tree</Typography>
          {nodesLoading ? <LinearProgress sx={{ my: 2 }} /> : null}
          {!nodesLoading && roots.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
              No classification tree yet. Build it under Asset Classifications, then return here.
            </Typography>
          ) : (
            <TreeBranch
              nodes={roots}
              childrenMap={childrenMap}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedId={selected?.id}
              onSelect={setSelected}
              depth={0}
            />
          )}
        </Paper>

        <Paper elevation={0} sx={{ flex: 1, minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
          {!selected ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 4 }}>
              Select a folder or product-code leaf to edit default branch rates and list SKU pricing under that branch.
            </Typography>
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Path</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{nodePath(nodesById, selected)}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Branch default rates</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Used when a product has no positive rate on its Asset Type Pricing row. Customer-specific overrides still apply first.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Monthly (per unit)"
                    size="small"
                    type="number"
                    value={categoryMonthly}
                    onChange={(e) => setCategoryMonthly(e.target.value)}
                    disabled={!defaultPricingSupported}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                  />
                  <TextField
                    label="Yearly (per unit)"
                    size="small"
                    type="number"
                    value={categoryYearly}
                    onChange={(e) => setCategoryYearly(e.target.value)}
                    disabled={!defaultPricingSupported}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                  />
                </Stack>
                <Button
                  size="small"
                  variant="contained"
                  disabled={categorySaving || !defaultPricingSupported}
                  onClick={handleSaveCategory}
                  sx={{ mt: 1, textTransform: 'none', bgcolor: primaryColor }}
                >
                  {categorySaving ? 'Saving…' : 'Save branch defaults'}
                </Button>
              </Box>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Product codes (this branch)</Typography>
              {!pricingClsSupported ? (
                <Typography variant="body2" color="text.secondary">Link pricing to the tree using the migration above.</Typography>
              ) : (
                <>
                  <PageSearchInput
                    placeholder="Search product code, description, path…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClear={() => setSearch('')}
                    className="max-w-md"
                  />
                  <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                          <TableCell>Product code</TableCell>
                          <TableCell>Linked as</TableCell>
                          <TableCell align="right">Monthly</TableCell>
                          <TableCell align="right">Yearly</TableCell>
                          <TableCell align="right" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No asset_type_pricing rows under this branch. Add one or assign codes from Asset Classifications.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRows.map((item) => (
                            <TableRow
                              key={item.id}
                              hover
                              onClick={() => openEditRow(item)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.product_code}</TableCell>
                              <TableCell sx={{ fontSize: '0.8125rem' }}>
                                {classificationPath(nodesById, item.classification_node_id) || '—'}
                              </TableCell>
                              <TableCell align="right">{formatCurrency(item.monthly_price)}</TableCell>
                              <TableCell align="right">{formatCurrency(item.yearly_price)}</TableCell>
                              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteRow(item.id)} sx={{ textTransform: 'none' }}>
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="caption" color="text.secondary">
                    Click a row to edit monthly/yearly and metadata. New rows default to the node you selected in the tree.
                  </Typography>
                </>
              )}
            </Stack>
          )}
        </Paper>
      </Stack>

      <Dialog open={editOpen} onClose={() => !rowSaving && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editItem?.id ? `Rates — ${editItem.product_code || ''}` : 'Add product rate'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              size="small"
              label="Product code"
              value={editItem?.product_code || ''}
              onChange={(e) => setEditItem((p) => ({ ...p, product_code: e.target.value }))}
              disabled={!!editItem?.id}
              fullWidth
            />
            <TextField size="small" label="Category" value={editItem?.category || ''} onChange={(e) => setEditItem((p) => ({ ...p, category: e.target.value }))} fullWidth />
            <TextField size="small" label="Description" value={editItem?.description || ''} onChange={(e) => setEditItem((p) => ({ ...p, description: e.target.value }))} fullWidth />
            {pricingClsSupported && (
              <FormControl fullWidth size="small">
                <InputLabel id="acp-edit-classification">Linked tree branch</InputLabel>
                <Select
                  labelId="acp-edit-classification"
                  label="Linked tree branch"
                  value={editItem?.classification_node_id || ''}
                  onChange={(e) => setEditItem((p) => ({
                    ...p,
                    classification_node_id: e.target.value || null,
                  }))}
                >
                  {classificationSelectOptions.map((o) => (
                    <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Stack direction="row" spacing={2}>
              <TextField size="small" label="Monthly" type="number" value={editItem?.monthly_price ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, monthly_price: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} fullWidth />
              <TextField size="small" label="Yearly" type="number" value={editItem?.yearly_price ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, yearly_price: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          {editItem?.id ? (
            <Button color="error" variant="outlined" startIcon={<DeleteIcon />} disabled={rowSaving} onClick={() => handleDeleteRow(editItem.id)} sx={{ textTransform: 'none', mr: 'auto' }}>
              Delete
            </Button>
          ) : (
            <Box sx={{ flex: '1 1 auto' }} />
          )}
          <Button onClick={() => !rowSaving && setEditOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRow} disabled={rowSaving} sx={{ textTransform: 'none', bgcolor: primaryColor }}>
            {rowSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
