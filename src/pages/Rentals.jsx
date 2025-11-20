import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Card, CardContent, Grid, Chip, IconButton, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Tooltip, Badge, Collapse
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
  Receipt as InvoiceIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
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
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());

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

      logger.log('Fetching rentals for organization:', organization.id);

      // Simplified approach - get all data separately to debug
      // 1. Get all active rentals (from rentals table) for this organization
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('*')
        .eq('organization_id', organization.id)
        .is('rental_end_date', null);

      if (rentalsError) {
        logger.error('Rentals query error:', rentalsError);
        throw rentalsError;
      }

      logger.log('All active rentals:', rentalsData?.length || 0);

      // 2. Get all assigned bottles for this organization
      const { data: assignedBottles, error: bottlesError } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id)
        .not('assigned_customer', 'is', null);

      if (bottlesError) {
        logger.error('Bottles query error:', bottlesError);
        throw bottlesError;
      }

      logger.log('Assigned bottles for org:', assignedBottles?.length || 0);

      // 3. Get all bottles for this organization (to join with rentals)
      const { data: allBottles, error: allBottlesError } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id);

      if (allBottlesError) {
        logger.error('All bottles query error:', allBottlesError);
        throw allBottlesError;
      }

      // Create a map of bottles for quick lookup
      const bottlesMap = (allBottles || []).reduce((map, bottle) => {
        map[bottle.barcode_number || bottle.barcode] = bottle;
        return map;
      }, {});

      logger.log('Total bottles for org:', allBottles?.length || 0);

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
      
      logger.log('Location tax rates loaded:', locationTaxMap);
      
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
      
      logger.log('Before deduplication:', allRentalData.length, 'After deduplication:', deduplicatedData.length);

      logger.log('Combined rental data:', deduplicatedData.length);

      // 5. Fetch active lease agreements first to get their customer IDs
      const { data: leaseAgreements, error: leaseError } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'active');

      if (leaseError) {
        logger.error('Error fetching lease agreements:', leaseError);
      }

      // 6. Get customers with their types (with fallback) - include lease agreement customers
      const customerIds = Array.from(new Set([
        ...deduplicatedData.map(r => r.customer_id).filter(Boolean),
        ...(leaseAgreements || []).map(a => a.customer_id).filter(Boolean)
      ]));
      let customersMap = {};

      logger.log('Looking up customers for IDs:', customerIds.length);

      if (customerIds.length > 0) {
        // Batch customer lookups to avoid URL length limits (max ~100 IDs per batch)
        const BATCH_SIZE = 100;
        const batches = [];
        for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
          batches.push(customerIds.slice(i, i + BATCH_SIZE));
        }
        
        logger.log(`Splitting ${customerIds.length} customer IDs into ${batches.length} batches`);

        try {
          // Fetch all batches in parallel
          const batchPromises = batches.map(async (batch) => {
            const { data: customersData, error: customersError } = await supabase
              .from('customers')
              .select('*')
              .eq('organization_id', organization.id)
              .in('CustomerListID', batch);
            
            if (customersError) {
              logger.error(`Error fetching customer batch:`, customersError);
              return [];
            }
            
            return customersData || [];
          });

          const allCustomersData = (await Promise.all(batchPromises)).flat();
          
          logger.log('Customers fetched from database:', allCustomersData.length);
          customersMap = allCustomersData.reduce((map, c) => {
            map[c.CustomerListID] = c;
            return map;
          }, {});
          
          // Log which customer IDs were found vs not found
          const foundIds = Object.keys(customersMap);
          const notFoundIds = customerIds.filter(id => !foundIds.includes(id));
          if (notFoundIds.length > 0) {
            logger.warn(`Customer IDs not found in database: ${notFoundIds.length} out of ${customerIds.length}`);
            if (notFoundIds.length <= 10) {
              logger.warn('Missing customer IDs:', notFoundIds);
            }
          }
        } catch (error) {
          logger.log('Customer_type column not found, using fallback:', error);
          
          // Try fallback with batching
          const batchPromises = batches.map(async (batch) => {
            const { data: customersData, error: fallbackError } = await supabase
              .from('customers')
              .select('CustomerListID, name, contact_details, phone')
              .eq('organization_id', organization.id)
              .in('CustomerListID', batch);

            if (fallbackError) {
              logger.error(`Error in fallback customer batch query:`, fallbackError);
              return [];
            }

            return customersData || [];
          });

          const allCustomersData = (await Promise.all(batchPromises)).flat();

          if (allCustomersData.length > 0) {
            logger.log('Customers fetched (fallback):', allCustomersData.length);
            customersMap = allCustomersData.reduce((map, c) => {
              map[c.CustomerListID] = { ...c, customer_type: 'CUSTOMER' };
              return map;
            }, {});
          }
        }
      }

      logger.log('Total customers found in map:', Object.keys(customersMap).length);
      logger.log('Customer IDs in map:', Object.keys(customersMap));

      // 7. Process lease agreements and include them as yearly rentals
      if (leaseAgreements && leaseAgreements.length > 0) {
        logger.log('Found lease agreements:', leaseAgreements.length);
        
        // Convert lease agreements to rental format for yearly billing
        for (const agreement of leaseAgreements) {
          // Check if billing_frequency indicates yearly (could be 'annual', 'yearly', 'annually', or 'semi-annual')
          // Note: 'semi-annual' is also considered yearly for rental purposes
          const billingFreq = (agreement.billing_frequency || '').toLowerCase();
          const isYearly = billingFreq === 'annual' || 
                          billingFreq === 'yearly' || 
                          billingFreq === 'annually' ||
                          billingFreq === 'semi-annual';
          
          if (isYearly) {
            // Get customer for this agreement - try both customer_id and customer_name as keys
            let customer = customersMap[agreement.customer_id];
            
            // If not found by customer_id, try to find by customer_name
            if (!customer && agreement.customer_name) {
              customer = Object.values(customersMap).find(c => 
                c.name === agreement.customer_name || 
                c.CustomerListID === agreement.customer_name
              );
            }
            
            // If still not found, create a placeholder customer object
            if (!customer && agreement.customer_id) {
              customer = { 
                CustomerListID: agreement.customer_id, 
                name: agreement.customer_name || agreement.customer_id,
                customer_type: 'CUSTOMER'
              };
              // Add to customersMap so it's available later
              customersMap[agreement.customer_id] = customer;
            }
            
            if (customer) {
              // Calculate monthly equivalent from annual amount
              const monthlyAmount = (agreement.annual_amount || 0) / 12;
              
              // Create a virtual rental entry for the lease agreement
              // Use a special ID format to distinguish from regular rentals
              const leaseRentalId = `lease_${agreement.id}`;
              
              // Check if we already have rentals for this customer
              const existingCustomerRentals = deduplicatedData.filter(r => r.customer_id === agreement.customer_id);
              
              // If customer has no existing rentals, create a placeholder
              // Otherwise, we'll mark existing rentals as yearly
              if (existingCustomerRentals.length === 0) {
                deduplicatedData.push({
                  id: leaseRentalId,
                  source: 'lease_agreement',
                  customer_id: agreement.customer_id,
                  bottle_barcode: null, // Lease agreements don't have specific bottles
                  bottle_id: null,
                  bottles: null,
                  rental_start_date: agreement.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
                  rental_end_date: agreement.end_date?.split('T')[0] || null,
                  rental_amount: monthlyAmount,
                  rental_type: 'yearly', // Mark as yearly
                  tax_code: 'GST+PST',
                  tax_rate: agreement.tax_rate || 0.11,
                  location: agreement.asset_locations?.[0] || 'SASKATOON',
                  lease_agreement_id: agreement.id,
                  lease_agreement: agreement
                });
              } else {
                // Update existing rentals for this customer to be yearly
                existingCustomerRentals.forEach(rental => {
                  rental.rental_type = 'yearly';
                  rental.lease_agreement_id = agreement.id;
                  rental.lease_agreement = agreement;
                  // Update rental amount if needed
                  if (monthlyAmount > 0) {
                    rental.rental_amount = monthlyAmount;
                  }
                });
              }
            }
          }
        }
      }

      // 7. Attach customer info to each rental
      const rentalsWithCustomer = deduplicatedData.map(r => ({
        ...r,
        customer: customersMap[r.customer_id] || null
      }));

      logger.log('Rentals with customer info:', rentalsWithCustomer.length);
      logger.log('Unique customer IDs:', [...new Set(rentalsWithCustomer.map(r => r.customer_id).filter(Boolean))]);
      logger.log('Customers map keys:', Object.keys(customersMap));

      // Filter out vendors from rental page (they should only appear in inventory/in-house)
      const filteredRentals = rentalsWithCustomer.filter(r => 
        r.customer_id && 
        r.customer &&
        r.customer.customer_type !== 'VENDOR'  // Exclude vendors from rentals view
      );
      
      logger.log('Filtered rentals (vendors excluded):', filteredRentals.length);
      const uniqueCustomerIds = [...new Set(filteredRentals.map(r => r.customer?.CustomerListID).filter(Boolean))];
      logger.log('Unique customers in filtered rentals:', uniqueCustomerIds.length, uniqueCustomerIds);
      
      // Log distribution of rentals by customer
      const customerDistribution = {};
      filteredRentals.forEach(r => {
        const custId = r.customer?.CustomerListID;
        if (custId) {
          customerDistribution[custId] = (customerDistribution[custId] || 0) + 1;
        }
      });
      logger.log('Rentals per customer:', customerDistribution);
      
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

      logger.log('Final results:', {
        unassignedBottles: unassignedBottles,
        bottlesWithVendors: bottlesWithVendors,
        availableAssets: inHouseTotal, // Renamed from inHouseTotal
        rentedToCustomers: rentedToCustomers,
        revenue: totalRevenue
      });



    } catch (err) {
      logger.error('Error in fetchRentals:', err);
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
        logger.log('Falling back to basic customer query');
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
      logger.error('Error fetching customers:', error);
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
      logger.error('Error fetching locations:', error);
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

  logger.log('Grouping rentals - total assets:', assets.length);
  
  for (const rental of assets) {
    if (!rental.customer) {
      logger.warn('Rental missing customer:', rental.customer_id, rental.bottle_barcode);
      continue;
    }
    const custId = rental.customer.CustomerListID;
    if (!custId) {
      logger.warn('Rental customer missing CustomerListID:', rental.customer);
      continue;
    }
    if (!customerMap[custId]) {
      customerMap[custId] = {
        customer: rental.customer,
        rentals: [],
      };
      customersWithRentals.push(customerMap[custId]);
    }
    customerMap[custId].rentals.push(rental);
  }
  
  logger.log('Customers with rentals:', customersWithRentals.length);
  logger.log('Customer IDs:', customersWithRentals.map(c => c.customer.CustomerListID));

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
      logger.error('Error updating asset:', error);
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
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ pt: 3  }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Filters</Typography>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={6} md={8.2}>
              <TextField  
                fullWidth
                label="Search by barcode or customer"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
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
            <Grid item xs={12} sm={6} md={4}>
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
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              minHeight: 48,
              px: 3,
              py: 1.5,
              '&.Mui-selected': {
                fontWeight: 600,
              }
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{tab.label}</span>
                  <Chip 
                    label={tab.count} 
                    size="small" 
                    sx={{ 
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      minWidth: 24,
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                </Box>
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
              currentCustomers.map(({ customer, rentals }, index) => (
                <React.Fragment key={customer.CustomerListID}>
                  <TableRow 
                    hover
                    sx={{ 
                      borderBottom: index < currentCustomers.length - 1 ? '3px solid #e0e0e0' : 'none',
                      '&:hover': {
                        bgcolor: '#fafafa'
                      }
                    }}
                  >
                    <TableCell sx={{ py: 2.5 }}>
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
                    <TableCell sx={{ py: 2.5 }}>
                      <Chip
                        label={customer.customer_type || 'CUSTOMER'}
                        color={customer.customer_type === 'VENDOR' ? 'secondary' : 'primary'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {rentals.length}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography variant="body2">
                        {rentals[0]?.rental_type || 'monthly'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        ${rentals[0]?.rental_amount || '10.00'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography variant="body2">
                        {rentals[0]?.tax_code || 'GST+PST'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({(rentals[0]?.tax_rate || 0.11) * 100}% tax)
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography variant="body2">
                        {rentals[0]?.location || 'SASKATOON'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
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
                    <TableCell 
                      colSpan={8} 
                      sx={{ 
                        p: 0,
                        borderBottom: index < currentCustomers.length - 1 ? '3px solid #e0e0e0' : 'none'
                      }}
                    >
                      <Box>
                        <Box
                          onClick={() => {
                            const newExpanded = new Set(expandedCustomers);
                            if (newExpanded.has(customer.CustomerListID)) {
                              newExpanded.delete(customer.CustomerListID);
                            } else {
                              newExpanded.add(customer.CustomerListID);
                            }
                            setExpandedCustomers(newExpanded);
                          }}
                          sx={{
                            p: 1.5,
                            bgcolor: '#f5f5f5',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            '&:hover': {
                              bgcolor: '#eeeeee'
                            }
                          }}
                        >
                          {expandedCustomers.has(customer.CustomerListID) ? (
                            <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          ) : (
                            <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          )}
                          <Typography variant="caption" color="text.secondary" fontWeight="medium">
                            Individual Assets ({rentals.length})
                          </Typography>
                        </Box>
                        <Collapse in={expandedCustomers.has(customer.CustomerListID)}>
                          <Box sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {rentals.map((rental, idx) => {
                                const barcode = rental.bottles?.barcode_number || rental.bottles?.barcode || `Asset ${idx + 1}`;
                                return (
                                  <Chip
                                    key={idx}
                                    label={barcode}
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      // Navigate to bottle details page
                                      const bottleId = rental.bottles?.id || rental.bottle_id;
                                      if (bottleId) {
                                        navigate(`/bottle/${bottleId}`);
                                      }
                                    }}
                                    sx={{ 
                                      fontSize: 11,
                                      cursor: 'pointer',
                                      '&:hover': {
                                        bgcolor: 'primary.light',
                                        color: 'primary.contrastText',
                                        borderColor: 'primary.main'
                                      }
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        </Collapse>
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
                  logger.error('Error updating rentals:', error);
                  alert('Error updating rentals: ' + error.message);
                  return;
                }

                logger.log('Successfully updated rentals for customer:', editDialog.customer?.CustomerListID);
                setEditDialog({ open: false, customer: null, rentals: [] });
                // Refresh data
                await fetchRentals();
                // Show success message
                alert(`Successfully updated rental settings for ${editDialog.customer?.name}`);
              } catch (error) {
                logger.error('Error updating rentals:', error);
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