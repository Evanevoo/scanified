import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
  Collapse,
  Divider,
  Avatar,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  LocalShipping as DeliveryIcon,
  Receipt as OrderIcon,
  History as HistoryIcon,
  QrCodeScanner as ScanIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useDebounce, useOptimizedFetch, usePagination } from '../utils/performance';
import { FadeIn, SlideIn, TableSkeleton, SmoothButton } from '../components/SmoothLoading';
import { useNavigate } from 'react-router-dom';

const searchCategories = [
  { value: 'all', label: 'All', icon: <SearchIcon /> },
  { value: 'bottles', label: 'Assets', icon: <InventoryIcon /> },
  { value: 'customers', label: 'Customers', icon: <PeopleIcon /> },
  { value: 'locations', label: 'Locations', icon: <LocationIcon /> },
  { value: 'deliveries', label: 'Deliveries', icon: <DeliveryIcon /> },
  { value: 'orders', label: 'Orders', icon: <OrderIcon /> }
];

const assetStatusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'in_field', label: 'In Field' },
  { value: 'in_house', label: 'In House' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'lost', label: 'Lost' },
  { value: 'retired', label: 'Retired' }
];

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' }
];

export default function AdvancedSearch({ onResultSelect }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    customDateFrom: '',
    customDateTo: '',
    location: '',
    customer: '',
    productCode: ''
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch locations and customers for filter dropdowns
  const { data: locations } = useOptimizedFetch(
    useCallback(async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      return data || [];
    }, [profile?.organization_id]),
    [profile?.organization_id]
  );

  const { data: customers } = useOptimizedFetch(
    useCallback(async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      return data || [];
    }, [profile?.organization_id]),
    [profile?.organization_id]
  );

  // Main search function
  const { data: searchResults, loading: searchLoading } = useOptimizedFetch(
    useCallback(async () => {
      if (!debouncedSearch || !profile?.organization_id) return { bottles: [], customers: [], locations: [], deliveries: [] };
      
      const results = { bottles: [], customers: [], locations: [], deliveries: [] };

      // Search bottles/assets
      if (category === 'all' || category === 'bottles') {
        let query = supabase
          .from('bottles')
          .select(`
            id,
            barcode_number,
            serial_number,
            assigned_customer,
            location,
            product_code,
            description,
            status,
            created_at,
            updated_at,
            customers(name)
          `)
          .eq('organization_id', profile.organization_id);

        // Apply search term
        query = query.or(`barcode_number.ilike.%${debouncedSearch}%,serial_number.ilike.%${debouncedSearch}%,assigned_customer.ilike.%${debouncedSearch}%,product_code.ilike.%${debouncedSearch}%`);

        // Apply filters
        if (filters.status !== 'all') {
          if (filters.status === 'in_field') {
            query = query.not('assigned_customer', 'is', null).not('assigned_customer', 'eq', 'Not Set');
          } else if (filters.status === 'in_house') {
            query = query.or('assigned_customer.is.null,assigned_customer.eq.Not Set');
          } else {
            query = query.eq('status', filters.status);
          }
        }

        if (filters.location) {
          query = query.eq('location', filters.location);
        }

        if (filters.customer) {
          query = query.eq('assigned_customer', filters.customer);
        }

        if (filters.productCode) {
          query = query.ilike('product_code', `%${filters.productCode}%`);
        }

        const { data, error } = await query.limit(50);
        if (!error) results.bottles = data || [];
      }

      // Search customers
      if (category === 'all' || category === 'customers') {
        const { data, error } = await supabase
          .from('customers')
          .select('CustomerListID, name, address, phone, email')
          .eq('organization_id', profile.organization_id)
          .or(`name.ilike.%${debouncedSearch}%,address.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`)
          .limit(20);

        if (!error) results.customers = data || [];
      }

      // Search locations
      if (category === 'all' || category === 'locations') {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, address, type')
          .eq('organization_id', profile.organization_id)
          .or(`name.ilike.%${debouncedSearch}%,address.ilike.%${debouncedSearch}%`)
          .limit(20);

        if (!error) results.locations = data || [];
      }

      // Search deliveries
      if (category === 'all' || category === 'deliveries') {
        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            id,
            delivery_number,
            customer_name,
            address,
            status,
            delivery_type,
            scheduled_date,
            customers(name)
          `)
          .eq('organization_id', profile.organization_id)
          .or(`delivery_number.ilike.%${debouncedSearch}%,customer_name.ilike.%${debouncedSearch}%,address.ilike.%${debouncedSearch}%`)
          .limit(20);

        if (!error) results.deliveries = data || [];
      }

      return results;
    }, [debouncedSearch, profile?.organization_id, category, filters]),
    [debouncedSearch, profile?.organization_id, category, filters]
  );

  // Pagination for results
  const { 
    currentPage, 
    totalPages, 
    paginatedData: paginatedBottles, 
    goToPage 
  } = usePagination(searchResults?.bottles || [], 20);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      dateRange: 'all',
      customDateFrom: '',
      customDateTo: '',
      location: '',
      customer: '',
      productCode: ''
    });
    setSearchTerm('');
  };

  const handleResultClick = (type, item) => {
    if (onResultSelect) {
      onResultSelect(type, item);
    } else {
      // Default navigation
      switch (type) {
        case 'bottle':
          navigate(`/bottle/${item.id}`);
          break;
        case 'customer':
          navigate(`/customer/${item.CustomerListID}`);
          break;
        case 'location':
          navigate(`/location/${item.id}`);
          break;
        case 'delivery':
          navigate(`/delivery/${item.id}`);
          break;
      }
    }
  };

  const getResultCount = () => {
    if (!searchResults) return 0;
    return (searchResults.bottles?.length || 0) + 
           (searchResults.customers?.length || 0) + 
           (searchResults.locations?.length || 0) + 
           (searchResults.deliveries?.length || 0);
  };

  const ResultCard = ({ type, item, icon }) => (
    <SlideIn>
      <Card 
        sx={{ 
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
        onClick={() => handleResultClick(type, item)}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.light' }}>
              {icon}
            </Avatar>
            <Box flex={1}>
              <Typography variant="subtitle1" fontWeight="medium">
                {type === 'bottle' ? item.barcode_number :
                 type === 'customer' ? item.name :
                 type === 'location' ? item.name :
                 type === 'delivery' ? item.delivery_number : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {type === 'bottle' ? `${item.product_code} • ${item.customers?.name || item.assigned_customer || 'Unassigned'}` :
                 type === 'customer' ? item.address :
                 type === 'location' ? item.address :
                 type === 'delivery' ? `${item.customer_name} • ${item.status}` : ''}
              </Typography>
            </Box>
            <Box>
              <IconButton size="small">
                <ViewIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </SlideIn>
  );

  return (
    <Box>
      {/* Search Header */}
      <FadeIn>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search assets, customers, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearchTerm('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  label="Category"
                >
                  {searchCategories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {cat.icon}
                        {cat.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <SmoothButton
                fullWidth
                variant="outlined"
                startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </SmoothButton>
            </Grid>
          </Grid>

          {/* Advanced Filters */}
          <Collapse in={showFilters}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    {assetStatusOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={locations || []}
                  getOptionLabel={(option) => option.name}
                  value={locations?.find(l => l.name === filters.location) || null}
                  onChange={(e, value) => handleFilterChange('location', value?.name || '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Location" />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={customers || []}
                  getOptionLabel={(option) => option.name}
                  value={customers?.find(c => c.name === filters.customer) || null}
                  onChange={(e, value) => handleFilterChange('customer', value?.name || '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Customer" />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Product Code"
                  value={filters.productCode}
                  onChange={(e) => handleFilterChange('productCode', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" gap={1} justifyContent="flex-end">
                  <Button onClick={clearFilters} startIcon={<ClearIcon />}>
                    Clear All
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Collapse>
        </Paper>
      </FadeIn>

      {/* Search Results */}
      {debouncedSearch && (
        <FadeIn delay={200}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Search Results ({getResultCount()})
              </Typography>
              {searchLoading && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      border: '2px solid #f3f3f3',
                      borderTop: '2px solid #1976d2',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <Typography variant="body2">Searching...</Typography>
                </Box>
              )}
            </Box>

            {searchLoading ? (
              <TableSkeleton rows={5} columns={3} />
            ) : (
              <Box>
                {/* Results Tabs */}
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                  <Tab label={`Assets (${searchResults?.bottles?.length || 0})`} />
                  <Tab label={`Customers (${searchResults?.customers?.length || 0})`} />
                  <Tab label={`Locations (${searchResults?.locations?.length || 0})`} />
                  <Tab label={`Deliveries (${searchResults?.deliveries?.length || 0})`} />
                </Tabs>

                {/* Assets Results */}
                {activeTab === 0 && (
                  <Box>
                    {searchResults?.bottles?.length > 0 ? (
                      <Grid container spacing={2}>
                        {paginatedBottles.map((bottle, index) => (
                          <Grid item xs={12} md={6} key={bottle.id}>
                            <ResultCard
                              type="bottle"
                              item={bottle}
                              icon={<InventoryIcon />}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                        No assets found
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Customers Results */}
                {activeTab === 1 && (
                  <Box>
                    {searchResults?.customers?.length > 0 ? (
                      <Grid container spacing={2}>
                        {searchResults.customers.map((customer, index) => (
                          <Grid item xs={12} md={6} key={customer.CustomerListID}>
                            <ResultCard
                              type="customer"
                              item={customer}
                              icon={<PeopleIcon />}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                        No customers found
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Locations Results */}
                {activeTab === 2 && (
                  <Box>
                    {searchResults?.locations?.length > 0 ? (
                      <Grid container spacing={2}>
                        {searchResults.locations.map((location, index) => (
                          <Grid item xs={12} md={6} key={location.id}>
                            <ResultCard
                              type="location"
                              item={location}
                              icon={<LocationIcon />}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                        No locations found
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Deliveries Results */}
                {activeTab === 3 && (
                  <Box>
                    {searchResults?.deliveries?.length > 0 ? (
                      <Grid container spacing={2}>
                        {searchResults.deliveries.map((delivery, index) => (
                          <Grid item xs={12} md={6} key={delivery.id}>
                            <ResultCard
                              type="delivery"
                              item={delivery}
                              icon={<DeliveryIcon />}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                        No deliveries found
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </FadeIn>
      )}
    </Box>
  );
} 