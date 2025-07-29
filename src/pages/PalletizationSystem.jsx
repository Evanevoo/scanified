import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Inventory as PalletIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  QrCodeScanner as ScanIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  LocalShipping as ShippingIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';

export default function PalletizationSystem() {
  const { profile, organization } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();
  const [pallets, setPallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState(null);
  const [newPallet, setNewPallet] = useState({
    pallet_id: '',
    type: 'delivery',
    destination: '',
    max_capacity: 20,
    notes: ''
  });
  const [scanDialog, setScanDialog] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [currentScan, setCurrentScan] = useState('');

  useEffect(() => {
    // Simulate loading pallet data
    setTimeout(() => {
      setPallets([
        {
          id: 1,
          pallet_id: 'PAL-001',
          type: 'delivery',
          status: 'building',
          destination: 'Customer - ABC Corp',
          max_capacity: 20,
          current_count: 15,
          items: [
            { asset_id: 'CYL-001', type: 'Propane', status: 'loaded' },
            { asset_id: 'CYL-002', type: 'Propane', status: 'loaded' },
            { asset_id: 'CYL-003', type: 'Oxygen', status: 'loaded' },
            { asset_id: 'CYL-004', type: 'Nitrogen', status: 'loaded' },
            { asset_id: 'CYL-005', type: 'Propane', status: 'loaded' }
          ],
          created_date: '2024-01-15',
          created_by: 'John Smith',
          notes: 'Standard delivery pallet for weekly order'
        },
        {
          id: 2,
          pallet_id: 'PAL-002',
          type: 'return',
          status: 'sealed',
          destination: 'Warehouse - Main',
          max_capacity: 25,
          current_count: 22,
          items: [
            { asset_id: 'CYL-010', type: 'Propane', status: 'empty' },
            { asset_id: 'CYL-011', type: 'Oxygen', status: 'empty' },
            { asset_id: 'CYL-012', type: 'Nitrogen', status: 'empty' }
          ],
          created_date: '2024-01-14',
          created_by: 'Jane Doe',
          notes: 'Return pallet from ABC Corp - empties for refill'
        },
        {
          id: 3,
          pallet_id: 'PAL-003',
          type: 'maintenance',
          status: 'shipped',
          destination: 'Maintenance Facility',
          max_capacity: 15,
          current_count: 12,
          items: [
            { asset_id: 'CYL-020', type: 'Propane', status: 'needs_inspection' },
            { asset_id: 'CYL-021', type: 'Oxygen', status: 'needs_repair' }
          ],
          created_date: '2024-01-12',
          created_by: 'Mike Johnson',
          notes: 'Maintenance pallet - various issues requiring attention'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'building': return 'warning';
      case 'sealed': return 'info';
      case 'shipped': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'delivery': return 'primary';
      case 'return': return 'secondary';
      case 'maintenance': return 'warning';
      case 'storage': return 'info';
      default: return 'default';
    }
  };

  const handleCreatePallet = () => {
    const newId = Math.max(...pallets.map(p => p.id), 0) + 1;
    const newPalletData = {
      ...newPallet,
      id: newId,
      status: 'building',
      current_count: 0,
      items: [],
      created_date: new Date().toISOString().split('T')[0],
      created_by: profile?.full_name || 'Current User'
    };

    setPallets([...pallets, newPalletData]);
    setNewPallet({
      pallet_id: '',
      type: 'delivery',
      destination: '',
      max_capacity: 20,
      notes: ''
    });
    setCreateDialog(false);
  };

  const handleScanItem = () => {
    if (currentScan.trim()) {
      const newItem = {
        asset_id: currentScan.trim(),
        type: 'Unknown',
        status: 'scanned',
        timestamp: new Date().toISOString()
      };
      setScannedItems([...scannedItems, newItem]);
      setCurrentScan('');
    }
  };

  const handleAddScannedItems = () => {
    if (selectedPallet && scannedItems.length > 0) {
      const updatedPallets = pallets.map(pallet => {
        if (pallet.id === selectedPallet.id) {
          return {
            ...pallet,
            items: [...pallet.items, ...scannedItems],
            current_count: pallet.current_count + scannedItems.length
          };
        }
        return pallet;
      });
      setPallets(updatedPallets);
      setScannedItems([]);
      setScanDialog(false);
    }
  };

  const assetName = isReady ? terms.asset : 'Asset';
  const assetsName = isReady ? terms.assets : 'Assets';

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Palletization System
        </Typography>
        <Typography>Loading pallet data...</Typography>
      </Box>
    );
  }

  const buildingCount = pallets.filter(p => p.status === 'building').length;
  const sealedCount = pallets.filter(p => p.status === 'sealed').length;
  const shippedCount = pallets.filter(p => p.status === 'shipped').length;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Palletization System
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Organize and manage {assetsName.toLowerCase()} into pallets for efficient handling
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PalletIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {buildingCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Building
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PalletIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {sealedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sealed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ShippingIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {shippedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Shipped
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PalletIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {pallets.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Pallets
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
        >
          Create Pallet
        </Button>
        <Button
          variant="outlined"
          startIcon={<ScanIcon />}
          onClick={() => setScanDialog(true)}
        >
          Scan Items
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
        >
          Print Labels
        </Button>
      </Box>

      {/* Pallets Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Pallet ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pallets.map((pallet) => (
                <TableRow key={pallet.id}>
                  <TableCell>{pallet.pallet_id}</TableCell>
                  <TableCell>
                    <Chip
                      label={pallet.type}
                      color={getTypeColor(pallet.type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={pallet.status}
                      color={getStatusColor(pallet.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{pallet.destination}</TableCell>
                  <TableCell>{pallet.max_capacity} {assetsName.toLowerCase()}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        {pallet.current_count}/{pallet.max_capacity}
                      </Typography>
                      <Box
                        sx={{
                          width: 60,
                          height: 6,
                          bgcolor: 'grey.300',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            width: `${(pallet.current_count / pallet.max_capacity) * 100}%`,
                            height: '100%',
                            bgcolor: pallet.current_count >= pallet.max_capacity ? 'success.main' : 'primary.main'
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{pallet.created_date}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedPallet(pallet);
                        setDetailDialog(true);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Pallet Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Pallet</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pallet ID"
                value={newPallet.pallet_id}
                onChange={(e) => setNewPallet({ ...newPallet, pallet_id: e.target.value })}
                placeholder="e.g., PAL-004"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Pallet Type</InputLabel>
                <Select
                  value={newPallet.type}
                  onChange={(e) => setNewPallet({ ...newPallet, type: e.target.value })}
                  label="Pallet Type"
                >
                  <MenuItem value="delivery">Delivery</MenuItem>
                  <MenuItem value="return">Return</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="storage">Storage</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Destination"
                value={newPallet.destination}
                onChange={(e) => setNewPallet({ ...newPallet, destination: e.target.value })}
                placeholder="e.g., Customer - ABC Corp, Warehouse - Main"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Capacity"
                value={newPallet.max_capacity}
                onChange={(e) => setNewPallet({ ...newPallet, max_capacity: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 50 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={newPallet.notes}
                onChange={(e) => setNewPallet({ ...newPallet, notes: e.target.value })}
                placeholder="Additional notes about this pallet..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePallet} variant="contained">
            Create Pallet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scan Items Dialog */}
      <Dialog open={scanDialog} onClose={() => setScanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Scan {assetsName} to Pallet</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`Scan ${assetName} Barcode`}
                value={currentScan}
                onChange={(e) => setCurrentScan(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScanItem()}
                placeholder="Scan or type barcode..."
                autoFocus
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleScanItem}
                disabled={!currentScan.trim()}
              >
                Add to Pallet
              </Button>
            </Grid>
            {scannedItems.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Scanned Items ({scannedItems.length})
                </Typography>
                <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <List dense>
                    {scannedItems.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={item.asset_id}
                          secondary={`Type: ${item.type}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => setScannedItems(scannedItems.filter((_, i) => i !== index))}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialog(false)}>Close</Button>
          <Button 
            onClick={handleAddScannedItems} 
            variant="contained"
            disabled={scannedItems.length === 0}
          >
            Add {scannedItems.length} Items
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pallet Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Pallet Details - {selectedPallet?.pallet_id}
        </DialogTitle>
        <DialogContent>
          {selectedPallet && (
            <Box>
              <Grid container spacing={3} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Chip label={selectedPallet.type} color={getTypeColor(selectedPallet.type)} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip label={selectedPallet.status} color={getStatusColor(selectedPallet.status)} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Destination
                  </Typography>
                  <Typography variant="body1">{selectedPallet.destination}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1">{selectedPallet.notes || 'No notes'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Pallet Contents ({selectedPallet.current_count}/{selectedPallet.max_capacity})
              </Typography>
              
              {selectedPallet.items.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{assetName} ID</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPallet.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.asset_id}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>
                            <Chip label={item.status} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  No items added to this pallet yet.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          <Button variant="outlined" startIcon={<ScanIcon />}>
            Add Items
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />}>
            Print Label
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}