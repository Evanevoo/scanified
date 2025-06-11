import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Checkbox,
  FormControl,
  InputLabel,
  Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { supabase } from '../supabase/client';

// Dummy data for bottles
const dummyBottles = Array.from({ length: 50 }, (_, i) => ({
  id: `id-${i + 1}`,
  bottleId: `bottle-${i + 1}`,
  barcode: Math.random().toString().slice(2, 10),
  serial: i % 3 === 0 ? 'Not Set' : `K${1000000 + i}`,
  category: 'INDUSTRIAL CYLINDERS',
  group: i % 2 === 0 ? 'ACETYLENE' : 'NITROGEN',
  type: i % 2 === 0 ? 'BAC5M3' : 'BNI300',
  item: i % 2 === 0 ? 'BAC5M3' : 'BNI300',
  itemDesc: '',
  ownership: i % 2 === 0 ? 'CENTRAL WELDING' : 'WeldCor',
  startDate: '',
  stopDate: '',
  daysAtLocation: '',
  productCode: i % 2 === 0 ? 'BAC5M3' : 'BNI300',
}));

const statusOptions = ['All', 'Available', 'In Use', 'Maintenance'];
const rowsPerPageOptions = [10, 25, 50, 100];

export default function BottleManagement() {
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [fileInputRef] = useState(() => React.createRef());

  // Simulate total/filtered count
  const totalBottles = 11756;
  const filteredBottles = 10000;

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setBottles(dummyBottles);
      setLoading(false);
    }, 500);
  }, []);

  const handleSearch = (e) => setSearch(e.target.value);
  const handleStatus = (e) => setStatus(e.target.value);
  const handleRowsPerPage = (e) => setRowsPerPage(Number(e.target.value));

  // Filtering (simulate)
  const filtered = bottles.filter(
    (b) =>
      (status === 'All' || b.status === status) &&
      (b.serial.toLowerCase().includes(search.toLowerCase()) ||
        b.barcode.toLowerCase().includes(search.toLowerCase()) ||
        b.bottleId.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination
  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // Selection
  const isAllSelected = paginated.length > 0 && selected.length === paginated.length;
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(paginated.map((b) => b.id));
    else setSelected([]);
  };
  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Delete All Bottles
  const handleDeleteAll = async () => {
    setLoadingDelete(true);
    try {
      // First check if we can connect to Supabase
      const { data: testConnection, error: connectionError } = await supabase
        .from('cylinders')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        throw new Error(`Connection failed: ${connectionError.message}`);
      }
      
      // Get all bottle IDs
      const { data: allBottles, error: fetchError } = await supabase
        .from('cylinders')
        .select('id');
      
      if (fetchError) {
        throw new Error(`Failed to fetch bottles: ${fetchError.message}`);
      }
      
      if (!allBottles || allBottles.length === 0) {
        setLoadingDelete(false);
        setDeleteDialogOpen(false);
        setSnackbarMsg('No bottles found to delete.');
        setSnackbarOpen(true);
        return;
      }
      
      // Delete bottles in batches to avoid timeout
      const bottleIds = allBottles.map(bottle => bottle.id);
      const batchSize = 100; // Delete 100 at a time
      let deletedCount = 0;
      
      for (let i = 0; i < bottleIds.length; i += batchSize) {
        const batch = bottleIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('cylinders')
          .delete()
          .in('id', batch);
        
        if (deleteError) {
          throw new Error(`Failed to delete batch: ${deleteError.message}`);
        }
        
        deletedCount += batch.length;
      }
      
      setLoadingDelete(false);
      setDeleteDialogOpen(false);
      setBottles([]);
      setSnackbarMsg(`Successfully deleted ${deletedCount} bottles!`);
      setSnackbarOpen(true);
      
    } catch (error) {
      setLoadingDelete(false);
      setDeleteDialogOpen(false);
      console.error('Delete error:', error);
      setSnackbarMsg(`Error: ${error.message}. Please check your internet connection and try again.`);
      setSnackbarOpen(true);
    }
  };

  // Bulk Assign from File
  const handleBulkAssign = async (file) => {
    setLoadingBulk(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      // Simple CSV parse: id,barcode,serial,...
      const lines = text.split('\n').filter(Boolean);
      const newBottles = lines.slice(1).map((line, i) => {
        const [id, barcode, serial, category, group, type, item, itemDesc, ownership, startDate, stopDate, daysAtLocation, productCode] = line.split(',');
        return {
          id: id || `imported-${Date.now()}-${i}`,
          bottleId: id || `imported-${Date.now()}-${i}`,
          barcode: barcode || '',
          serial: serial || '',
          category: category || '',
          group: group || '',
          type: type || '',
          item: item || '',
          itemDesc: itemDesc || '',
          ownership: ownership || '',
          startDate: startDate || '',
          stopDate: stopDate || '',
          daysAtLocation: daysAtLocation || '',
          productCode: productCode || '',
        };
      });
      const { error } = await supabase.from('cylinders').upsert(newBottles, { onConflict: ['id'] });
      setLoadingBulk(false);
      if (error) {
        setSnackbarMsg('Bulk assign error: ' + error.message);
        setSnackbarOpen(true);
      } else {
        setBottles((prev) => [...prev, ...newBottles]);
        setSnackbarMsg('Bulk assign complete!');
        setSnackbarOpen(true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', mx: 0, mt: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h3" fontWeight={900} color="#1976d2" sx={{ letterSpacing: 0.5 }}>
          Bottle Management
        </Typography>
        <Box display="flex" alignItems="center" gap={3}>
          <Typography color="#222" fontWeight={500}>
            Total Bottles: {totalBottles} / {totalBottles} (Filtered: {filteredBottles})
          </Typography>
          <Button
            variant="outlined"
            sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3, borderWidth: 2 }}
            color="primary"
            onClick={() => alert('Export (placeholder)')}
          >
            Export
          </Button>
        </Box>
      </Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          value={search}
          onChange={handleSearch}
          placeholder="Search"
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { borderRadius: 999, background: '#fff' }
          }}
          sx={{ width: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={handleStatus} sx={{ borderRadius: 999 }}>
            {statusOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Rows per page</InputLabel>
          <Select value={rowsPerPage} label="Rows per page" onChange={handleRowsPerPage} sx={{ borderRadius: 999 }}>
            {rowsPerPageOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3, borderColor: '#a259e6', color: '#a259e6', borderWidth: 2 }}
          onClick={() => fileInputRef.current.click()}
        >
          Bulk Assign from File
        </Button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => handleBulkAssign(e.target.files[0])}
        />
        <Button
          variant="contained"
          sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3, background: '#e53935', ':hover': { background: '#b71c1c' } }}
          onClick={() => setDeleteDialogOpen(true)}
          disabled={loadingDelete}
        >
          Delete All Bottles
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Showing {paginated.length} of {filteredBottles} bottles
      </Typography>
      <Paper elevation={3} sx={{ borderRadius: 4, p: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ width: '100%', overflowX: 'auto', maxHeight: 600 }}>
          <Table stickyHeader sx={{ minWidth: 1400 }}>
            <TableHead>
              <TableRow sx={{ background: '#f5f7fa' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={selected.length > 0 && selected.length < paginated.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Bottle ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Group</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Item Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ownership</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stop Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Days At Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Product Code</TableCell>
                <TableCell padding="checkbox"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={15} align="center">
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} align="center">
                    No bottles found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((bottle) => (
                  <TableRow key={bottle.id} hover selected={selected.includes(bottle.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(bottle.id)}
                        onChange={() => handleSelect(bottle.id)}
                      />
                    </TableCell>
                    <TableCell>{bottle.bottleId}</TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        color="primary"
                        sx={{ fontWeight: 700, textTransform: 'none', p: 0, minWidth: 0 }}
                        onClick={() => alert(`Barcode: ${bottle.barcode}`)}
                      >
                        {bottle.barcode}
                      </Button>
                    </TableCell>
                    <TableCell>{bottle.serial}</TableCell>
                    <TableCell>{bottle.category}</TableCell>
                    <TableCell>{bottle.group}</TableCell>
                    <TableCell>{bottle.type}</TableCell>
                    <TableCell>{bottle.item}</TableCell>
                    <TableCell>{bottle.itemDesc}</TableCell>
                    <TableCell>{bottle.ownership}</TableCell>
                    <TableCell>{bottle.startDate}</TableCell>
                    <TableCell>{bottle.stopDate}</TableCell>
                    <TableCell>{bottle.daysAtLocation}</TableCell>
                    <TableCell>{bottle.productCode}</TableCell>
                    <TableCell padding="checkbox">
                      <IconButton>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete All Bottles?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all bottles from the system, including Rentals. This cannot be undone. Are you sure?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={loadingDelete}>Cancel</Button>
          <Button onClick={handleDeleteAll} color="error" disabled={loadingDelete}>
            {loadingDelete ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
} 