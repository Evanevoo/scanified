import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Divider,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Card,
  CardContent,
  InputLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import { TableSkeleton, CardSkeleton } from '../components/SmoothLoading';

// Helper to check if a string looks like an address
function looksLikeAddress(str) {
  if (!str) return false;
  // Heuristic: contains a comma and a number
  return /\d/.test(str) && str.includes(',');
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [customerAssets, setCustomerAssets] = useState([]);
  const [locationAssets, setLocationAssets] = useState([]);
  const [bottleSummary, setBottleSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('CustomerListID', id)
          .single();
        if (customerError) throw customerError;
        setCustomer(customerData);
        setEditForm(customerData);
        
        const { data: customerAssetsData, error: customerAssetsError } = await supabase
          .from('bottles')
          .select('*')
          .eq('assigned_customer', id);
        if (customerAssetsError) throw customerAssetsError;
        setCustomerAssets(customerAssetsData || []);
        
        // Calculate bottle summary by type
        const summary = {};
        (customerAssetsData || []).forEach(bottle => {
          const type = bottle.type || bottle.description || 'Unknown';
          summary[type] = (summary[type] || 0) + 1;
        });
        setBottleSummary(summary);
        
        const { data: rentalData, error: rentalError } = await supabase
          .from('rentals')
          .select('*')
          .eq('customer_id', id);
        if (rentalError) throw rentalError;
        setLocationAssets(rentalData || []);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const updateFields = {
      name: editForm.name,
      phone: editForm.phone,
      contact_details: editForm.contact_details,
      address: editForm.address,
      address2: editForm.address2,
      address3: editForm.address3,
      address4: editForm.address4,
      address5: editForm.address5,
      city: editForm.city,
      postal_code: editForm.postal_code,
      customer_type: editForm.customer_type || 'CUSTOMER'
    };
    const { error } = await supabase
      .from('customers')
      .update(updateFields)
      .eq('CustomerListID', id);
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    setCustomer({ ...customer, ...updateFields });
    setEditing(false);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (loading) return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <CardSkeleton count={1} />
      <Box mt={4}><TableSkeleton rows={4} columns={5} /></Box>
      <Box mt={4}><TableSkeleton rows={3} columns={7} /></Box>
    </Box>
  );
  
  if (error) return (
    <Box p={4} color="error.main">
      <Typography>Error: {error}</Typography>
    </Box>
  );
  
  if (!customer) return (
    <Box p={4}>
      <Typography>Customer not found.</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        variant="outlined"
        sx={{ mb: 4, borderRadius: 999, fontWeight: 700, px: 4 }}
      >
        Back
      </Button>
      
      <Typography variant="h3" fontWeight={900} color="primary" mb={3} sx={{ letterSpacing: -1 }}>
        Customer Details
      </Typography>

      {/* Customer Information */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1.5px solid #e0e0e0', boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)' }}>
        <Box display="flex" alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" flexDirection={{ xs: 'column', md: 'row' }} mb={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="h5" fontWeight={700} color="primary">
              {editing ? (
                <TextField name="name" value={editForm.name || ''} onChange={handleEditChange} size="small" label="Name" sx={{ minWidth: 200 }} />
              ) : (
                customer.name
              )}
            </Typography>
            {!editing && (
              <Chip 
                label={customer.customer_type || 'CUSTOMER'} 
                color={customer.customer_type === 'VENDOR' ? 'secondary' : 'primary'} 
                size="medium"
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>
          {!editing && (
            <Button variant="outlined" onClick={() => setEditing(true)} sx={{ borderRadius: 999, fontWeight: 700, ml: { md: 2 } }}>Edit Customer</Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">Customer ID</Typography>
            <Typography variant="body1" fontWeight={600} fontFamily="monospace" sx={{ mb: 2 }}>{customer.CustomerListID}</Typography>
            <Typography variant="body2" color="text.secondary">Phone</Typography>
            {editing ? (
              <TextField name="phone" value={editForm.phone || ''} onChange={handleEditChange} size="small" label="Phone" sx={{ mb: 2, minWidth: 180 }} />
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>{customer.phone || 'Not provided'}</Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">Customer Type</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                <InputLabel>Customer Type</InputLabel>
                <Select
                  name="customer_type"
                  value={editForm.customer_type || 'CUSTOMER'}
                  onChange={handleEditChange}
                  label="Customer Type"
                >
                  <MenuItem value="CUSTOMER">Customer</MenuItem>
                  <MenuItem value="VENDOR">Vendor</MenuItem>
                  <MenuItem value="TEMPORARY">Temporary (Walk-in)</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                <Chip 
                  label={customer.customer_type || 'CUSTOMER'} 
                  color={
                    customer.customer_type === 'VENDOR' ? 'secondary' : 
                    customer.customer_type === 'TEMPORARY' ? 'warning' : 'primary'
                  } 
                  size="small"
                  variant="outlined"
                />
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">Location</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                <Select
                  name="location"
                  value={editForm.location || 'SASKATOON'}
                  onChange={handleEditChange}
                  label="Location"
                >
                  <MenuItem value="SASKATOON">SASKATOON</MenuItem>
                  <MenuItem value="REGINA">REGINA</MenuItem>
                  <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
                  <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                <Chip 
                  label={customer.location || 'SASKATOON'} 
                  color="primary" 
                  size="small"
                  variant="outlined"
                />
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">Contact</Typography>
            {editing ? (
              <TextField name="contact_details" value={editForm.contact_details || ''} onChange={handleEditChange} size="small" label="Contact" sx={{ minWidth: 180 }} />
            ) : (
              <Typography variant="body1">
                {([
                  customer.address,
                  customer.address2,
                  customer.address3,
                  customer.address4,
                  customer.address5,
                  customer.city,
                  customer.postal_code
                ].filter(Boolean).length === 0 && looksLikeAddress(customer.contact_details))
                  ? 'Not provided'
                  : (customer.contact_details || 'Not provided')}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Address</Typography>
            {editing ? (
              <>
                <TextField name="address" value={editForm.address || ''} onChange={handleEditChange} size="small" label="Address" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address2" value={editForm.address2 || ''} onChange={handleEditChange} size="small" label="Address 2" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address3" value={editForm.address3 || ''} onChange={handleEditChange} size="small" label="Address 3" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address4" value={editForm.address4 || ''} onChange={handleEditChange} size="small" label="Address 4" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address5" value={editForm.address5 || ''} onChange={handleEditChange} size="small" label="Address 5" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="city" value={editForm.city || ''} onChange={handleEditChange} size="small" label="City" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="postal_code" value={editForm.postal_code || ''} onChange={handleEditChange} size="small" label="Postal Code" sx={{ mb: 1, minWidth: 180 }} />
              </>
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {([
                  customer.address,
                  customer.address2,
                  customer.address3,
                  customer.address4,
                  customer.address5,
                  customer.city,
                  customer.postal_code
                ].filter(Boolean).length > 0)
                  ? [
                      customer.address,
                      customer.address2,
                      customer.address3,
                      customer.address4,
                      customer.address5,
                      customer.city,
                      customer.postal_code
                    ].filter(Boolean).join(', ')
                  : (looksLikeAddress(customer.contact_details)
                      ? customer.contact_details
                      : 'Not provided')}
              </Typography>
            )}
          </Box>
        </Box>
        {editing && (
          <Box>
            {/* Customer Type Info */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Customer Type:</strong><br/>
                • <strong>CUSTOMER</strong> - Gets charged rental fees for assigned bottles<br/>
                • <strong>VENDOR</strong> - Does NOT get charged rental fees (business partner)
              </Typography>
            </Alert>
            
            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save Changes'}
              </Button>
              <Button variant="outlined" color="secondary" onClick={() => { setEditing(false); setEditForm(customer); }} disabled={saving}>
                Cancel
              </Button>
            </Box>
            
            {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
            {saveSuccess && <Alert severity="success" sx={{ mt: 2 }}>Customer information updated successfully!</Alert>}
          </Box>
        )}
      </Paper>

      {/* Bottle Rental Summary */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1.5px solid #e0e0e0', boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h5" fontWeight={700} color="primary">
            📊 Bottle Rental Summary
          </Typography>
          {customer.customer_type === 'VENDOR' && (
            <Chip 
              label="NO RENTAL FEES" 
              color="secondary" 
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
        
        {Object.keys(bottleSummary).length === 0 ? (
          <Box>
            <Typography color="text.secondary" mb={2}>No bottles currently assigned to this customer.</Typography>
            
            {/* Billing Information - show even when no bottles */}
            <Box mt={2}>
              {customer.customer_type === 'VENDOR' ? (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Billing Status:</strong> This vendor account is NOT charged rental fees for assigned bottles.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Billing Status:</strong> This customer account IS charged rental fees for assigned bottles.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Total bottles by type:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {Object.entries(bottleSummary).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${type} (${count})`}
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: 2
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" mt={2}>
              Total bottles: {customerAssets.length}
            </Typography>
            
            {/* Billing Information */}
            <Box mt={2}>
              {customer.customer_type === 'VENDOR' ? (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Billing Status:</strong> This vendor account is NOT charged rental fees for assigned bottles.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Billing Status:</strong> This customer account IS charged rental fees for assigned bottles.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Currently Assigned Bottles */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={700} color="primary" mb={3}>
          🏠 Currently Assigned Bottles ({customerAssets.length})
        </Typography>
        
        {customerAssets.length === 0 ? (
          <Typography color="text.secondary">No bottles currently assigned to this customer.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerAssets.map((asset) => (
                  <TableRow key={asset.id} hover>
                    <TableCell>{asset.serial_number}</TableCell>
                    <TableCell>
                      {asset.barcode_number ? (
                        <Link
                          to={`/bottle/${asset.id}`}
                          style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {asset.barcode_number}
                        </Link>
                      ) : ''}
                    </TableCell>
                    <TableCell>{asset.type || asset.description || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={asset.location || 'Unknown'} 
                        color="primary" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          customer?.customer_type === 'VENDOR' 
                            ? "In-house (no charge)" 
                            : customer?.customer_type === 'TEMPORARY'
                            ? "Rented (temp - needs setup)"
                            : "Rented"
                        }
                        color={
                          customer?.customer_type === 'VENDOR' ? 'default' : 
                          customer?.customer_type === 'TEMPORARY' ? 'warning' : 'success'
                        }
                        size="small"
                        icon={customer?.customer_type === 'VENDOR' ? <HomeIcon /> : null}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Rental History */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={700} color="primary" mb={3}>
          📋 Rental History ({locationAssets.length})
        </Typography>
        
        {locationAssets.length === 0 ? (
          <Typography color="text.secondary">No rental history found for this customer.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rental Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rental Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locationAssets.map((rental) => (
                  <TableRow key={rental.id} hover>
                    <TableCell>{rental.cylinder?.serial_number || 'Unknown'}</TableCell>
                    <TableCell>{rental.cylinder?.type || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={rental.rental_type || 'Monthly'} 
                        color="primary" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>${rental.rental_amount || 0}</TableCell>
                    <TableCell>
                      <Chip 
                        label={rental.location || 'Unknown'} 
                        color="secondary" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{rental.rental_start_date || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={rental.status || 'Active'} 
                        color={rental.status === 'at_home' ? 'warning' : 'success'} 
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
} 