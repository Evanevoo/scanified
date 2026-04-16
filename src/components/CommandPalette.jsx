import logger from '../utils/logger';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  TextField,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  InputAdornment,
  Divider,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { filterNavRoutesByQuery } from '../nav/appNavConfig';

const MIN_QUERY_DATA = 2;

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const inputRef = useRef(null);

  const pageResults = useMemo(() => filterNavRoutesByQuery(q), [q]);

  const runDataSearch = useCallback(async () => {
    const term = q.trim();
    if (!organization?.id || term.length < MIN_QUERY_DATA) {
      setCustomers([]);
      setBottles([]);
      return;
    }
    setLoadingData(true);
    try {
      const [cRes, bRes] = await Promise.all([
        supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('organization_id', organization.id)
          .or(`CustomerListID.ilike.%${term}%,name.ilike.%${term}%`)
          .limit(8),
        supabase
          .from('bottles')
          .select('id, serial_number, barcode_number, product_code, organization_id')
          .eq('organization_id', organization.id)
          .or(`serial_number.ilike.%${term}%,barcode_number.ilike.%${term}%,product_code.ilike.%${term}%`)
          .limit(8),
      ]);
      if (cRes.error) logger.warn('CommandPalette customers:', cRes.error);
      if (bRes.error) logger.warn('CommandPalette bottles:', bRes.error);
      setCustomers((cRes.data || []).filter(Boolean));
      setBottles((bRes.data || []).filter((b) => b.organization_id === organization.id));
    } catch (e) {
      logger.error('CommandPalette search', e);
      setCustomers([]);
      setBottles([]);
    } finally {
      setLoadingData(false);
    }
  }, [q, organization?.id]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(runDataSearch, 220);
    return () => clearTimeout(t);
  }, [open, runDataSearch]);

  useEffect(() => {
    if (open) {
      setQ('');
      setCustomers([]);
      setBottles([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const go = (path) => {
    navigate(path);
    onClose();
  };

  const handlePickCustomer = (id) => {
    navigate(`/customer/${encodeURIComponent(id)}`);
    onClose();
  };

  const handlePickBottle = (id) => {
    navigate(`/bottle/${id}`);
    onClose();
  };

  const showPages = q.trim().length > 0 && pageResults.length > 0;
  const showData = q.trim().length >= MIN_QUERY_DATA;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
      PaperProps={{
        elevation: 8,
        sx: { borderRadius: 2, overflow: 'hidden' },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            autoFocus
            placeholder="Search pages, customers, or barcodes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { fontSize: '1.1rem' },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Keyboard: <Chip size="small" label="Ctrl K" sx={{ height: 22 }} /> or{' '}
            <Chip size="small" label="⌘ K" sx={{ height: 22 }} /> to open
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
          {!q.trim() && (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Type to find pages, customers, or cylinder barcodes. Start with at least two characters for customer and
                bottle search.
              </Typography>
            </Box>
          )}

          {showPages && (
            <>
              <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700 }}>
                Pages
              </Typography>
              <List dense disablePadding>
                {pageResults.map((r) => (
                  <ListItemButton key={r.path} onClick={() => go(r.path)}>
                    <DashboardIcon sx={{ mr: 1.5, color: 'action.active', fontSize: 20 }} />
                    <ListItemText
                      primary={r.title}
                      secondary={r.subtitle}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}

          {showData && (customers.length > 0 || bottles.length > 0 || loadingData) && (
            <>
              <Divider />
              {customers.length > 0 && (
                <>
                  <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700 }}>
                    Customers
                  </Typography>
                  <List dense disablePadding>
                    {customers.map((c) => (
                      <ListItemButton key={c.CustomerListID} onClick={() => handlePickCustomer(c.CustomerListID)}>
                        <PersonIcon sx={{ mr: 1.5, color: 'action.active', fontSize: 20 }} />
                        <ListItemText
                          primary={c.name}
                          secondary={c.CustomerListID}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </>
              )}
              {bottles.length > 0 && (
                <>
                  <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700 }}>
                    Cylinders / barcodes
                  </Typography>
                  <List dense disablePadding>
                    {bottles.map((b) => (
                      <ListItemButton key={b.id} onClick={() => handlePickBottle(b.id)}>
                        <InventoryIcon sx={{ mr: 1.5, color: 'action.active', fontSize: 20 }} />
                        <ListItemText
                          primary={b.barcode_number || b.serial_number || b.product_code || b.id}
                          secondary={[b.product_code, b.serial_number].filter(Boolean).join(' · ') || 'Open asset'}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </>
              )}
              {loadingData && q.trim().length >= MIN_QUERY_DATA && (
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Searching…
                </Typography>
              )}
            </>
          )}

          {q.trim() && !showPages && !loadingData && !(showData && (customers.length > 0 || bottles.length > 0)) && (
            <Box sx={{ px: 2, py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {q.trim().length < MIN_QUERY_DATA
                  ? 'No matching pages. Type more characters to search customers and barcodes, or try another spelling.'
                  : 'No matching pages or records. Try another spelling or use the sidebar menu search.'}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
