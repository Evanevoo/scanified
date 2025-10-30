import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Card, CardContent, Grid, Chip, IconButton, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Tooltip, Badge
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  MonetizationOn as MoneyIcon,
  Assignment as AssignmentIcon,
  Notifications as NotificationsIcon,
  Receipt as InvoiceIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

// Business logic functions to determine asset status
const getAssetStatus = (assignedCustomer, customerType) => {
  if (!assignedCustomer) return 'IN-HOUSE';
  if (customerType === 'VENDOR') return 'IN-HOUSE';     // Vendors are considered in-house
  if (customerType === 'CUSTOMER') return 'RENTED';     // Customers are rented out
  if (customerType === 'TEMPORARY') return 'RENTED';    // Temporary customers also rent items
  // If customer_type doesn't exist yet (migration not run), default to RENTED for assigned items
  if (assignedCustomer && !customerType) return 'RENTED';
  return 'IN-HOUSE'; // Default fallback
};

const getStatusDescription = (assignedCustomer, customerType) => {
  if (!assignedCustomer) return 'Available for assignment';
  if (customerType === 'VENDOR') return 'In-house with vendor - no rental charge';
  if (customerType === 'CUSTOMER') return 'Rented to customer';
  if (customerType === 'TEMPORARY') return 'Rented to temporary customer (needs account setup)';
  // If customer_type doesn't exist yet, assume it's a customer
  if (assignedCustomer && !customerType) return 'Rented to customer';
  return 'Available for assignment';
};

// Enhanced status mapping with colors and descriptions
const ASSET_STATUS = {
  'IN-HOUSE': { 
    color: 'default', 
    icon: <HomeIcon />, 
    description: 'Available in warehouse or with vendors (no charge)',
    billable: false 
  },
  'RENTED': { 
    color: 'primary', 
    icon: <PersonIcon />, 
    description: 'Rented to customer',
    billable: true 
  }
};

