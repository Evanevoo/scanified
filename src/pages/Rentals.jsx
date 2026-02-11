import logger from '../utils/logger';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { useDebounce } from '../utils/performance';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Card, CardContent, Grid, Chip, IconButton, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Tooltip, Badge, Collapse, FormControlLabel, Checkbox
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
  ExpandLess as ExpandLessIcon,
  Email as EmailIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import InvoiceGenerator from '../components/InvoiceGenerator';
import BulkInvoiceEmailDialog from '../components/BulkInvoiceEmailDialog';
import DNSConversionDialog from '../components/DNSConversionDialog';
import { getNextInvoiceNumbers, getNextAgreementNumbers, toCsv, downloadFile } from '../utils/invoiceUtils';

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
  const [invoiceDialog, setInvoiceDialog] = useState({ open: false, customer: null, rentals: [] });
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [updatingRentals, setUpdatingRentals] = useState(false);
  const [exportingInvoices, setExportingInvoices] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    customer_type: 'all',
    search: '',
    showDNSOnly: false
  });
  const debouncedSearch = useDebounce(filters.search, 300);
  const [locations, setLocations] = useState([]);
  const [expandedCustomers, setExpandedCustomers] = useState(() => new Set());

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

      // Parallel fetch: rentals, bottles, locations, pricing, leases
      const [
        { data: rentalsData, error: rentalsError },
        { data: assignedBottles, error: bottlesError },
        { data: allBottles, error: allBottlesError },
        { data: locationsData },
        { data: customerPricing },
        { data: leaseAgreements, error: leaseError }
      ] = await Promise.all([
        supabase.from('rentals').select('*').is('rental_end_date', null).eq('organization_id', organization.id),
        supabase.from('bottles').select('*, customers:assigned_customer(customer_type)').eq('organization_id', organization.id).not('assigned_customer', 'is', null),
        supabase.from('bottles').select('*').eq('organization_id', organization.id),
        supabase.from('locations').select('id, name, total_tax_rate').eq('organization_id', organization.id),
        supabase.from('customer_pricing').select('*').eq('organization_id', organization.id),
        supabase.from('lease_agreements').select('*').eq('organization_id', organization.id).eq('status', 'active'),
      ]);

      if (rentalsError) throw rentalsError;
      if (bottlesError) throw bottlesError;
      if (allBottlesError) throw allBottlesError;

      // Create a map of bottles for quick lookup by barcode AND by bottle_id
      const bottlesMap = (allBottles || []).reduce((map, bottle) => {
        const barcode = bottle.barcode_number || bottle.barcode;
        if (barcode) {
          map[barcode] = bottle;
        }
        // Also map by bottle_id for rentals that reference bottles by ID
        if (bottle.id) {
          map[`id:${bottle.id}`] = bottle;
        }
        return map;
      }, {});

      const totalBottles = allBottles?.length || 0;
      const assignedBottlesCount = assignedBottles?.length || 0;
      const unassignedBottles = totalBottles - assignedBottlesCount;
      
      const allRentalData = [];
      const locationTaxMap = (locationsData || []).reduce((map, location) => {
        map[location.name.toUpperCase()] = location.total_tax_rate / 100; // Convert percentage to decimal
        return map;
      }, {});

      // Add rentals that have matching bottles in this organization
      // Also include DNS rentals (is_dns = true) even if they don't have matching bottles
      let rentalsIncluded = 0;
      let rentalsExcluded = 0;
      
      for (const rental of rentalsData || []) {
        // Try to find bottle by barcode first
        let bottle = bottlesMap[rental.bottle_barcode];
        
        // If not found by barcode, try by bottle_id (for rentals with placeholder barcodes)
        if (!bottle && rental.bottle_id) {
          bottle = bottlesMap[`id:${rental.bottle_id}`];
        }
        
        const isDNS = rental.is_dns === true;
        
        // Include rental if:
        // 1. It has a matching bottle (by barcode OR by bottle_id), OR
        // 2. It's a DNS rental, OR
        // 3. It has a bottle_id (bottle exists but barcode might be placeholder)
        if (bottle || isDNS || rental.bottle_id) {
          rentalsIncluded++;
          // For DNS rentals, use rental location or default
          const rentalLocation = bottle 
            ? (rental.location || bottle.location || 'SASKATOON').toUpperCase()
            : (rental.location || 'SASKATOON').toUpperCase();
          const locationTaxRate = locationTaxMap[rentalLocation] || rental.tax_rate || 0.11;
          
          allRentalData.push({
            ...rental,
            source: 'rental',
            bottles: bottle || null, // null for DNS rentals without bottles
            tax_rate: locationTaxRate,
            location: rentalLocation,
            is_dns: isDNS
          });
        } else {
          rentalsExcluded++;
        }
      }

      // Helper to detect placeholder barcodes (used in multiple places)
      const isPlaceholderBarcode = (barcode) => {
        if (!barcode || typeof barcode !== 'string') return false;
        const normalized = barcode.trim().toLowerCase();
        return normalized === 'delivered not-scanned' || 
               normalized === 'delivered not scanned' ||
               normalized === 'returned not-scanned' ||
               normalized === 'returned not scanned' ||
               normalized === 'not scanned' ||
               normalized === 'dns';
      };
      
      const rentalsByBottleId = (rentalsData || []).filter(r => r.bottle_id);
      if (rentalsByBottleId.length > 0) {
        let rentalsByBottleIdAdded = 0;
        // Add rentals that weren't already included (by bottle_id lookup)
        for (const rental of rentalsByBottleId) {
          const bottle = bottlesMap[`id:${rental.bottle_id}`] || bottlesMap[rental.bottle_barcode];
          const isDNS = rental.is_dns === true;
          
          // Check if this rental is already in allRentalData
          const alreadyIncluded = allRentalData.some(r => r.id === rental.id);
          
          // Include rental if:
          // 1. It has a matching bottle, OR
          // 2. It's a DNS rental, OR
          // 3. It has a bottle_id (even if bottle not found in bottlesMap - bottle might exist in assignedBottles)
          // We should include ALL rentals with bottle_id because those bottles exist (they're in assignedBottles)
          if (!alreadyIncluded && (bottle || isDNS || rental.bottle_id)) {
            const rentalLocation = bottle 
              ? (rental.location || bottle.location || 'SASKATOON').toUpperCase()
              : (rental.location || 'SASKATOON').toUpperCase();
            const locationTaxRate = locationTaxMap[rentalLocation] || rental.tax_rate || 0.11;
            
            allRentalData.push({
              ...rental,
              source: 'rental',
              bottles: bottle || null,
              tax_rate: locationTaxRate,
              location: rentalLocation,
              is_dns: isDNS
            });
            rentalsByBottleIdAdded++;
          }
        }
      }

      // Add bottles that are assigned but don't have rental records
      // Track both barcodes AND bottle_ids to catch all cases
      const existingBottleBarcodes = new Set();
      const existingBottleIds = new Set();
      
      allRentalData.forEach(r => {
        // Only track real barcodes (not placeholders) to avoid false matches
        if (r.bottle_barcode && !isPlaceholderBarcode(r.bottle_barcode)) {
          existingBottleBarcodes.add(r.bottle_barcode);
        }
        if (r.bottle_id) existingBottleIds.add(r.bottle_id);
        if (r.bottles?.id) existingBottleIds.add(r.bottles.id);
      });
      
      const pricingMap = (customerPricing || []).reduce((map, pricing) => {
        map[pricing.customer_id] = pricing;
        return map;
      }, {});
      
      let bottlesAdded = 0;
      let bottlesSkipped = 0;
      
      for (const bottle of assignedBottles || []) {
        const barcode = bottle.barcode_number || bottle.barcode;
        const bottleId = bottle.id;
        const isPlaceholder = isPlaceholderBarcode(barcode);
        
        // Check if this bottle is already in rentals
        // For placeholder barcodes, only check by bottle_id (not barcode)
        // For real barcodes, check by both barcode AND bottle_id
        const alreadyInRentals = isPlaceholder
          ? (bottleId && existingBottleIds.has(bottleId))
          : ((barcode && existingBottleBarcodes.has(barcode)) || 
             (bottleId && existingBottleIds.has(bottleId)));
        
        if (!alreadyInRentals) {
          // New/extra bottle: default to monthly until admin switches to yearly (one lease per bottle)
          const customerPricing = pricingMap[bottle.assigned_customer];
          let rentalAmount = 10; // Default rate
          const rentalType = 'monthly';
          
          if (customerPricing) {
            if (customerPricing.fixed_rate_override) {
              rentalAmount = customerPricing.fixed_rate_override;
            } else if (customerPricing.discount_percent > 0) {
              // Apply discount to base rate (default $10/month)
              rentalAmount = 10 * (1 - customerPricing.discount_percent / 100);
            }
          }
          
          // Get location-specific tax rate
          const bottleLocation = (bottle.location || 'SASKATOON').toUpperCase();
          const locationTaxRate = locationTaxMap[bottleLocation] || 0.11; // Default to 11% if location not found
          
          allRentalData.push({
            id: `bottle_${bottle.id}`,
            source: 'bottle_assignment',
            customer_id: bottle.assigned_customer,
            bottle_barcode: barcode || null, // Can be null for bottles without barcodes
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
          
          // Track this bottle so we don't add it again
          // Only track real barcodes (not placeholders) in the barcode set to avoid false matches
          if (barcode && !isPlaceholder) {
            existingBottleBarcodes.add(barcode);
          }
          if (bottleId) {
            existingBottleIds.add(bottleId);
          }
          bottlesAdded++;
        } else {
          bottlesSkipped++;
        }
      }

      // Remove duplicates based on bottle_barcode OR bottle_id (keep rental records over bottle assignments)
      // For placeholder barcodes, use bottle_id as the unique identifier
      const deduplicatedData = [];
      const seenBarcodes = new Set();
      const seenBottleIds = new Set(); // Track bottle_ids for bottles without barcodes or with placeholder barcodes
      const duplicateBarcodes = new Map(); // Track which barcodes have duplicates
      
      // First pass: Add all rental records (priority over bottle assignments)
      let dnsRentalsIncluded = 0;
      for (const item of allRentalData) {
        if (item.source === 'rental') {
          const barcode = item.bottle_barcode;
          const bottleId = item.bottle_id || item.bottles?.id;
          const isDNS = item.is_dns === true;
          const isPlaceholder = isPlaceholderBarcode(barcode);
          
          // For placeholder barcodes or DNS, use bottle_id as unique identifier
          if (isDNS || isPlaceholder || !barcode || (typeof barcode === 'string' && barcode.trim() === '')) {
            // DNS rentals, placeholder barcodes, or rentals without barcode - use bottle_id
            if (bottleId && seenBottleIds.has(bottleId)) {
              // Duplicate bottle_id found
              duplicateBarcodes.set(barcode || 'no_barcode', (duplicateBarcodes.get(barcode || 'no_barcode') || 1) + 1);
          } else {
              deduplicatedData.push(item);
              if (isDNS) dnsRentalsIncluded++;
              if (bottleId) seenBottleIds.add(bottleId);
            }
          } else if (!seenBarcodes.has(barcode)) {
            // Real barcode - use barcode as unique identifier
            deduplicatedData.push(item);
            seenBarcodes.add(barcode);
            if (bottleId) seenBottleIds.add(bottleId);
          } else {
            duplicateBarcodes.set(barcode, (duplicateBarcodes.get(barcode) || 1) + 1);
          }
        }
      }
      
      // Second pass: Add bottle assignments only if no rental record exists
      let bottlesWithoutBarcode = 0;
      let placeholderBottlesAdded = 0;
      let placeholderBottlesSkipped = 0;
      
      for (const item of allRentalData) {
        if (item.source === 'bottle_assignment') {
          const barcode = item.bottle_barcode;
          const bottleId = item.bottle_id || item.bottles?.id;
          const isPlaceholder = isPlaceholderBarcode(barcode);
          
          // For placeholder barcodes, check by bottle_id only (barcode is not unique)
          // For real barcodes, check by both barcode AND bottle_id
          const alreadyIncluded = isPlaceholder
            ? (bottleId && seenBottleIds.has(bottleId))
            : ((barcode && seenBarcodes.has(barcode)) || (bottleId && seenBottleIds.has(bottleId)));
          
          if (alreadyIncluded) {
            // This is expected - rental record already exists for this barcode/bottle_id
            if (barcode && !isPlaceholder) {
              duplicateBarcodes.set(barcode, (duplicateBarcodes.get(barcode) || 1) + 1);
            }
            if (isPlaceholder) {
              placeholderBottlesSkipped++;
            }
          } else {
            // Include this bottle assignment
            deduplicatedData.push(item);
            // Only track real barcodes (not placeholders) in seenBarcodes
            // Always track bottle_id for both placeholders and real barcodes
            if (barcode && !isPlaceholder) {
              seenBarcodes.add(barcode);
            }
            if (bottleId) {
              seenBottleIds.add(bottleId);
            }
            if (isPlaceholder) {
              placeholderBottlesAdded++;
            }
            if (!barcode || (typeof barcode === 'string' && barcode.trim() === '')) {
              bottlesWithoutBarcode++;
            }
          }
        }
      }
      
      // Per-bottle lease map: bottle_id -> agreement (one lease per bottle)
      const leaseByBottleId = (leaseAgreements || [])
        .filter(a => a.bottle_id)
        .reduce((map, a) => { map[a.bottle_id] = a; return map; }, {});

      // 6. Get customers with their types (with fallback) - include lease agreement customers
      const customerIds = Array.from(new Set([
        ...deduplicatedData.map(r => r.customer_id).filter(Boolean),
        ...(leaseAgreements || []).map(a => a.customer_id).filter(Boolean)
      ]));
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

      // Apply per-bottle lease: only mark a rental as yearly if it has lease_agreement_id or its bottle has a lease (one lease per bottle)
      for (const rental of deduplicatedData) {
        const bottleId = rental.bottle_id || rental.bottles?.id;
        const agreementFromBottle = bottleId ? leaseByBottleId[bottleId] : null;
        const agreementFromRental = rental.lease_agreement_id && (leaseAgreements || []).find(a => a.id === rental.lease_agreement_id);
        const agreement = agreementFromBottle || agreementFromRental;
        if (agreement) {
          const billingFreq = (agreement.billing_frequency || '').toLowerCase();
          const isYearly = billingFreq === 'annual' || billingFreq === 'yearly' || billingFreq === 'annually' || billingFreq === 'semi-annual';
          if (isYearly) {
            rental.rental_type = 'yearly';
            rental.lease_agreement_id = agreement.id;
            rental.lease_agreement = agreement;
            if ((agreement.annual_amount || 0) > 0) {
              rental.rental_amount = agreement.annual_amount / 12;
            }
          }
        }
        // If rental came from DB without lease_agreement_id and bottle has no per-bottle lease, keep rental_type as-is (default monthly for new bottles)
      }

      // 7. Attach customer info to each rental
      const rentalsWithCustomer = deduplicatedData.map(r => ({
        ...r,
        customer: customersMap[r.customer_id] || null
      }));

      // Include all rentals with customer_id (vendors included - filter applied in UI)
      const filteredRentals = rentalsWithCustomer.filter(r => {
        if (!r.customer_id) return false;
        return true;
      });

      setAssets(filteredRentals);

      // 7. Calculate statistics based on bottle status and customer assignment
      // IMPORTANT: Bottles at locations WITHOUT customers should be "in-house" (available), not "rented"
      
      // Get customer types for assigned bottles
      const customerIdsForBottles = Array.from(new Set(
        (assignedBottles || []).map(b => b.assigned_customer).filter(Boolean)
      ));
      
      let customerTypesMap = {};
      if (customerIdsForBottles.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('CustomerListID, customer_type')
          .eq('organization_id', organization.id)
          .in('CustomerListID', customerIdsForBottles);
        
        if (customersData) {
          customerTypesMap = customersData.reduce((map, c) => {
            map[c.CustomerListID] = c.customer_type || 'CUSTOMER';
            return map;
          }, {});
        }
      }
      
      // Count bottles by status and customer type
      // Bottles assigned to vendors are "with vendors" (in-house, no charge)
      const bottlesWithVendors = (assignedBottles || []).filter(bottle => {
        const customerType = customerTypesMap[bottle.assigned_customer] || 'CUSTOMER';
        return customerType === 'VENDOR';
      }).length;
      
      // Count rented bottles: ONLY bottles assigned to CUSTOMERS (not vendors) with status "rented" (excluding customer-owned)
      // Bottles at locations without customers are NOT rented - they're in-house
      const rentedBottles = (assignedBottles || []).filter(bottle => {
        const customerType = customerTypesMap[bottle.assigned_customer] || 'CUSTOMER';
        const ownershipValue = String(bottle.ownership || '').trim().toLowerCase();
        const isCustomerOwned = ownershipValue.includes('customer') || 
                               ownershipValue.includes('owned') || 
                               ownershipValue === 'customer owned';
        
        // Only count as rented if:
        // 1. Assigned to a customer (not vendor, not null)
        // 2. Customer type is CUSTOMER (not VENDOR) 
        // 3. Status is "rented"
        // 4. Not customer-owned (customer-owned bottles should be "available")
        // Note: Bottles at locations without customers are NOT in assignedBottles, so they're already in-house
        return bottle.assigned_customer && 
               customerType === 'CUSTOMER' && 
               (bottle.status === 'rented' || bottle.status === 'RENTED') &&
               !isCustomerOwned;
      }).length;
      
      // Available/In-House = unassigned bottles + vendor bottles + assigned bottles with status "available" OR customer-owned bottles
      // Also includes bottles at locations without customer assignment (they're in-house)
      const assignedBottlesAvailable = (assignedBottles || []).filter(bottle => {
        const customerType = customerTypesMap[bottle.assigned_customer] || 'CUSTOMER';
        const ownershipValue = String(bottle.ownership || '').trim().toLowerCase();
        const isCustomerOwned = ownershipValue.includes('customer') || 
                               ownershipValue.includes('owned') || 
                               ownershipValue === 'customer owned';
        
        // Count as available if:
        // 1. Status is "available", OR
        // 2. Customer-owned (even if status is "rented", customer-owned should show as available)
        // 3. Assigned to vendor (vendors are in-house, no charge)
        return (bottle.status === 'available' || bottle.status === 'AVAILABLE') ||
               (isCustomerOwned && customerType !== 'VENDOR') ||
               customerType === 'VENDOR';
      }).length;
      
      // In-house total includes:
      // - Unassigned bottles (no customer, may have location)
      // - Vendor bottles (assigned to vendors)
      // - Assigned bottles with status "available" or customer-owned
      const inHouseTotal = unassignedBottles + bottlesWithVendors + assignedBottlesAvailable;
      
      // Calculate monthly revenue from all displayed rentals (DB records + bottle assignments)
      const totalRevenue = filteredRentals.reduce((sum, rental) => {
        const baseAmount = rental.rental_amount || 0;
        const taxAmount = baseAmount * (rental.tax_rate || 0);
        return sum + baseAmount + taxAmount;
      }, 0);

      setStats({ 
        inHouse: inHouseTotal,  // Unassigned + vendor bottles + assigned with status "available"
        withVendors: bottlesWithVendors,  // Bottles assigned to vendors
        rented: rentedBottles,  // Bottles assigned to customers with status "rented"
        totalRevenue 
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

  // Memoized: Group rentals by customer
  const { customersWithRentals, dnsCount } = useMemo(() => {
    const list = [];
    const customerMap = {};
    let dns = 0;
    for (const rental of assets) {
      if (rental.is_dns === true) dns++;
      const custId = rental.customer?.CustomerListID || rental.customer_id;
      if (!custId) continue;
      if (!customerMap[custId]) {
        customerMap[custId] = {
          customer: rental.customer || {
            CustomerListID: custId,
            name: rental.customer_name || `Customer ${custId}`,
            customer_type: 'CUSTOMER',
          },
          rentals: [],
        };
        list.push(customerMap[custId]);
      }
      customerMap[custId].rentals.push(rental);
    }
    return { customersWithRentals: list, dnsCount: dns };
  }, [assets]);

  // Memoized: Filter customers (uses debounced search)
  const filteredCustomers = useMemo(() => {
    return customersWithRentals
      .map(({ customer, rentals }) => {
        let filteredRentals = rentals;
        if (filters.showDNSOnly) {
          filteredRentals = rentals.filter(r => r.is_dns === true);
        }
        return { customer, rentals: filteredRentals };
      })
      .filter(({ customer, rentals }) => {
        if (rentals.length === 0) return false;
        const custType = customer.customer_type || 'CUSTOMER';
        if (filters.customer_type !== 'all' && custType !== filters.customer_type) return false;
        if (filters.status !== 'all') {
          const isVendor = custType === 'VENDOR';
          if (filters.status === 'IN-HOUSE' && !isVendor) return false;
          if (filters.status === 'RENTED' && isVendor) return false;
        }
        const searchText = debouncedSearch.toLowerCase();
        if (debouncedSearch) {
          return customer.name?.toLowerCase().includes(searchText) ||
            customer.CustomerListID?.toLowerCase().includes(searchText) ||
            rentals.some(r => {
              const barcode = r.bottles?.barcode_number || r.bottles?.barcode || r.bottle_barcode;
              const dnsLabel = r.is_dns ? `${r.dns_product_code || 'DNS'} - ${r.dns_description || 'Not Scanned'}` : '';
              return (barcode?.toLowerCase().includes(searchText) || dnsLabel.toLowerCase().includes(searchText));
            });
        }
        return true;
      });
  }, [customersWithRentals, filters.showDNSOnly, filters.customer_type, filters.status, debouncedSearch]);

  const tabs = useMemo(() => [
    { label: 'All Customers', value: 'all', count: filteredCustomers.length },
    { label: 'Monthly Rentals', value: 'monthly', count: filteredCustomers.reduce((c, x) => c + x.rentals.filter(r => r.rental_type === 'monthly').length, 0) },
    { label: 'Yearly Rentals', value: 'yearly', count: filteredCustomers.reduce((c, x) => c + x.rentals.filter(r => r.rental_type === 'yearly').length, 0) },
    { label: 'DNS (Not Scanned)', value: 'dns', count: dnsCount, color: 'warning' },
  ], [filteredCustomers, dnsCount]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Automatically enable DNS filter when DNS tab is selected
    if (newValue === 3) { // DNS tab is index 3
      setFilters({ ...filters, showDNSOnly: true });
    } else if (filters.showDNSOnly && activeTab === 3) {
      // If switching away from DNS tab, disable DNS filter
      setFilters({ ...filters, showDNSOnly: false });
    }
  };

  const handleUpdateAsset = async (assetId, updates) => {
    try {
      const { error } = await supabase
        .from('bottles')
        .update(updates)
        .eq('id', assetId);

      if (error) throw error;

      await fetchRentals();
      setEditDialog({ open: false, customer: null, rentals: [] });
    } catch (error) {
      logger.error('Error updating asset:', error);
    }
  };

  const exportToCSV = (customers) => {
    const rows = [];
    const cols = ['Customer', 'CustomerID', 'Barcode', 'RentalType', 'RentalRate', 'TaxCode', 'Location', 'StartDate', 'EndDate', 'TotalBottles'];
    customers.forEach(({ customer, rentals }) => {
      rentals.forEach((rental) => {
        const barcode = rental.bottles?.barcode_number || rental.bottles?.barcode || rental.bottle_barcode;
        const dnsLabel = rental.is_dns ? `${rental.dns_product_code || 'DNS'} - ${rental.dns_description || 'Not Scanned'}` : '';
        rows.push({
          Customer: customer.name,
          CustomerID: customer.CustomerListID,
          Barcode: barcode || dnsLabel || '',
          RentalType: rental.rental_type,
          RentalRate: rental.rental_amount,
          TaxCode: rental.tax_code,
          Location: rental.location,
          StartDate: rental.rental_start_date,
          EndDate: rental.rental_end_date,
          TotalBottles: rentals.length,
        });
      });
    });
    if (rows.length === 0) return;
    const csv = toCsv(rows, cols);
    const filename = `rentals_export_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename);
  };

  const exportInvoices = async (customers) => {
    if (!customers.length || !organization?.id) return;
    setExportingInvoices(true);
    try {
      const now = new Date();
      const invoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const dueDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 1);
      const fmt = (d) => d.toISOString().slice(0, 10);
      const invoiceDateStr = fmt(invoiceDate);
      const dueDateStr = fmt(dueDate);

      // Split each customer's rentals into monthly and yearly
      const monthlyEntries = [];
      const yearlyEntries = [];
      customers.forEach(({ customer, rentals }) => {
        const monthlyRentals = rentals.filter((r) => (r.rental_type || 'monthly') === 'monthly');
        const yearlyRentals = rentals.filter((r) => r.rental_type === 'yearly');
        if (monthlyRentals.length > 0) {
          monthlyEntries.push({ customer, rentals: monthlyRentals });
        }
        if (yearlyRentals.length > 0) {
          yearlyEntries.push({ customer, rentals: yearlyRentals });
        }
      });

      const totalRows = monthlyEntries.length + yearlyEntries.length;
      if (totalRows === 0) {
        setError('No rentals to export.');
        return;
      }

      const invoiceNumbers = await getNextInvoiceNumbers(organization.id, totalRows);
      if (invoiceNumbers.length < totalRows) {
        setError('Could not reserve invoice numbers. Please try again.');
        return;
      }

      const cols = ['Invoice#', 'Customer Number', 'Name', 'Total', 'Date', 'TX', 'TX code', 'Due date', 'Rate', '# of Bottles', 'Type'];
      let numberIdx = 0;

      if (monthlyEntries.length > 0) {
        const monthlyNumbers = invoiceNumbers.slice(numberIdx, numberIdx + monthlyEntries.length);
        numberIdx += monthlyEntries.length;
        const monthlyRows = monthlyEntries.map(({ customer, rentals }, i) => {
          const base = rentals.reduce((sum, r) => sum + (parseFloat(r.rental_amount) || 0), 0);
          const totalWithTax = rentals.reduce((sum, r) => {
            const amt = parseFloat(r.rental_amount) || 0;
            const taxRate = r.tax_rate || 0.11;
            return sum + amt + amt * taxRate;
          }, 0);
          const tax = +(totalWithTax - base).toFixed(2);
          const total = +(base + tax).toFixed(2);
          const avgRate = rentals.length > 0 ? (base / rentals.length).toFixed(2) : '0.00';
          return {
            'Invoice#': monthlyNumbers[i] || `W${String(i + 1).padStart(5, '0')}`,
            'Customer Number': customer.CustomerListID,
            Name: customer.name,
            Total: total,
            Date: invoiceDateStr,
            TX: tax,
            'TX code': 'G',
            'Due date': dueDateStr,
            Rate: avgRate,
            '# of Bottles': rentals.length,
            Type: 'Monthly',
          };
        });
        const monthlyCsv = toCsv(monthlyRows, cols);
        downloadFile(monthlyCsv, `quickbooks_invoices_monthly_${invoiceDateStr}.csv`);
      }

      if (yearlyEntries.length > 0) {
        const yearlyNumbers = invoiceNumbers.slice(numberIdx, numberIdx + yearlyEntries.length);
        const yearlyRows = yearlyEntries.map(({ customer, rentals }, i) => {
          const base = rentals.reduce((sum, r) => sum + (parseFloat(r.rental_amount) || 0), 0);
          const totalWithTax = rentals.reduce((sum, r) => {
            const amt = parseFloat(r.rental_amount) || 0;
            const taxRate = r.tax_rate || 0.11;
            return sum + amt + amt * taxRate;
          }, 0);
          const tax = +(totalWithTax - base).toFixed(2);
          const total = +(base + tax).toFixed(2);
          const avgRate = rentals.length > 0 ? (base / rentals.length).toFixed(2) : '0.00';
          return {
            'Invoice#': yearlyNumbers[i] || `W${String(i + 1).padStart(5, '0')}`,
            'Customer Number': customer.CustomerListID,
            Name: customer.name,
            Total: total,
            Date: invoiceDateStr,
            TX: tax,
            'TX code': 'G',
            'Due date': dueDateStr,
            Rate: avgRate,
            '# of Bottles': rentals.length,
            Type: 'Yearly',
          };
        });
        const yearlyCsv = toCsv(yearlyRows, cols);
        downloadFile(yearlyCsv, `quickbooks_invoices_yearly_${invoiceDateStr}.csv`);
      }

      setError(null);
    } catch (err) {
      logger.error('exportInvoices error:', err);
      setError(err.message || 'Export failed');
    } finally {
      setExportingInvoices(false);
    }
  };

  const currentCustomers = useMemo(() => {
    if (activeTab === 0) return filteredCustomers;
    if (activeTab === 1) return filteredCustomers.filter(c => c.rentals.some(r => r.rental_type === 'monthly'));
    if (activeTab === 2) return filteredCustomers.filter(c => c.rentals.some(r => r.rental_type === 'yearly'));
    return filteredCustomers.filter(c => c.rentals.some(r => r.is_dns === true));
  }, [filteredCustomers, activeTab]);

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
            startIcon={exportingInvoices ? <CircularProgress size={18} /> : <MoneyIcon />}
            onClick={() => exportInvoices(filteredCustomers)}
            disabled={filteredCustomers.length === 0 || exportingInvoices}
          >
            {exportingInvoices ? 'Exporting...' : 'Export QuickBooks Invoices'}
          </Button>
          <Button
            variant="contained"
            startIcon={<EmailIcon />}
            onClick={() => {
              const customersWithRentals = filteredCustomers.filter(c => c.rentals && c.rentals.length > 0 && c.customer?.customer_type !== 'VENDOR');
              if (customersWithRentals.length === 0) {
                alert('No customers with active rentals found');
                return;
              }
              setBulkEmailDialogOpen(true);
            }}
            disabled={filteredCustomers.filter(c => c.rentals && c.rentals.length > 0 && c.customer?.customer_type !== 'VENDOR').length === 0}
          >
            Bulk Email Invoices
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

        {dnsCount > 0 && (
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '2px solid', borderColor: 'warning.main' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {dnsCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      DNS Bottles
                    </Typography>
                    <Typography variant="caption" color="warning.main">
                      (Not Scanned)
                    </Typography>
                  </Box>
                  <WarningIcon sx={{ fontSize: 40, color: '#ed6c02' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
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
            <Grid item xs={12} sm={6} md={3.8}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.showDNSOnly}
                    onChange={(e) => setFilters({ ...filters, showDNSOnly: e.target.checked })}
                    color="warning"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">Show DNS Only</Typography>
                    <Chip 
                      label={dnsCount} 
                      size="small" 
                      color="warning" 
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                }
              />
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
                    color={tab.color || 'default'}
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
                        {(() => {
                          const monthly = rentals.filter(r => r.rental_type === 'monthly').length;
                          const yearly = rentals.filter(r => r.rental_type === 'yearly').length;
                          if (monthly > 0 && yearly > 0) {
                            return `${monthly} monthly, ${yearly} yearly`;
                          }
                          return rentals[0]?.rental_type || 'monthly';
                        })()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {(() => {
                          const amounts = [...new Set(rentals.map(r => (parseFloat(r.rental_amount) || 10).toFixed(2)))];
                          const formatted = amounts.map(a => `$${a}`);
                          return formatted.length > 1 ? formatted.join(', ') : formatted[0] || '$10.00';
                        })()}
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
                      {rentals.length > 0 && customer.customer_type !== 'VENDOR' && (
                        <Tooltip title="Generate & Email Invoice">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setInvoiceDialog({ 
                              open: true, 
                              customer, 
                              rentals
                            })}
                            sx={{ mr: 1 }}
                          >
                            <InvoiceIcon />
                          </IconButton>
                        </Tooltip>
                      )}
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
                            setExpandedCustomers(prev => {
                              const next = new Set(prev);
                              if (next.has(customer.CustomerListID)) next.delete(customer.CustomerListID);
                              else next.add(customer.CustomerListID);
                              return next;
                            });
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
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                              {rentals.map((rental, idx) => {
                                const isDNS = rental.is_dns === true;
                                const barcode = rental.bottles?.barcode_number || rental.bottles?.barcode || rental.bottle_barcode;
                                const displayLabel = isDNS 
                                  ? `${rental.dns_product_code || 'DNS'} - ${rental.dns_description || 'Not Scanned'}`
                                  : (barcode || `Asset ${idx + 1}`);
                                
                                return (
                                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip
                                      label={displayLabel}
                                      size="small"
                                      variant="outlined"
                                      color={isDNS ? 'warning' : 'default'}
                                      onClick={() => {
                                        // Navigate to bottle details page (only if not DNS)
                                        if (!isDNS) {
                                          const bottleId = rental.bottles?.id || rental.bottle_id;
                                          if (bottleId) {
                                            navigate(`/bottle/${bottleId}`);
                                          }
                                        }
                                      }}
                                      sx={{ 
                                        fontSize: 11,
                                        cursor: isDNS ? 'default' : 'pointer',
                                        '&:hover': isDNS ? {} : {
                                          bgcolor: 'primary.light',
                                          color: 'primary.contrastText',
                                          borderColor: 'primary.main'
                                        }
                                      }}
                                    />
                                    {isDNS && (
                                      <DNSConversionDialog
                                        dnsRental={rental}
                                        customerId={customer.CustomerListID}
                                        customerName={customer.name}
                                        onConverted={() => {
                                          fetchRentals();
                                        }}
                                      />
                                    )}
                                  </Box>
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

      {/* Edit Customer Rentals Dialog - per-bottle: each bottle has its own Monthly/Yearly (one lease per bottle) */}
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
                Each bottle has its own rental type. New/extra bottles default to monthly until switched to yearly.
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {editDialog.rentals?.map((rental) => {
                  const barcode = rental.bottles?.barcode_number || rental.bottles?.barcode || rental.bottle_barcode || rental.id;
                  const rentalType = rental.rental_type || 'monthly';
                  return (
                    <Grid item xs={12} key={rental.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ minWidth: 120 }}>
                          {barcode || 'Bottle'}
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel>Rental Type</InputLabel>
                          <Select
                            value={rentalType}
                            onChange={(e) => setEditDialog(prev => ({
                              ...prev,
                              rentals: prev.rentals.map(r => r.id === rental.id ? { ...r, rental_type: e.target.value } : r)
                            }))}
                            label="Rental Type"
                          >
                            <MenuItem value="monthly">Monthly</MenuItem>
                            <MenuItem value="yearly">Yearly</MenuItem>
                          </Select>
                        </FormControl>
                        {rentalType === 'yearly' && rental.lease_agreement_id && (
                          <Chip size="small" label="Lease linked" color="success" />
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>

              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Rental Rate ($) – shared"
                    type="number"
                    value={editDialog.rental_amount ?? editDialog.rentals?.[0]?.rental_amount ?? 10}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, rental_amount: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tax Code</InputLabel>
                    <Select
                      value={editDialog.tax_code ?? editDialog.rentals?.[0]?.tax_code ?? 'GST+PST'}
                      onChange={(e) => setEditDialog(prev => ({ ...prev, tax_code: e.target.value }))}
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
                      value={editDialog.location ?? editDialog.rentals?.[0]?.location ?? 'SASKATOON'}
                      onChange={(e) => setEditDialog(prev => ({ ...prev, location: e.target.value }))}
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
            disabled={updatingRentals}
            onClick={async () => {
              try {
                setUpdatingRentals(true);
                const customerId = editDialog.customer.CustomerListID;
                const customerName = editDialog.customer.name;
                const sharedAmount = editDialog.rental_amount ?? editDialog.rentals?.[0]?.rental_amount ?? 10;
                const sharedTaxCode = editDialog.tax_code ?? editDialog.rentals?.[0]?.tax_code ?? 'GST+PST';
                const sharedLocation = editDialog.location ?? editDialog.rentals?.[0]?.location ?? 'SASKATOON';

                for (const rental of editDialog.rentals || []) {
                  // Skip bottle-only entries that don't have a rentals table row yet
                  const rentalId = rental.id;
                  if (typeof rentalId === 'string' && rentalId.startsWith('bottle_')) continue;

                  const newType = rental.rental_type || 'monthly';
                  const bottleId = rental.bottle_id || rental.bottles?.id;
                  let leaseAgreementId = rental.lease_agreement_id || null;

                  if (newType === 'yearly' && !leaseAgreementId && bottleId) {
                    // Create a per-bottle yearly lease for this rental
                    const [numberData] = await getNextAgreementNumbers(organization?.id, 1);
                    if (!numberData) {
                      alert('Error creating lease: Failed to generate agreement number');
                      setUpdatingRentals(false);
                      return;
                    }
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setFullYear(endDate.getFullYear() + 1);
                    const annualAmount = Math.round(parseFloat(sharedAmount) * 12 * 100) / 100;
                    const nextBilling = new Date();
                    nextBilling.setFullYear(nextBilling.getFullYear() + 1);
                    const { data: newLease, error: insertLeaseError } = await supabase
                      .from('lease_agreements')
                      .insert({
                        organization_id: organization?.id,
                        customer_id: customerId,
                        customer_name: customerName,
                        agreement_number: numberData,
                        title: 'Annual Lease Agreement (per bottle)',
                        start_date: startDate.toISOString().split('T')[0],
                        end_date: endDate.toISOString().split('T')[0],
                        annual_amount: annualAmount,
                        billing_frequency: 'annual',
                        payment_terms: 'Net 30',
                        tax_rate: 0.11,
                        bottle_id: bottleId,
                        status: 'active',
                        next_billing_date: nextBilling.toISOString().split('T')[0],
                        created_by: profile?.id,
                        updated_by: profile?.id,
                      })
                      .select('id')
                      .single();
                    if (insertLeaseError) {
                      logger.error('Error creating lease agreement:', insertLeaseError);
                      alert('Error creating lease: ' + insertLeaseError.message);
                      setUpdatingRentals(false);
                      return;
                    }
                    leaseAgreementId = newLease?.id;
                  } else if (newType === 'monthly') {
                    leaseAgreementId = null;
                  }

                  const { error } = await supabase
                    .from('rentals')
                    .update({
                      rental_type: newType,
                      lease_agreement_id: leaseAgreementId,
                      rental_amount: sharedAmount,
                      tax_code: sharedTaxCode,
                      location: sharedLocation,
                    })
                    .eq('id', rentalId);

                  if (error) {
                    logger.error('Error updating rental:', error);
                    alert('Error updating rental: ' + error.message);
                    setUpdatingRentals(false);
                    return;
                  }
                }

                setEditDialog({ open: false, customer: null, rentals: [] });
                await fetchRentals();
                alert(`Successfully updated rental settings for ${editDialog.customer?.name}`);
              } catch (error) {
                logger.error('Error updating rentals:', error);
                alert('Error updating rentals: ' + error.message);
              } finally {
                setUpdatingRentals(false);
              }
            }}
          >
            {updatingRentals ? 'Updating...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Generator Dialog */}
      <InvoiceGenerator
        open={invoiceDialog.open}
        onClose={() => setInvoiceDialog({ open: false, customer: null, rentals: [] })}
        customer={invoiceDialog.customer}
        rentals={invoiceDialog.rentals}
      />

      {/* Bulk Email Dialog */}
      <BulkInvoiceEmailDialog
        open={bulkEmailDialogOpen}
        onClose={() => setBulkEmailDialogOpen(false)}
        customers={filteredCustomers.filter(c => c.rentals && c.rentals.length > 0 && c.customer?.customer_type !== 'VENDOR')}
      />
    </Box>
  );
}

export default RentalsImproved;