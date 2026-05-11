import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Stack, Button, List, ListItemButton, ListItemText,
  Collapse, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, LinearProgress, Divider, Chip, Tooltip, Autocomplete,
  Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination,
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ExpandMore, ChevronRight, AccountTree as AccountTreeIcon,
  PlaylistAddCheck as PickAssetsIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useTheme, resolveAccentToHex } from '../context/ThemeContext';
import logger from '../utils/logger';

const filterCodeOptions = createFilterOptions({ limit: 300 });

/** Stop scanning bottles after this many rows when building the product-type list (counts may be partial beyond this). */
const MAX_BOTTLE_ROWS_FOR_TYPE_LIST = 50000;

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Escape % and _ for PostgREST ilike literal match. */
function escapeIlikePattern(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/** Distinct product_code values on bottles assigned to this classification node. */
async function fetchDistinctProductCodesForNode(organizationId, nodeId) {
  const codes = new Set();
  let from = 0;
  const BATCH = 2000;
  const MAX = 50000;
  let scanned = 0;
  while (scanned < MAX) {
    const { data, error } = await supabase
      .from('bottles')
      .select('product_code')
      .eq('organization_id', organizationId)
      .eq('classification_node_id', nodeId)
      .not('product_code', 'is', null)
      .range(from, from + BATCH - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      const c = String(r.product_code || '').trim();
      if (c) codes.add(c);
    }
    scanned += data.length;
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return [...codes];
}

/**
 * Point Asset Type Pricing rows at a classification node (mirrors bottle link for Classification pricing).
 */
async function syncAssetTypePricingClassificationForCodes({
  organizationId,
  nodeId,
  codes,
  enabled,
}) {
  if (!enabled || !nodeId || !organizationId) return;
  for (const code of codes) {
    const c = String(code || '').trim();
    if (!c) continue;
    let rowId = null;
    const { data: exactRow, error: exErr } = await supabase
      .from('asset_type_pricing')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('product_code', c)
      .maybeSingle();
    if (exErr) throw exErr;
    if (exactRow?.id) rowId = exactRow.id;
    if (!rowId) {
      const pat = escapeIlikePattern(c);
      const { data: ilRows, error: ilErr } = await supabase
        .from('asset_type_pricing')
        .select('id')
        .eq('organization_id', organizationId)
        .ilike('product_code', pat)
        .limit(1);
      if (ilErr) throw ilErr;
      rowId = ilRows?.[0]?.id ?? null;
    }
    const payload = {
      classification_node_id: nodeId,
      updated_at: new Date().toISOString(),
    };
    if (rowId) {
      const { error: upErr } = await supabase.from('asset_type_pricing').update(payload).eq('id', rowId);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await supabase.from('asset_type_pricing').insert({
        organization_id: organizationId,
        product_code: c,
        monthly_price: 0,
        yearly_price: 0,
        is_active: true,
        description: null,
        category: null,
        ...payload,
      });
      if (insErr) throw insErr;
    }
  }
}

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

/**
 * Unique product types (catalog codes): merge asset_type_pricing with bottles.product_code counts.
 * @returns {{ rows: Array<{ product_code: string, bottleCount: number, description: string, category: string, pricing_classification_node_id: string|null }>, partial: boolean }}
 */
async function buildProductTypeList(organizationId, includePricingClassification) {
  const byKey = new Map();

  const probe = await supabase.from('asset_type_pricing').select('id').eq('organization_id', organizationId).limit(1);
  if (probe.error?.code !== '42P01') {
    let usePricingCls = includePricingClassification;
    let pricingSelect = usePricingCls
      ? 'product_code, description, category, classification_node_id'
      : 'product_code, description, category';
    let { data: pricing, error: pe } = await supabase
      .from('asset_type_pricing')
      .select(pricingSelect)
      .eq('organization_id', organizationId);
    if (pe?.code === '42703' && usePricingCls) {
      usePricingCls = false;
      const second = await supabase
        .from('asset_type_pricing')
        .select('product_code, description, category')
        .eq('organization_id', organizationId);
      pricing = second.data;
      pe = second.error;
    }
    if (!pe && pricing) {
      for (const row of pricing) {
        const c = String(row.product_code || '').trim();
        if (!c) continue;
        const k = c.toLowerCase();
        byKey.set(k, {
          product_code: c,
          bottleCount: 0,
          description: String(row.description || '').trim(),
          category: String(row.category || '').trim(),
          pricing_classification_node_id: usePricingCls
            ? (row.classification_node_id || null)
            : null,
        });
      }
    }
  }

  let scanned = 0;
  let partial = false;
  let from = 0;
  const BATCH = 2000;
  while (scanned < MAX_BOTTLE_ROWS_FOR_TYPE_LIST) {
    const { data: rows, error } = await supabase
      .from('bottles')
      .select('product_code')
      .eq('organization_id', organizationId)
      .not('product_code', 'is', null)
      .range(from, from + BATCH - 1);
    if (error) throw error;
    if (!rows?.length) break;
    for (const r of rows) {
      const c = String(r.product_code || '').trim();
      if (!c) continue;
      const k = c.toLowerCase();
      if (!byKey.has(k)) {
        byKey.set(k, {
          product_code: c,
          bottleCount: 0,
          description: '',
          category: '',
          pricing_classification_node_id: null,
        });
      }
      const t = byKey.get(k);
      t.bottleCount += 1;
    }
    scanned += rows.length;
    if (rows.length < BATCH) break;
    from += BATCH;
  }
  if (scanned >= MAX_BOTTLE_ROWS_FOR_TYPE_LIST) partial = true;

  const rows = [...byKey.values()].sort((a, b) =>
    a.product_code.localeCompare(b.product_code, undefined, { sensitivity: 'base' }),
  );
  return { rows, partial };
}

/**
 * Collect distinct classification_node_id per product_code from bottles and asset_type_pricing.
 * @returns {Map<string, Set<string>>} lowercased product_code -> set of node ids
 */
async function fetchProductCodeClassificationAssignments(organizationId, includePricingClassification) {
  /** @type {Map<string, Set<string>>} */
  const m = new Map();
  const add = (code, nodeId) => {
    if (!nodeId) return;
    const k = String(code || '').trim().toLowerCase();
    if (!k) return;
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(nodeId);
  };

  let from = 0;
  const BATCH = 2000;
  const MAX = 50000;
  let scanned = 0;
  while (scanned < MAX) {
    const { data, error } = await supabase
      .from('bottles')
      .select('product_code, classification_node_id')
      .eq('organization_id', organizationId)
      .not('product_code', 'is', null)
      .not('classification_node_id', 'is', null)
      .range(from, from + BATCH - 1);
    if (error) {
      if (error.code === '42703') return m;
      throw error;
    }
    if (!data?.length) break;
    for (const r of data) {
      add(r.product_code, r.classification_node_id);
    }
    scanned += data.length;
    if (data.length < BATCH) break;
    from += BATCH;
  }

  const probe = await supabase.from('asset_type_pricing').select('id').eq('organization_id', organizationId).limit(1);
  if (probe.error?.code !== '42P01' && includePricingClassification) {
    let useCls = true;
    let sel = 'product_code, classification_node_id';
    let { data: pricing, error: pe } = await supabase
      .from('asset_type_pricing')
      .select(sel)
      .eq('organization_id', organizationId);
    if (pe?.code === '42703') {
      useCls = false;
      pricing = null;
    }
    if (useCls && !pe && pricing) {
      for (const row of pricing) {
        add(row.product_code, row.classification_node_id);
      }
    }
  }

  return m;
}

/** @param {Map<string, Set<string>>} assignMap */
function applyAssignmentFieldsToRows(rows, assignMap) {
  return rows.map((r) => {
    const ent = assignMap.get(r.product_code.toLowerCase());
    if (!ent || ent.ids.size === 0) {
      return { ...r, assignment_conflict: false, assignment_canonical_node_id: null };
    }
    const conflict = ent.ids.size > 1;
    const canonical = conflict ? null : [...ent.ids][0];
    return { ...r, assignment_conflict: conflict, assignment_canonical_node_id: canonical };
  });
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

export default function AssetClassifications() {
  const { organization } = useAuth();
  const { accent } = useTheme();
  const primaryColor = resolveAccentToHex(accent);

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [bottleLinkSupported, setBottleLinkSupported] = useState(true);
  /** DB has asset_type_pricing.classification_node_id (run sql/asset_type_pricing_classification_node.sql). */
  const [pricingClassificationSupported, setPricingClassificationSupported] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add_root');
  const [dialogParent, setDialogParent] = useState(null);
  const [dialogEditNode, setDialogEditNode] = useState(null);
  const [dialogName, setDialogName] = useState('');
  const [saving, setSaving] = useState(false);
  const [matchBusy, setMatchBusy] = useState(false);
  const [matchInfo, setMatchInfo] = useState(null);

  const [inventoryProductCodes, setInventoryProductCodes] = useState([]);
  const [inventoryCodesLoading, setInventoryCodesLoading] = useState(false);

  const [pickAssetsOpen, setPickAssetsOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerDebounced, setPickerDebounced] = useState('');
  /** Aggregated product types (one row per product_code) */
  const [productTypeRows, setProductTypeRows] = useState([]);
  const [productTypesLoading, setProductTypesLoading] = useState(false);
  const [productTypesPartial, setProductTypesPartial] = useState(false);
  const [pickerPage, setPickerPage] = useState(0);
  const [pickerRowsPerPage, setPickerRowsPerPage] = useState(25);
  /** Selected product_code strings (canonical casing from list) */
  const [pickerSelectedCodes, setPickerSelectedCodes] = useState(() => new Set());
  const [pickerLinkBusy, setPickerLinkBusy] = useState(false);
  /** Anchor row index on current page for shift+click range select */
  const pickerAnchorIndex = useRef(null);
  /** Leaf node id when "Edit details…" was opened — save uses this so tree clicks mid-save do not retarget. */
  const editTargetNodeIdRef = useRef(null);

  const [editProductTypesOpen, setEditProductTypesOpen] = useState(false);
  const [editTypesDescription, setEditTypesDescription] = useState('');
  const [editTypesCategory, setEditTypesCategory] = useState('');
  const [editTypesSaving, setEditTypesSaving] = useState(false);
  const [editTypesBanner, setEditTypesBanner] = useState(null);

  /** Product codes on bottles currently linked to the selected leaf (for summary + picker preselect). */
  const [leafLinkedCodes, setLeafLinkedCodes] = useState([]);

  /** Default rental rates for the selected tree node (applies to all bottles under this branch when no SKU-specific price). */
  const [categoryMonthly, setCategoryMonthly] = useState('');
  const [categoryYearly, setCategoryYearly] = useState('');
  const [categoryPricingSaving, setCategoryPricingSaving] = useState(false);

  const loadNodes = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    setTableMissing(false);
    let r = await supabase
      .from('asset_classification_nodes')
      .select('id, organization_id, parent_id, name, sort_order, default_monthly_price, default_yearly_price, created_at, updated_at')
      .eq('organization_id', organization.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (r.error?.code === '42703') {
      r = await supabase
        .from('asset_classification_nodes')
        .select('id, organization_id, parent_id, name, sort_order, created_at, updated_at')
        .eq('organization_id', organization.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
    }
    const { data, error: err } = r;
    if (err) {
      if (err.code === '42P01') {
        setTableMissing(true);
        setNodes([]);
      } else {
        setError(err.message);
        logger.error('asset_classification_nodes load', err);
      }
      setLoading(false);
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
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { error: err } = await supabase.from('bottles').select('classification_node_id').limit(1);
      if (!cancelled && err?.code === '42703') setBottleLinkSupported(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { error: err } = await supabase.from('asset_type_pricing').select('classification_node_id').limit(1);
      if (!cancelled && err?.code === '42703') setPricingClassificationSupported(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPickerDebounced(pickerSearch), 350);
    return () => clearTimeout(t);
  }, [pickerSearch]);

  useEffect(() => {
    pickerAnchorIndex.current = null;
  }, [pickerPage, pickerDebounced, pickerRowsPerPage]);

  const reloadProductTypes = useCallback(async () => {
    if (!organization?.id) return;
    setProductTypesLoading(true);
    setError(null);
    try {
      const { rows, partial } = await buildProductTypeList(
        organization.id,
        pricingClassificationSupported,
      );
      let enriched = rows;
      if (bottleLinkSupported) {
        const assignMap = await fetchProductCodeClassificationAssignments(
          organization.id,
          pricingClassificationSupported,
        );
        enriched = applyAssignmentFieldsToRows(rows, assignMap);
      } else {
        enriched = rows.map((r) => ({
          ...r,
          assignment_conflict: false,
          assignment_canonical_node_id: null,
        }));
      }
      setProductTypeRows(enriched);
      setProductTypesPartial(partial);
    } catch (err) {
      logger.error('buildProductTypeList', err);
      setError(err.message || String(err));
      setProductTypeRows([]);
      setProductTypesPartial(false);
    } finally {
      setProductTypesLoading(false);
    }
  }, [organization?.id, pricingClassificationSupported, bottleLinkSupported]);

  useEffect(() => {
    if (!pickAssetsOpen || !organization?.id) return undefined;
    reloadProductTypes();
    return undefined;
  }, [pickAssetsOpen, organization?.id, reloadProductTypes]);

  useEffect(() => {
    if (!dialogOpen || dialogMode === 'rename' || !organization?.id) return undefined;
    let active = true;
    setInventoryCodesLoading(true);
    (async () => {
      const { data, error: err } = await supabase
        .from('bottles')
        .select('product_code')
        .eq('organization_id', organization.id)
        .not('product_code', 'is', null);
      if (!active) return;
      if (err) {
        logger.error('load product codes for classification dialog', err);
        setInventoryProductCodes([]);
      } else {
        const u = [...new Set((data || []).map((r) => String(r.product_code || '').trim()).filter(Boolean))];
        u.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        setInventoryProductCodes(u);
      }
      setInventoryCodesLoading(false);
    })();
    return () => { active = false; };
  }, [dialogOpen, dialogMode, organization?.id]);

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const roots = useMemo(() => childrenMap.get('ROOT') || [], [childrenMap]);

  const selectedHasChildren = selected
    ? (childrenMap.get(selected.id) || []).length > 0
    : false;

  const loadLeafLinkedCodes = useCallback(async () => {
    if (!organization?.id || !selected?.id || selectedHasChildren || !bottleLinkSupported) {
      setLeafLinkedCodes([]);
      return;
    }
    try {
      const codes = await fetchDistinctProductCodesForNode(organization.id, selected.id);
      codes.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      setLeafLinkedCodes(codes);
    } catch (err) {
      logger.error('loadLeafLinkedCodes', err);
      setLeafLinkedCodes([]);
    }
  }, [organization?.id, selected?.id, selectedHasChildren, bottleLinkSupported]);

  useEffect(() => {
    loadLeafLinkedCodes();
  }, [loadLeafLinkedCodes]);

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

  const pickerFiltered = useMemo(() => {
    const q = pickerDebounced.trim().toLowerCase();
    if (!q) return productTypeRows;
    return productTypeRows.filter((r) => {
      const pricingNode = r.pricing_classification_node_id
        ? nodesById.get(r.pricing_classification_node_id)
        : null;
      const pricingPath = pricingNode ? nodePath(nodesById, pricingNode).toLowerCase() : '';
      let assignPath = '';
      if (r.assignment_conflict) assignPath = 'conflict';
      else if (r.assignment_canonical_node_id) {
        const an = nodesById.get(r.assignment_canonical_node_id);
        assignPath = an ? nodePath(nodesById, an).toLowerCase() : '';
      }
      const blob = [r.product_code, r.description, r.category, String(r.bottleCount), pricingPath, assignPath]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [productTypeRows, pickerDebounced, nodesById]);

  const pickerCount = pickerFiltered.length;
  const pickerPageRows = useMemo(() => {
    const from = pickerPage * pickerRowsPerPage;
    return pickerFiltered.slice(from, from + pickerRowsPerPage);
  }, [pickerFiltered, pickerPage, pickerRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(pickerCount / pickerRowsPerPage) - 1);
    if (pickerPage > maxPage) setPickerPage(maxPage);
  }, [pickerCount, pickerRowsPerPage, pickerPage]);

  const productTypeRowByCode = useMemo(
    () => new Map(productTypeRows.map((r) => [r.product_code.toLowerCase(), r])),
    [productTypeRows],
  );

  const toggleExpand = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openAddRoot = () => {
    setDialogMode('add_root');
    setDialogParent(null);
    setDialogEditNode(null);
    setDialogName('');
    setDialogOpen(true);
  };

  const openAddChild = (parent) => {
    setDialogMode('add_child');
    setDialogParent(parent);
    setDialogEditNode(null);
    setDialogName('');
    setDialogOpen(true);
  };

  const openRename = (node) => {
    setDialogMode('rename');
    setDialogParent(null);
    setDialogEditNode(node);
    setDialogName(node.name || '');
    setDialogOpen(true);
  };

  const handleSaveDialog = async () => {
    const name = dialogName.trim();
    if (!name) {
      setError('Name is required.');
      return;
    }
    if (!organization?.id) return;
    setSaving(true);
    setError(null);
    try {
      if (dialogMode === 'rename' && dialogEditNode) {
        const { error: err } = await supabase
          .from('asset_classification_nodes')
          .update({ name, updated_at: new Date().toISOString() })
          .eq('id', dialogEditNode.id)
          .eq('organization_id', organization.id);
        if (err) throw err;
      } else {
        const parentId = dialogMode === 'add_child' && dialogParent ? dialogParent.id : null;
        const siblings = nodes.filter((n) => (n.parent_id || null) === (parentId || null));
        const maxOrder = siblings.reduce((m, n) => Math.max(m, n.sort_order || 0), -1);
        const { error: err } = await supabase.from('asset_classification_nodes').insert({
          organization_id: organization.id,
          parent_id: parentId,
          name,
          sort_order: maxOrder + 1,
        });
        if (err) throw err;
      }
      setDialogOpen(false);
      await loadNodes();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (node) => {
    const kids = childrenMap.get(node.id) || [];
    const msg = kids.length
      ? `Delete “${node.name}” and ${kids.length} nested item(s)? This cannot be undone.`
      : `Delete “${node.name}”?`;
    if (!window.confirm(msg)) return;
    setError(null);
    try {
      const { error: err } = await supabase
        .from('asset_classification_nodes')
        .delete()
        .eq('id', node.id)
        .eq('organization_id', organization.id);
      if (err) throw err;
      if (selected?.id === node.id) setSelected(null);
      await loadNodes();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const openPickAssets = async () => {
    setPickerSearch('');
    setPickerDebounced('');
    setPickerPage(0);
    setPickerSelectedCodes(new Set());
    pickerAnchorIndex.current = null;
    setProductTypeRows([]);
    setProductTypesPartial(false);
    setEditProductTypesOpen(false);
    setEditTypesBanner(null);
    setPickAssetsOpen(true);

    if (selected?.id && bottleLinkSupported && organization?.id) {
      try {
        const codes = await fetchDistinctProductCodesForNode(organization.id, selected.id);
        setPickerSelectedCodes(new Set(codes));
      } catch (err) {
        logger.error('openPickAssets preselect', err);
      }
    }
  };

  const closePickAssets = () => {
    setPickAssetsOpen(false);
    setPickerSelectedCodes(new Set());
    setEditProductTypesOpen(false);
    setEditTypesBanner(null);
  };

  const togglePickerRow = (productCode, index, event) => {
    const shiftKey = !!(event && (event.shiftKey === true || event.nativeEvent?.shiftKey));
    setPickerSelectedCodes((prev) => {
      if (
        shiftKey
        && pickerAnchorIndex.current !== null
        && pickerAnchorIndex.current >= 0
        && pickerPageRows.length > 0
      ) {
        const next = new Set();
        const a = Math.min(pickerAnchorIndex.current, index);
        const b = Math.max(pickerAnchorIndex.current, index);
        for (let i = a; i <= b; i += 1) {
          const code = pickerPageRows[i]?.product_code;
          if (code) next.add(code);
        }
        return next;
      }
      const next = new Set(prev);
      if (next.has(productCode)) next.delete(productCode);
      else next.add(productCode);
      return next;
    });
    if (!shiftKey) {
      pickerAnchorIndex.current = index;
    }
  };

  const togglePickerPageAll = () => {
    const pageCodes = pickerPageRows.map((r) => r.product_code);
    const allSelected = pageCodes.length > 0 && pageCodes.every((c) => pickerSelectedCodes.has(c));
    setPickerSelectedCodes((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageCodes.forEach((c) => next.delete(c));
      } else {
        pageCodes.forEach((c) => next.add(c));
      }
      return next;
    });
  };

  const selectAllFilteredTypes = useCallback(() => {
    setPickerSelectedCodes(new Set(pickerFiltered.map((r) => r.product_code)));
    pickerAnchorIndex.current = null;
  }, [pickerFiltered]);

  const clearPickerSelection = useCallback(() => {
    setPickerSelectedCodes(new Set());
    pickerAnchorIndex.current = null;
  }, []);

  const openEditProductTypes = useCallback(async () => {
    if (pickerSelectedCodes.size === 0) return;
    editTargetNodeIdRef.current = selected?.id || null;
    setEditTypesBanner(null);
    const probe = await supabase.from('asset_type_pricing').select('id').limit(1);
    if (probe.error?.code === '42P01') {
      setError('Asset Type Pricing table is not available in this database. Description and category can only be edited where asset_type_pricing exists.');
      return;
    }
    const codes = [...pickerSelectedCodes];
    const meta = productTypeRows.filter((r) => codes.includes(r.product_code));
    if (codes.length === 1 && meta.length === 1) {
      setEditTypesDescription(meta[0].description || '');
      setEditTypesCategory(meta[0].category || '');
    } else {
      setEditTypesDescription('');
      setEditTypesCategory('');
    }
    setEditProductTypesOpen(true);
  }, [pickerSelectedCodes, productTypeRows, productTypeRowByCode, selected?.id]);

  const handleSaveEditProductTypes = async () => {
    if (!organization?.id || pickerSelectedCodes.size === 0) return;
    setEditTypesSaving(true);
    setEditTypesBanner(null);
    setError(null);
    const desc = editTypesDescription.trim();
    const cat = editTypesCategory.trim();
    try {
      for (const code of pickerSelectedCodes) {
        const r = productTypeRowByCode.get(String(code).trim().toLowerCase());
        if (r?.assignment_conflict) {
          throw new Error(`“${code}” has conflicting classifications (bottles vs pricing). Fix that before saving.`);
        }
      }
      for (const code of pickerSelectedCodes) {
        const c = String(code || '').trim();
        if (!c) continue;
        let rowId = null;
        const { data: exactRow, error: exErr } = await supabase
          .from('asset_type_pricing')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('product_code', c)
          .maybeSingle();
        if (exErr) throw exErr;
        if (exactRow?.id) rowId = exactRow.id;
        if (!rowId) {
          const pat = escapeIlikePattern(c);
          const { data: ilRows, error: ilErr } = await supabase
            .from('asset_type_pricing')
            .select('id')
            .eq('organization_id', organization.id)
            .ilike('product_code', pat)
            .limit(1);
          if (ilErr) throw ilErr;
          rowId = ilRows?.[0]?.id ?? null;
        }
        const nodeForPricing = editTargetNodeIdRef.current;
        const payload = {
          description: desc || null,
          category: cat || null,
          updated_at: new Date().toISOString(),
        };
        if (pricingClassificationSupported && nodeForPricing) {
          payload.classification_node_id = nodeForPricing;
        }
        if (rowId) {
          const { error: upErr } = await supabase.from('asset_type_pricing').update(payload).eq('id', rowId);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from('asset_type_pricing').insert({
            organization_id: organization.id,
            product_code: c,
            monthly_price: 0,
            yearly_price: 0,
            is_active: true,
            ...payload,
          });
          if (insErr) throw insErr;
        }
      }
      setEditTypesBanner({
        severity: 'success',
        message: pricingClassificationSupported && editTargetNodeIdRef.current
          ? `Saved details and pricing classification for ${pickerSelectedCodes.size} product type(s).`
          : `Saved description/category for ${pickerSelectedCodes.size} product type(s).`,
      });
      await reloadProductTypes();
    } catch (err) {
      setEditTypesBanner({ severity: 'error', message: err.message || String(err) });
    } finally {
      setEditTypesSaving(false);
    }
  };

  const handleLinkPickerSelection = async (node) => {
    const codes = [...pickerSelectedCodes];
    if (!organization?.id || !bottleLinkSupported || codes.length === 0) return;
    setPickerLinkBusy(true);
    setError(null);
    const conflicts = [];
    const reassign = [];
    for (const code of codes) {
      const row = productTypeRowByCode.get(String(code).trim().toLowerCase());
      if (row?.assignment_conflict) conflicts.push(code);
      else if (row?.assignment_canonical_node_id && row.assignment_canonical_node_id !== node.id) {
        reassign.push(code);
      }
    }
    if (conflicts.length) {
      const sample = conflicts.slice(0, 10).join(', ');
      setError(
        `These product types have conflicting classifications (bottles vs pricing disagree). Fix them before linking: ${sample}${conflicts.length > 10 ? ' …' : ''}`,
      );
      setPickerLinkBusy(false);
      return;
    }
    if (reassign.length) {
      const sample = reassign.slice(0, 8).join(', ');
      const ok = window.confirm(
        `${reassign.length} product type(s) are already assigned to another classification (${sample}${reassign.length > 8 ? ' …' : ''}). Linking will move every matching bottle and the pricing row to this leaf only. Continue?`,
      );
      if (!ok) {
        setPickerLinkBusy(false);
        return;
      }
    }
    let totalUpdated = 0;
    try {
      for (const code of codes) {
        const pattern = escapeIlikePattern(code.trim());
        const { data: hits, error: qErr } = await supabase
          .from('bottles')
          .select('id')
          .eq('organization_id', organization.id)
          .ilike('product_code', pattern);
        if (qErr) throw qErr;
        const ids = (hits || []).map((r) => r.id).filter(Boolean);
        for (const part of chunkArray(ids, 200)) {
          const { error: uErr } = await supabase
            .from('bottles')
            .update({ classification_node_id: node.id, updated_at: new Date().toISOString() })
            .in('id', part)
            .eq('organization_id', organization.id);
          if (uErr) throw uErr;
        }
        totalUpdated += ids.length;
      }
      try {
        await syncAssetTypePricingClassificationForCodes({
          organizationId: organization.id,
          nodeId: node.id,
          codes,
          enabled: pricingClassificationSupported,
        });
      } catch (syncErr) {
        logger.error('syncAssetTypePricingClassificationForCodes', syncErr);
        setError(
          `Bottles were linked, but updating Asset Type Pricing classification failed: ${syncErr.message || String(syncErr)}`,
        );
      }
      setMatchInfo(
        `Linked ${totalUpdated} bottle(s) across ${codes.length} product type(s) to this classification.`,
      );
      await loadLeafLinkedCodes();
      closePickAssets();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setPickerLinkBusy(false);
    }
  };

  const handleMatchBottles = async (node) => {
    if (!organization?.id || !bottleLinkSupported) return;
    const nm = node.name.trim();
    if (!nm) return;
    setMatchBusy(true);
    setMatchInfo(null);
    setError(null);
    const row = productTypeRowByCode.get(nm.toLowerCase());
    if (row?.assignment_conflict) {
      setError('This product code has conflicting classifications (bottles vs pricing). Fix that before using Link by product code.');
      setMatchBusy(false);
      return;
    }
    if (row?.assignment_canonical_node_id && row.assignment_canonical_node_id !== node.id) {
      const oldNode = nodesById.get(row.assignment_canonical_node_id);
      const oldPath = oldNode ? nodePath(nodesById, oldNode) : 'another classification';
      const ok = window.confirm(
        `This type is already classified under “${oldPath}”. Move all bottles whose product_code matches “${nm}” to this leaf only?`,
      );
      if (!ok) {
        setMatchBusy(false);
        return;
      }
    }
    try {
      const pattern = escapeIlikePattern(nm);
      const { data: rows, error: qErr } = await supabase
        .from('bottles')
        .select('id')
        .eq('organization_id', organization.id)
        .ilike('product_code', pattern);
      if (qErr) throw qErr;
      const ids = (rows || []).map((r) => r.id);
      if (ids.length === 0) {
        setMatchInfo('No bottles found with a matching product_code for this name.');
        setMatchBusy(false);
        return;
      }
      const { error: uErr } = await supabase
        .from('bottles')
        .update({ classification_node_id: node.id, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (uErr) throw uErr;
      try {
        await syncAssetTypePricingClassificationForCodes({
          organizationId: organization.id,
          nodeId: node.id,
          codes: [nm],
          enabled: pricingClassificationSupported,
        });
      } catch (syncErr) {
        logger.error('syncAssetTypePricingClassificationForCodes', syncErr);
        setError(
          `Bottles were linked, but updating Asset Type Pricing classification failed: ${syncErr.message || String(syncErr)}`,
        );
      }
      setMatchInfo(`Linked ${ids.length} bottle(s) where product_code matches “${nm}” (case-insensitive).`);
      await loadLeafLinkedCodes();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setMatchBusy(false);
    }
  };

  useEffect(() => {
    setMatchInfo(null);
  }, [selected?.id]);

  const handleSaveCategoryPricing = async () => {
    if (!organization?.id || !selected?.id || tableMissing) return;
    const nodeId = selected.id;
    setCategoryPricingSaving(true);
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
      const { data: fresh, error: fErr } = await supabase
        .from('asset_classification_nodes')
        .select('*')
        .eq('id', nodeId)
        .single();
      if (!fErr && fresh) setSelected(fresh);
      try {
        window.dispatchEvent(new Event('gas-cylinder-subscription-refresh'));
      } catch {
        /* ignore */
      }
    } catch (err) {
      const msg = err.message || String(err);
      if (String(msg).includes('42703') || String(msg).includes('column')) {
        setError('Run sql/asset_classification_nodes_default_pricing.sql in Supabase to enable category default rates.');
      } else {
        setError(msg);
      }
    } finally {
      setCategoryPricingSaving(false);
    }
  };

  if (!organization?.id) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Select an organization to manage asset classifications.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading classifications…</Typography>
      </Box>
    );
  }

  if (tableMissing) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Asset Classifications</Typography>
        <Alert severity="warning">
          The database table is not installed yet. Run the migration in the Supabase SQL editor:
          {' '}
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
            sql/asset_classification_nodes.sql
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <AccountTreeIcon sx={{ color: primaryColor, fontSize: 36 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Asset Classifications</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720 }}>
              Build a tree like TrackAbout: groups and families, then product codes as leaves. Linking is by product type (catalog code): pick one or more codes and every bottle with that product_code is classified—not individual serials.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            component={RouterLink}
            to="/inventory/asset-classifications/pricing"
            variant="outlined"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Tree pricing
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddRoot}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.92 } }}
          >
            Add root folder
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
        <Paper elevation={0} sx={{ flex: 1, minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
            Tree
          </Typography>
          {roots.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 4 }}>
              No folders yet. Add a root (for example INDUSTRIAL CYLINDERS), then add children and product codes under it.
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

        <Paper elevation={0} sx={{ flex: 1, minWidth: 0, maxWidth: { md: 420 }, border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
            Selection
          </Typography>
          {!selected ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Click a row in the tree to add children, rename, delete, or link bottles.</Typography>
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Path</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{nodePath(nodesById, selected)}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Default org pricing for this category
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Applies across subscriptions and billing for bottles under this branch when there is no positive rate on the product’s Asset Type Pricing row. Customer-specific pricing overrides still take precedence.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Monthly (per unit)"
                    size="small"
                    type="number"
                    value={categoryMonthly}
                    onChange={(e) => setCategoryMonthly(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                  />
                  <TextField
                    label="Yearly (per unit)"
                    size="small"
                    type="number"
                    value={categoryYearly}
                    onChange={(e) => setCategoryYearly(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                  />
                </Stack>
                <Button
                  size="small"
                  variant="contained"
                  disabled={categoryPricingSaving}
                  onClick={handleSaveCategoryPricing}
                  sx={{ mt: 1, textTransform: 'none', bgcolor: primaryColor }}
                >
                  {categoryPricingSaving ? 'Saving…' : 'Save category rates'}
                </Button>
              </Box>
              <Divider />
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openAddChild(selected)} sx={{ textTransform: 'none' }}>
                  Add under here
                </Button>
                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openRename(selected)} sx={{ textTransform: 'none' }}>
                  Rename
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(selected)} sx={{ textTransform: 'none' }}>
                  Delete
                </Button>
              </Stack>
              {!selectedHasChildren && bottleLinkSupported && (
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Choose product types (catalog codes). All bottles with those codes get this classification. The picker pre-selects types already linked here; use Edit details… to set description, category, and the Asset Type Pricing row for this leaf. Or match only the leaf name in one step.
                  </Typography>
                  {leafLinkedCodes.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Linked here ({leafLinkedCodes.length} type{leafLinkedCodes.length === 1 ? '' : 's'})
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5, maxHeight: 112, overflow: 'auto' }}>
                        {leafLinkedCodes.slice(0, 48).map((code) => (
                          <Chip
                            key={code}
                            label={code}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', fontSize: '0.68rem', height: 22 }}
                          />
                        ))}
                        {leafLinkedCodes.length > 48 && (
                          <Chip
                            label={`+${leafLinkedCodes.length - 48} more`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22 }}
                          />
                        )}
                      </Stack>
                    </Box>
                  )}
                  {!pricingClassificationSupported && (
                    <Alert severity="info" sx={{ mb: 1 }}>
                      Run{' '}
                      <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
                        sql/asset_type_pricing_classification_node.sql
                      </Typography>
                      {' '}to sync pricing rows with this tree from here.
                    </Alert>
                  )}
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PickAssetsIcon />}
                      onClick={openPickAssets}
                      sx={{ textTransform: 'none' }}
                    >
                      Pick product types
                    </Button>
                    <Tooltip title="All bottles whose product_code equals this leaf name (case-insensitive)">
                      <span>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={matchBusy}
                          onClick={() => handleMatchBottles(selected)}
                          sx={{ textTransform: 'none', bgcolor: primaryColor }}
                        >
                          {matchBusy ? 'Linking…' : 'Link by product code'}
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                  {matchInfo && (
                    <Alert severity="info" sx={{ mt: 1.5 }}>{matchInfo}</Alert>
                  )}
                </Box>
              )}
              {!bottleLinkSupported && (
                <Alert severity="warning">
                  Run the migration to add bottles.classification_node_id to enable linking from the tree to inventory.
                </Alert>
              )}
            </Stack>
          )}
        </Paper>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialogMode === 'rename' ? 'Rename' : dialogMode === 'add_child' ? `Add under “${dialogParent?.name}”` : 'Add root folder'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'rename' ? (
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              value={dialogName}
              onChange={(e) => setDialogName(e.target.value)}
              size="small"
              sx={{ mt: 1 }}
            />
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Autocomplete
                freeSolo
                loading={inventoryCodesLoading}
                options={inventoryProductCodes}
                filterOptions={filterCodeOptions}
                value={dialogName}
                inputValue={dialogName}
                onInputChange={(_, value) => setDialogName(value ?? '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    label="Folder name or product code"
                    placeholder={dialogMode === 'add_child' ? 'Type or pick from inventory…' : 'e.g. INDUSTRIAL CYLINDERS'}
                    size="small"
                    helperText="Choose a value from the list to use an existing product_code from your bottles, or type a new folder or code."
                  />
                )}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveDialog} disabled={saving} sx={{ textTransform: 'none', bgcolor: primaryColor }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pickAssetsOpen}
        onClose={() => !pickerLinkBusy && closePickAssets()}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: 'min(920px, calc(100vh - 32px))',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, flexShrink: 0 }}>
          Product types for “{selected?.name}”
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            pt: 2,
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {productTypesPartial && (
            <Alert severity="warning" sx={{ mb: 2, flexShrink: 0 }}>
              Bottle list was scanned up to {MAX_BOTTLE_ROWS_FOR_TYPE_LIST.toLocaleString()} rows; some rare codes might be missing from this table until you refine data or we add a server-side distinct query.
            </Alert>
          )}
          <TextField
            fullWidth
            size="small"
            label="Search product code, description, category, pricing path, or count"
            value={pickerSearch}
            onChange={(e) => {
              setPickerSearch(e.target.value);
              setPickerPage(0);
            }}
            sx={{ mb: 1, flexShrink: 0 }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 2, flexShrink: 0 }} flexWrap="wrap">
            <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1, minWidth: 200 }}>
              One product code can belong to only one classification at a time (bottles + pricing combined). If a type is already elsewhere, linking here asks to move it. Rows linked to this leaf are pre-selected.
            </Typography>
            <Stack direction="row" flexWrap="wrap" sx={{ flexShrink: 0, gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                disabled={pickerCount === 0}
                onClick={selectAllFilteredTypes}
                sx={{ textTransform: 'none' }}
              >
                Select all matching types
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={pickerSelectedCodes.size === 0}
                onClick={clearPickerSelection}
                sx={{ textTransform: 'none' }}
              >
                Clear selection
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                disabled={pickerSelectedCodes.size === 0}
                onClick={openEditProductTypes}
                sx={{ textTransform: 'none' }}
              >
                Edit details…
              </Button>
            </Stack>
          </Stack>
          <TableContainer
            sx={{
              flex: '1 1 auto',
              minHeight: 0,
              maxHeight: { xs: '45vh', sm: '52vh' },
              overflow: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        pickerPageRows.some((r) => pickerSelectedCodes.has(r.product_code))
                        && !pickerPageRows.every((r) => pickerSelectedCodes.has(r.product_code))
                      }
                      checked={
                        pickerPageRows.length > 0 && pickerPageRows.every((r) => pickerSelectedCodes.has(r.product_code))
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePickerPageAll();
                      }}
                    />
                  </TableCell>
                  <TableCell>Product code</TableCell>
                  <TableCell align="right">Bottles</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Pricing category</TableCell>
                  <TableCell>Pricing classification</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Assigned (tree)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productTypesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <LinearProgress sx={{ maxWidth: 360, mx: 'auto' }} />
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                        Building product type list from pricing and inventory…
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : pickerPageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {productTypeRows.length === 0
                        ? 'No product codes found. Add bottles or Asset Type Pricing rows with product codes first.'
                        : 'No product types match this search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pickerPageRows.map((row, idx) => {
                    const elsewhere = !!(selected?.id && row.assignment_canonical_node_id
                      && row.assignment_canonical_node_id !== selected.id);
                    const conflict = !!row.assignment_conflict;
                    const assignNode = row.assignment_canonical_node_id
                      ? nodesById.get(row.assignment_canonical_node_id)
                      : null;
                    const assignPath = assignNode ? nodePath(nodesById, assignNode) : '';
                    const tip = conflict
                      ? 'Bottles and/or pricing disagree on which leaf this code uses. Fix before linking.'
                      : (elsewhere
                        ? `Already assigned under “${assignPath}”. Link will ask to move all bottles and pricing to this leaf.`
                        : '');
                    const rowSx = {
                      cursor: 'pointer',
                      ...(conflict ? { bgcolor: 'warning.light', opacity: 0.92 } : {}),
                      ...(!conflict && elsewhere ? { bgcolor: 'rgba(245, 124, 0, 0.1)' } : {}),
                    };
                    return (
                      <TableRow
                        key={row.product_code}
                        hover
                        selected={pickerSelectedCodes.has(row.product_code)}
                        onClick={(e) => togglePickerRow(row.product_code, idx, e)}
                        sx={rowSx}
                        title={tip || undefined}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={pickerSelectedCodes.has(row.product_code)}
                            tabIndex={-1}
                            inputProps={{ 'aria-label': `Select type ${row.product_code}` }}
                            sx={{ pointerEvents: 'none', p: 0.25 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.product_code}</TableCell>
                        <TableCell align="right">{row.bottleCount}</TableCell>
                        <TableCell>{row.description || '—'}</TableCell>
                        <TableCell>{row.category || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 220, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {(() => {
                            const id = row.pricing_classification_node_id;
                            if (!id || !pricingClassificationSupported) return '—';
                            const n = nodesById.get(id);
                            return n ? nodePath(nodesById, n) : '—';
                          })()}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {conflict ? (
                            <Chip
                              icon={<WarningIcon sx={{ '&&': { fontSize: 16 } }} />}
                              label="Conflict"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 24 }}
                            />
                          ) : assignPath ? (
                            assignPath
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', mt: 0.5 }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            count={pickerCount}
            rowsPerPage={pickerRowsPerPage}
            page={pickerPage}
            onPageChange={(_, p) => setPickerPage(p)}
            onRowsPerPageChange={(e) => {
              setPickerRowsPerPage(parseInt(e.target.value, 10));
              setPickerPage(0);
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexShrink: 0, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary', mr: 'auto' }}>
            {pickerSelectedCodes.size} product type{pickerSelectedCodes.size === 1 ? '' : 's'} selected
          </Typography>
          <Button onClick={closePickAssets} disabled={pickerLinkBusy} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={pickerLinkBusy || pickerSelectedCodes.size === 0 || !selected}
            onClick={() => handleLinkPickerSelection(selected)}
            sx={{ textTransform: 'none', bgcolor: primaryColor }}
          >
            {pickerLinkBusy ? 'Linking…' : `Link bottles for ${pickerSelectedCodes.size} type(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editProductTypesOpen}
        onClose={() => !editTypesSaving && setEditProductTypesOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit product types</DialogTitle>
        <DialogContent>
          {editTypesBanner && (
            <Alert severity={editTypesBanner.severity} sx={{ mb: 2 }} onClose={() => setEditTypesBanner(null)}>
              {editTypesBanner.message}
            </Alert>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {`Updates ${pickerSelectedCodes.size} selected code(s) in Asset Type Pricing. `}
            Empty fields clear description or category. If a code has no pricing row yet, one is created with monthly/yearly 0 until you set rates on the pricing page.
          </Typography>
          {pricingClassificationSupported && editTargetNodeIdRef.current && (
            <Alert severity="info" sx={{ mb: 2 }}>
              The <strong>classification</strong> field on each Asset Type Pricing row will be set to the tree leaf you had selected when you opened this dialog (same target as Link bottles).
            </Alert>
          )}
          <TextField
            fullWidth
            size="small"
            label="Description"
            value={editTypesDescription}
            onChange={(e) => setEditTypesDescription(e.target.value)}
            margin="dense"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Pricing category"
            value={editTypesCategory}
            onChange={(e) => setEditTypesCategory(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => !editTypesSaving && setEditProductTypesOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          <Button
            variant="contained"
            disabled={editTypesSaving || pickerSelectedCodes.size === 0}
            onClick={handleSaveEditProductTypes}
            sx={{ textTransform: 'none', bgcolor: primaryColor }}
          >
            {editTypesSaving ? 'Saving…' : 'Save to Asset Type Pricing'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