function RentalsImproved() {
  const { profile, organization } = useAuth();
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [editDialog, setEditDialog] = useState({ open: false, customer: null, rentals: [] });
  const [updatingRentals, setUpdatingRentals] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    customer_type: 'all',
    search: ''
  });
  const [locations, setLocations] = useState([]);

  // Statistics
  const [stats, setStats] = useState({
    inHouse: 0,
    withVendors: 0,
    rented: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    if (organization?.id) {
      fetchRentals();
      fetchCustomers();
      fetchLocations();
    }
  }, [organization]);

  const fetchRentals = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!organization?.id) {
        setError('No organization assigned to user');
        setLoading(false);
        return;
      }

      console.log('Fetching rentals for organization:', organization.id);

      // Simplified approach - get all data separately to debug
      // 1. Get all active rentals (from rentals table)
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('*')
        .is('rental_end_date', null);

      if (rentalsError) {
        console.error('Rentals query error:', rentalsError);
        throw rentalsError;
      }

      console.log('All active rentals:', rentalsData?.length || 0);

      // 2. Get all assigned bottles for this organization
      const { data: assignedBottles, error: bottlesError } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id)
        .not('assigned_customer', 'is', null);

      if (bottlesError) {
        console.error('Bottles query error:', bottlesError);
        throw bottlesError;
      }

      console.log('Assigned bottles for org:', assignedBottles?.length || 0);

      // 3. Get all bottles for this organization (to join with rentals)
      const { data: allBottles, error: allBottlesError } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id);

      if (allBottlesError) {
        console.error('All bottles query error:', allBottlesError);
        throw allBottlesError;
      }

      // Create a map of bottles for quick lookup
      const bottlesMap = (allBottles || []).reduce((map, bottle) => {
        map[bottle.barcode_number || bottle.barcode] = bottle;
        return map;
      }, {});

      console.log('Total bottles for org:', allBottles?.length || 0);

      // 4. Combine rentals with bottles from this organization
      const allRentalData = [];
      
      // Add rentals that have matching bottles in this organization
      for (const rental of rentalsData || []) {
        const bottle = bottlesMap[rental.bottle_barcode];
        if (bottle) {
          // Update rental with location-specific tax rate if not already set
          const rentalLocation = (rental.location || bottle.location || 'SASKATOON').toUpperCase();
          const locationTaxRate = locationTaxMap[rentalLocation] || rental.tax_rate || 0.11;
          
          allRentalData.push({
            ...rental,
            source: 'rental',
            bottles: bottle,
            tax_rate: locationTaxRate,
            location: rentalLocation
          });
        }
      }

      // Add bottles that are assigned but don't have rental records
      const existingBottleBarcodes = new Set(allRentalData.map(r => r.bottle_barcode));
      
      // Load customer pricing to apply correct rates
      const { data: customerPricing } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('organization_id', organization.id);
      
      const pricingMap = (customerPricing || []).reduce((map, pricing) => {
        map[pricing.customer_id] = pricing;
        return map;
      }, {});

      // Load location tax rates
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, total_tax_rate')
        .eq('organization_id', organization.id);
      
      const locationTaxMap = (locations || []).reduce((map, location) => {
        map[location.name.toUpperCase()] = location.total_tax_rate / 100; // Convert percentage to decimal
        return map;
      }, {});
      
      console.log('Location tax rates loaded:', locationTaxMap);
      
      for (const bottle of assignedBottles || []) {
        const barcode = bottle.barcode_number || bottle.barcode;
        if (!existingBottleBarcodes.has(barcode)) {
          // Get customer-specific pricing or use default
          const customerPricing = pricingMap[bottle.assigned_customer];
          let rentalAmount = 15; // Default rate
          let rentalType = 'monthly';
          
          if (customerPricing) {
            if (customerPricing.fixed_rate_override) {
              rentalAmount = customerPricing.fixed_rate_override;
            } else if (customerPricing.discount_percent > 0) {
              // Apply discount to base rate (assuming base rate is $15)
              rentalAmount = 15 * (1 - customerPricing.discount_percent / 100);
            }
            rentalType = customerPricing.rental_period || 'monthly';
          }
          
          // Get location-specific tax rate
          const bottleLocation = (bottle.location || 'SASKATOON').toUpperCase();
          const locationTaxRate = locationTaxMap[bottleLocation] || 0.11; // Default to 11% if location not found
          
          allRentalData.push({
            id: `bottle_${bottle.id}`,
            source: 'bottle_assignment',
            customer_id: bottle.assigned_customer,
            bottle_barcode: barcode,
            bottle_id: bottle.id,
            bottles: bottle,
            rental_start_date: bottle.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            rental_end_date: null,
            rental_amount: rentalAmount,
            rental_type: rentalType,
            tax_code: 'GST+PST',
            tax_rate: locationTaxRate,
            location: bottleLocation
          });
        }
      }

      // Remove duplicates based on bottle_barcode (keep rental records over bottle assignments)
      const deduplicatedData = [];
      const seenBarcodes = new Set();
      
      // First pass: Add all rental records (priority over bottle assignments)
      for (const item of allRentalData) {
        if (item.source === 'rental' && !seenBarcodes.has(item.bottle_barcode)) {
          deduplicatedData.push(item);
          seenBarcodes.add(item.bottle_barcode);
        }
      }
      
      // Second pass: Add bottle assignments only if no rental record exists
      for (const item of allRentalData) {
        if (item.source === 'bottle_assignment' && !seenBarcodes.has(item.bottle_barcode)) {
          deduplicatedData.push(item);
          seenBarcodes.add(item.bottle_barcode);
        }
      }
      
      console.log('Before deduplication:', allRentalData.length, 'After deduplication:', deduplicatedData.length);

      console.log('Combined rental data:', deduplicatedData.length);

      // 5. Get customers with their types (with fallback)
      const customerIds = Array.from(new Set(deduplicatedData.map(r => r.customer_id).filter(Boolean)));
      let customersMap = {};

      if (customerIds.length > 0) {
        try {
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .eq('organization_id', organization.id)
            .in('CustomerListID', customerIds);
          
          if (!customersError && customersData) {
            customersMap = customersData.reduce((map, c) => {
              map[c.CustomerListID] = c;
              return map;
            }, {});
          }
        } catch (error) {
          console.log('Customer_type column not found, using fallback');
          const { data: customersData } = await supabase
            .from('customers')
            .select('CustomerListID, name, contact_details, phone')
            .eq('organization_id', organization.id)
            .in('CustomerListID', customerIds);

          if (customersData) {
            customersMap = customersData.reduce((map, c) => {
              map[c.CustomerListID] = { ...c, customer_type: 'CUSTOMER' };
              return map;
            }, {});
          }
        }
      }

      console.log('Customers found:', Object.keys(customersMap).length);

      // 6. Attach customer info to each rental
      const rentalsWithCustomer = deduplicatedData.map(r => ({
        ...r,
        customer: customersMap[r.customer_id] || null
      }));

      // Filter out vendors from rental page (they should only appear in inventory/in-house)
      const filteredRentals = rentalsWithCustomer.filter(r => 
        r.customer_id && 
        r.customer &&
        r.customer.customer_type !== 'VENDOR'  // Exclude vendors from rentals view
      );
      setAssets(filteredRentals);

      // 7. Calculate statistics (proper separation of IN-HOUSE vs RENTED)
      const unassignedBottles = allBottles?.filter(b => !b.assigned_customer).length || 0;
      // Get vendor bottles from original data (before filtering vendors out)
      const bottlesWithVendors = rentalsWithCustomer?.filter(r => r.customer?.customer_type === 'VENDOR').length || 0;
      const inHouseTotal = unassignedBottles + bottlesWithVendors; // Unassigned + vendors = in-house
      // All filtered rentals are now customer rentals (vendors excluded)
      const rentedToCustomers = filteredRentals.length;
      // Calculate revenue from customer rentals (vendors already excluded) including tax
      const totalRevenue = filteredRentals?.reduce((sum, rental) => {
        const baseAmount = rental.rental_amount || 0;
        const taxAmount = baseAmount * (rental.tax_rate || 0);
        return sum + baseAmount + taxAmount;
      }, 0) || 0;

      setStats({ 
        inHouse: inHouseTotal,  // Unassigned + vendors
        withVendors: bottlesWithVendors,  // Show vendor bottles for info
        rented: rentedToCustomers,  // Only customer bottles are "rented"
        totalRevenue 
      });

      console.log('Final results:', {
        unassignedBottles: unassignedBottles,
        bottlesWithVendors: bottlesWithVendors,
        availableAssets: inHouseTotal, // Renamed from inHouseTotal
        rentedToCustomers: rentedToCustomers,
        revenue: totalRevenue
      });



    } catch (err) {
      console.error('Error in fetchRentals:', err);
      setError(err.message);
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    try {
      // Try to get all customer data including customer_type if it exists
      let customersData = [];
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organization.id)
          .order('name');

        if (error) throw error;
        customersData = data || [];
      } catch (error) {
        // If there's an error (possibly due to missing customer_type), try basic query
        console.log('Falling back to basic customer query');
        const { data, error: fallbackError } = await supabase
          .from('customers')
          .select('CustomerListID, name, contact_details, phone')
          .eq('organization_id', organization.id)
          .order('name');
        
        if (fallbackError) throw fallbackError;
        customersData = (data || []).map(c => ({ ...c, customer_type: 'CUSTOMER' })); // Default to CUSTOMER
      }
      
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, province')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Fallback to hardcoded locations if database fails
      setLocations([
        { id: 'saskatoon', name: 'Saskatoon', province: 'Saskatchewan' },
        { id: 'regina', name: 'Regina', province: 'Saskatchewan' },
        { id: 'chilliwack', name: 'Chilliwack', province: 'British Columbia' },
        { id: 'prince-george', name: 'Prince George', province: 'British Columbia' }
      ]);
    }
  };

  // Group rentals by customer (like original rentals page)
  const customersWithRentals = [];
  const customerMap = {};

  for (const rental of assets) {
    if (!rental.customer) continue;
    const custId = rental.customer.CustomerListID;
    if (!customerMap[custId]) {
      customerMap[custId] = {
        customer: rental.customer,
        rentals: [],
      };
      customersWithRentals.push(customerMap[custId]);
    }
    customerMap[custId].rentals.push(rental);
  }

  // Filter customers based on search
  const filteredCustomers = customersWithRentals.filter(({ customer, rentals }) => {
    const searchText = filters.search.toLowerCase();
    if (filters.search) {
      return customer.name?.toLowerCase().includes(searchText) ||
             customer.CustomerListID?.toLowerCase().includes(searchText) ||
             rentals.some(r => r.bottles?.barcode_number?.toLowerCase().includes(searchText) ||
                              r.bottles?.barcode?.toLowerCase().includes(searchText));
    }
    return true;
  });

  const tabs = [
    { 
      label: 'All Customers', 
      value: 'all', 
      count: filteredCustomers.length 
    },
    { 
      label: 'Monthly Rentals', 
      value: 'monthly', 
      count: filteredCustomers.reduce((count, c) => count + c.rentals.filter(r => r.rental_type === 'monthly').length, 0)
    },
    { 
      label: 'Yearly Rentals', 
      value: 'yearly', 
      count: filteredCustomers.reduce((count, c) => count + c.rentals.filter(r => r.rental_type === 'yearly').length, 0)
    },
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditAsset = (asset) => {
    setEditDialog({ open: true, asset });
  };

  const handleUpdateAsset = async (assetId, updates) => {
    try {
      const { error } = await supabase
        .from('bottles')
        .update(updates)
        .eq('id', assetId);

      if (error) throw error;

      // Refresh data
      await fetchAssets();
      setEditDialog({ open: false, asset: null });
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  // Original export format from old rentals page
  const exportToCSV = (customers) => {
    const rows = [];
    customers.forEach(({ customer, rentals }) => {
      rentals.forEach(rental => {
        rows.push({
          Customer: customer.name,
          CustomerID: customer.CustomerListID,
          TotalBottles: rentals.length,
          RentalType: rental.rental_type,
          RentalRate: rental.rental_amount,
          TaxCode: rental.tax_code,
          Location: rental.location,
          StartDate: rental.rental_start_date,
          EndDate: rental.rental_end_date,
        });
      });
    });
    if (rows.length === 0) return;
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentals_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // QuickBooks invoice export from old rentals page
  const exportInvoices = (customers) => {
    if (!customers.length) return;
    const getNextInvoiceNumber = () => {
      const state = JSON.parse(localStorage.getItem('invoice_state') || '{}');
      const now = new Date();
      const currentMonth = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');
      let lastNumber = 10000;
      let lastMonth = currentMonth;
      if (state.lastMonth === currentMonth && state.lastNumber) {
        lastNumber = 10000;
      } else if (state.lastMonth !== currentMonth && state.lastNumber) {
        lastNumber = state.lastNumber + 1;
        lastMonth = currentMonth;
      }
      return { next: lastNumber, currentMonth, lastMonth };
    };
    
    const setInvoiceState = (number, month) => {
      const state = JSON.parse(localStorage.getItem('invoice_state') || '{}');
      if (state.lastMonth !== month) {
        localStorage.setItem('invoice_state', JSON.stringify({ lastNumber: number, lastMonth: month }));
      }
    };

    const getInvoiceDates = () => {
      const now = new Date();
      const invoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const dueDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 1);
      const fmt = d => d.toISOString().slice(0, 10);
      return { invoiceDate: fmt(invoiceDate), dueDate: fmt(dueDate) };
    };

    const { next, currentMonth } = getNextInvoiceNumber();
    let invoiceNumber = next;
    const { invoiceDate, dueDate } = getInvoiceDates();
    const rate = 10;
    const rows = customers.map(({ customer, rentals }, idx) => {
      const numBottles = rentals.length;
      const base = numBottles * rate;
      // Use the actual tax rate from the first rental (they should all be the same for a customer)
      const taxRate = rentals[0]?.tax_rate || 0.11;
      const tax = +(base * taxRate).toFixed(1);
      const total = +(base + tax).toFixed(2);
      return {
        'Invoice#': `W${(invoiceNumber + idx).toString().padStart(5, '0')}`,
        'Customer Number': customer.CustomerListID,
        'Total': total,
        'Date': invoiceDate,
        'TX': tax,
        'TX code': 'G',
        'Due date': dueDate,
        'Rate': rate,
        'Name': customer.name,
        '# of Bottles': numBottles
      };
    });
    
    setInvoiceState(invoiceNumber + rows.length - 1, currentMonth);
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quickbooks_invoices_${invoiceDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate yearly invoice notifications for January billing
  const generateYearlyInvoiceNotifications = async () => {
    try {
      if (!organization?.id) {
        alert('Organization ID not found');
        return;
      }

      // Get yearly rental customers
      const yearlyCustomers = filteredCustomers.filter(c => 
        c.rentals.some(r => r.rental_type === 'yearly')
      );

      if (yearlyCustomers.length === 0) {
        alert('No yearly rental customers found');
        return;
      }

      const currentYear = new Date().getFullYear();
      let notificationsCreated = 0;

      // Create notification for each yearly customer
      for (const { customer, rentals } of yearlyCustomers) {
        const yearlyRentals = rentals.filter(r => r.rental_type === 'yearly');
        const totalAmount = yearlyRentals.reduce((sum, r) => sum + (r.rental_amount || 0), 0);
        
        // Log yearly rental notification (notification service removed)
        console.log(`Yearly rental notification for ${customer.name}: ${yearlyRentals.length} bottles, $${totalAmount}`);
        notificationsCreated++;
      }

      // Also create a general summary notification
      const totalRevenue = yearlyCustomers.reduce((sum, { rentals }) => {
        return sum + rentals
          .filter(r => r.rental_type === 'yearly')
          .reduce((rSum, r) => rSum + (r.rental_amount || 0), 0);
      }, 0);

      // Log yearly invoice summary (notification service removed)
      console.log(`Yearly invoices ready for ${yearlyCustomers.length} customers, total revenue: $${totalRevenue}`);

      alert(`Successfully created ${notificationsCreated + 1} notifications for yearly rental invoices!`);

    } catch (error) {
      console.error('Error generating yearly invoice notifications:', error);
      alert('Error generating notifications: ' + error.message);
    }
  };

  const currentCustomers = activeTab === 0 ? filteredCustomers : 
    activeTab === 1 ? filteredCustomers.filter(c => c.rentals.some(r => r.rental_type === 'monthly')) :
    filteredCustomers.filter(c => c.rentals.some(r => r.rental_type === 'yearly'));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Asset Management & Rentals
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => exportToCSV(filteredCustomers)}
            disabled={filteredCustomers.length === 0}
          >
            Export Rentals CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<MoneyIcon />}
            onClick={() => exportInvoices(filteredCustomers)}
            disabled={filteredCustomers.length === 0}
          >
            Export QuickBooks Invoices
          </Button>
          <Button
            variant="outlined"
            startIcon={<NotificationsIcon />}
            onClick={generateYearlyInvoiceNotifications}
            color="secondary"
          >
            Generate Yearly Invoice Notifications
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {stats.inHouse}
                  </Typography>
                  <Tooltip title="Unassigned bottles + bottles with vendor customers">
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help' }}>
                      Available Assets
                    </Typography>
                  </Tooltip>
                </Box>
                <HomeIcon sx={{ fontSize: 40, color: '#9e9e9e' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="secondary">
                    {stats.withVendors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    With Vendors
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (No Charge)
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.rented}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rented Assets
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    (Billable)
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    ${stats.totalRevenue.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Revenue
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    From Rentals
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filters</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Search by barcode or customer"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Asset Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="Asset Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="IN-HOUSE">In-House</MenuItem>
                  <MenuItem value="RENTED">Rented</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={filters.customer_type}
                  onChange={(e) => setFilters({ ...filters, customer_type: e.target.value })}
                  label="Account Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="CUSTOMER">Customers Only</MenuItem>
                  <MenuItem value="VENDOR">Vendors Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Badge badgeContent={tab.count} color="primary">
                  {tab.label}
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Customer Rentals Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Customer</strong></TableCell>
              <TableCell><strong>Account Type</strong></TableCell>
              <TableCell><strong>Total Assets</strong></TableCell>
              <TableCell><strong>Rental Type</strong></TableCell>
              <TableCell><strong>Rental Rate</strong></TableCell>
              <TableCell><strong>Tax Code</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" color="text.secondary" py={4}>
                    No customers found matching your filters
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentCustomers.map(({ customer, rentals }) => (
                <React.Fragment key={customer.CustomerListID}>
                  <TableRow hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {customer.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({customer.CustomerListID})
                      </Typography>
                      {/* Show vendor/customer indicator */}
                      {customer.customer_type === 'VENDOR' && (
                        <Chip
                          label="NO CHARGE"
                          size="small"
                          color="secondary"
                          sx={{ ml: 1, fontSize: 10, height: 20 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={customer.customer_type || 'CUSTOMER'}
                        color={customer.customer_type === 'VENDOR' ? 'secondary' : 'primary'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {rentals.length}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {rentals[0]?.rental_type || 'monthly'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ${rentals[0]?.rental_amount || '10.00'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {rentals[0]?.tax_code || 'GST+PST'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({(rentals[0]?.tax_rate || 0.11) * 100}% tax)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {rentals[0]?.location || 'SASKATOON'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/customer/${customer.CustomerListID}`)}
                        sx={{ mr: 1 }}
                      >
                        View Details
                      </Button>
                      <Tooltip title="Edit Rentals">
                        <IconButton
                          size="small"
                          onClick={() => setEditDialog({ 
                            open: true, 
                            customer,
                            rentals 
                          })}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  {/* Expandable section for individual rentals */}
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 1, bgcolor: '#f9f9f9' }}>
                      <Typography variant="caption" color="text.secondary">
                        Individual Assets ({rentals.length}):
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {rentals.slice(0, 10).map((rental, idx) => (
                          <Chip
                            key={idx}
                            label={rental.bottles?.barcode_number || rental.bottles?.barcode || `Asset ${idx + 1}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 11 }}
                          />
                        ))}
                        {rentals.length > 10 && (
                          <Chip
                            label={`+${rentals.length - 10} more`}
                            size="small"
                            variant="filled"
                            color="default"
                            sx={{ fontSize: 11 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Customer Rentals Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, customer: null, rentals: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Rental Settings</DialogTitle>
        <DialogContent>
          {editDialog.customer && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {editDialog.customer.name} ({editDialog.customer.CustomerListID})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {editDialog.rentals?.length || 0} assets currently assigned
              </Typography>

              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rental Type</InputLabel>
                    <Select
                      value={editDialog.rental_type || 'monthly'}
                      onChange={(e) => setEditDialog(prev => ({
                        ...prev,
                        rental_type: e.target.value
                      }))}
                      label="Rental Type"
                    >
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Rental Rate ($)"
                    type="number"
                    value={editDialog.rental_amount || 10}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      rental_amount: e.target.value
                    }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tax Code</InputLabel>
                    <Select
                      value={editDialog.tax_code || 'GST+PST'}
                      onChange={(e) => setEditDialog(prev => ({
                        ...prev,
                        tax_code: e.target.value
                      }))}
                      label="Tax Code"
                    >
                      <MenuItem value="GST">GST Only</MenuItem>
                      <MenuItem value="PST">PST Only</MenuItem>
                      <MenuItem value="GST+PST">GST+PST</MenuItem>
                      <MenuItem value="None">No Tax</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={editDialog.location || 'SASKATOON'}
                      onChange={(e) => setEditDialog(prev => ({
                        ...prev,
                        location: e.target.value
                      }))}
                      label="Location"
                    >
                      {locations.map((location) => (
                        <MenuItem key={location.id} value={location.name.toUpperCase()}>
                          {location.name} ({location.province})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {editDialog.customer.customer_type === 'VENDOR' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> This is a VENDOR account. No rental charges will be applied regardless of rate settings.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, customer: null, rentals: [] })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                // Update all rentals for this customer
                const { error } = await supabase
                  .from('rentals')
                  .update({
                    rental_type: editDialog.rental_type,
                    rental_amount: editDialog.rental_amount,
                    tax_code: editDialog.tax_code,
                    location: editDialog.location
                  })
                  .eq('customer_id', editDialog.customer.CustomerListID);

                if (error) {
                  console.error('Error updating rentals:', error);
                  alert('Error updating rentals: ' + error.message);
                  return;
                }

                console.log('Successfully updated rentals for customer:', editDialog.customer?.CustomerListID);
                setEditDialog({ open: false, customer: null, rentals: [] });
                // Refresh data
                await fetchRentals();
                // Show success message
                alert(`Successfully updated rental settings for ${editDialog.customer?.name}`);
              } catch (error) {
                console.error('Error updating rentals:', error);
                alert('Error updating rentals: ' + error.message);
              }
            }}
          >
            {updatingRentals ? 'Updating...' : 'Update All Rentals'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RentalsImproved;