import logger from '../utils/logger';

import React, { useState, useEffect, useMemo } from 'react';

import {

  Box,

  Button,

  Typography,

  Table,

  TableBody,

  TableCell,

  TableContainer,

  TableHead,

  TableRow,

  Paper,

  Dialog,

  DialogTitle,

  DialogContent,

  DialogActions,

  TextField,

  IconButton,

  Snackbar,

  Alert,

  FormControl,

  InputLabel,

  Select,

  MenuItem,

  TablePagination,

  Chip,

  Checkbox

} from '@mui/material';

import ResponsiveTable from '../components/ResponsiveTable';

import OptimizedTable from '../components/OptimizedTable';

import { usePagination } from '../hooks/usePagination';

import { executeCachedQuery, createOptimizedQuery } from '../utils/queryOptimizer';

import {

  Add as AddIcon,

  Edit as EditIcon,

  Delete as DeleteIcon,

  Upload as UploadIcon,

  Download as DownloadIcon,

  PersonAdd as PersonAddIcon

} from '@mui/icons-material';

import { useAuth } from '../hooks/useAuth';

import { supabase } from '../supabase/client';

import { useNavigate } from 'react-router-dom';

import * as XLSX from 'xlsx';



const BottleManagement = () => {

  const { user, organization } = useAuth();

  const navigate = useNavigate();

  const [bottles, setBottles] = useState([]);

  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');

  const [gasTypeFilter, setGasTypeFilter] = useState('all');

  const [availableGasTypes, setAvailableGasTypes] = useState([]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [totalCount, setTotalCount] = useState(0);

  

  // Use optimized pagination hook

  const {

    page,

    rowsPerPage,

    handleChangePage,

    handleChangeRowsPerPage,

    getPaginationInfo

  } = usePagination(0, 25);

  

  // Dialog states

  const [uploadDialog, setUploadDialog] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);

  const [uploadPreview, setUploadPreview] = useState([]);

  const [editDialog, setEditDialog] = useState(false);

  const [editingBottle, setEditingBottle] = useState(null);

  const [deleteDialog, setDeleteDialog] = useState(false);

  const [bottlesToDelete, setBottlesToDelete] = useState([]);

  const [selectedBottles, setSelectedBottles] = useState([]);



  // Load data

  useEffect(() => {

    if (organization) {

      loadBottles();

      loadCustomers();

      loadGasTypes();

    }

  }, [organization, page, rowsPerPage, searchTerm, statusFilter, gasTypeFilter]); // Re-load when search/filter changes

  // Fetch available gas types for filter dropdown

  const loadGasTypes = async () => {

    try {

      if (!organization?.id) return;

      const { data, error } = await supabase

        .from('bottles')

        .select('gas_type')

        .eq('organization_id', organization.id)

        .not('gas_type', 'is', null)

        .neq('gas_type', '');

      if (error) {

        logger.error('Error fetching gas types:', error);

        return;

      }

      // Get unique gas types and sort them

      const uniqueTypes = [...new Set((data || []).map(b => b.gas_type).filter(Boolean))];

      setAvailableGasTypes(uniqueTypes.sort());

    } catch (error) {

      logger.error('Error fetching gas types:', error);

    }

  };



  const loadBottles = async () => {

    try {

      setLoading(true);

      

      // Build query with search filter

      let query = supabase

        .from('bottles')

        .select(`

          *,

          customers:assigned_customer (

            "CustomerListID",

            name

          )

        `, { count: 'exact' })

        .eq('organization_id', organization.id);

      

      // Apply search filter at database level for better performance
      // Handle barcodes that might have leading zeros - search for both with and without leading zeros
      if (searchTerm) {
        const trimmedSearch = searchTerm.trim();
        const isNumeric = /^\d+$/.test(trimmedSearch);
        
        // Base search pattern - always search in these fields
        let searchPattern = `serial_number.ilike.%${trimmedSearch}%,barcode_number.ilike.%${trimmedSearch}%,customer_name.ilike.%${trimmedSearch}%,description.ilike.%${trimmedSearch}%`;
        
        // For numeric searches, handle leading zero variations
        if (isNumeric) {
          if (!trimmedSearch.startsWith('0') && trimmedSearch.length > 0) {
            // Search term doesn't start with 0 - also search with leading zero
            const withLeadingZero = `0${trimmedSearch}`;
            searchPattern += `,barcode_number.ilike.%${withLeadingZero}%,serial_number.ilike.%${withLeadingZero}%`;
          } else if (trimmedSearch.startsWith('0') && trimmedSearch.length > 1) {
            // Search term starts with 0 - also search without leading zeros
            const withoutLeadingZero = trimmedSearch.replace(/^0+/, '');
            if (withoutLeadingZero) {
              searchPattern += `,barcode_number.ilike.%${withoutLeadingZero}%,serial_number.ilike.%${withoutLeadingZero}%`;
            }
          }
        }
        
        try {
          // Log search pattern for debugging (especially for barcode searches)
          if (isNumeric && (trimmedSearch.includes('8674') || trimmedSearch.includes('08674'))) {
            logger.log(`🔍 Search query pattern for "${trimmedSearch}": ${searchPattern.substring(0, 200)}...`);
          }
          query = query.or(searchPattern);
        } catch (error) {
          logger.error('Error building search query:', error);
          // Fallback to simple search if complex query fails
          query = query.or(`serial_number.ilike.%${trimmedSearch}%,barcode_number.ilike.%${trimmedSearch}%,customer_name.ilike.%${trimmedSearch}%,description.ilike.%${trimmedSearch}%`);
        }
      }

      

      // Apply status filter

      if (statusFilter !== 'all') {

        query = query.eq('status', statusFilter);

      }

      // Apply gas type filter

      if (gasTypeFilter !== 'all') {

        query = query.eq('gas_type', gasTypeFilter);

      }

      

      // Get total count with filters

      const { count } = await query;

      setTotalCount(count || 0);

      

      // Apply pagination and ordering

      const { data, error } = await query

        .order('customer_name', { ascending: true, nullsFirst: false })

        .range(page * rowsPerPage, (page + 1) * rowsPerPage - 1);



      if (error) {
        logger.error('Error executing bottle query:', error);
        throw error;
      }
      
      // Log search results for debugging (especially for barcode searches)
      if (searchTerm && /^\d+$/.test(searchTerm.trim()) && (searchTerm.includes('8674') || searchTerm.includes('08674'))) {
        logger.log(`🔍 Search for "${searchTerm}" returned ${data?.length || 0} results`);
        if (data && data.length > 0) {
          logger.log(`🔍 Found barcodes: ${data.map(b => b.barcode_number).filter(Boolean).join(', ')}`);
        }
      }

      setBottles(data || []);

    } catch (error) {

      logger.error('Error loading bottles:', error);

      setSnackbar({ open: true, message: 'Failed to load bottles', severity: 'error' });

    } finally {

      setLoading(false);

    }

  };



  const loadCustomers = async () => {

    try {

      const { data, error } = await supabase

        .from('customers')

        .select('"CustomerListID", name')

        .eq('organization_id', organization.id)

        .order('name');



      if (error) throw error;

      setCustomers(data || []);

    } catch (error) {

      logger.error('Error loading customers:', error);

    }

  };



  // No need for client-side filtering - now done at database level for better performance

  // This allows searching across all 2000+ bottles instantly

  const filteredBottles = bottles;

  // Selection handlers

  const handleSelectBottle = (bottleId) => {

    setSelectedBottles(prev =>

      prev.includes(bottleId)

        ? prev.filter(id => id !== bottleId)

        : [...prev, bottleId]

    );

  };

  const handleSelectAll = () => {

    if (selectedBottles.length === filteredBottles.length) {

      setSelectedBottles([]);

    } else {

      setSelectedBottles(filteredBottles.map(b => b.id));

    }

  };

  const isSelected = (bottleId) => selectedBottles.includes(bottleId);

  const isAllSelected = filteredBottles.length > 0 && selectedBottles.length === filteredBottles.length;

  const isIndeterminate = selectedBottles.length > 0 && selectedBottles.length < filteredBottles.length;

  // Clear selection when filters change

  useEffect(() => {

    setSelectedBottles([]);

  }, [searchTerm, statusFilter, gasTypeFilter]);



  // File upload handling

  const handleFileSelect = (event) => {

    const file = event.target.files[0];

    if (file) {

      setUploadFile(file);

      previewFile(file);

    }

  };



  const previewFile = (file) => {

    const reader = new FileReader();

    reader.onload = (e) => {

      try {

        const data = new Uint8Array(e.target.result);

        const workbook = XLSX.read(data, { type: 'array' });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        

        // Show first 5 rows as preview

        setUploadPreview(jsonData.slice(0, 5));

      } catch (error) {

        logger.error('Error reading file:', error);

        setSnackbar({ open: true, message: 'Invalid file format', severity: 'error' });

      }

    };

    reader.readAsArrayBuffer(file);

  };



  const handleUploadBottles = async () => {

    if (!uploadFile) return;



    try {

      setLoading(true);

      

      // Read Excel file

      const reader = new FileReader();

      reader.onload = async (e) => {

        try {

          const data = new Uint8Array(e.target.result);

          const workbook = XLSX.read(data, { type: 'array' });

          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          const jsonData = XLSX.utils.sheet_to_json(worksheet);



          // Get locations for status determination

          const { data: locations } = await supabase

            .from('locations')

            .select('name')

            .eq('organization_id', organization.id);



          const locationNames = locations?.map(loc => loc.name.toLowerCase()) || [];



          // Create customer map - store customer objects with id, CustomerListID, and name

          const customerMap = new Map();

          const { data: existingCustomers } = await supabase

            .from('customers')

            .select('id, "CustomerListID", name')

            .eq('organization_id', organization.id);



          if (existingCustomers) {

            existingCustomers.forEach(customer => {

              // Store customer object keyed by CustomerListID (uppercase for case-insensitive matching)

              customerMap.set(customer.CustomerListID.toUpperCase(), {

                id: customer.id, // UUID - this is what assigned_customer should reference

                CustomerListID: customer.CustomerListID,

                name: customer.name

              });

            });

          }



          // Process bottles

          const bottlesToInsert = [];

          const customersToCreate = [];

          const processedCustomerIds = new Set();



          // Debug: Log available column names

          if (jsonData.length > 0) {

            logger.log('Available Excel columns:', Object.keys(jsonData[0]));

            logger.log('Sample row data:', jsonData[0]);

          }



          jsonData.forEach(row => {

            const customerName = row['Customer'] || row['customer_name'] || '';

            let customerId = String(row['CustomerListID'] || row['customer_list_id'] || '').trim().toUpperCase();

            
            // If CustomerListID is not in a separate column, try to extract it from customer name (e.g., "Name (80000C0A-1744057121A)")
            if (!customerId && customerName) {
              const match = customerName.match(/\(([^)]+)\)/);
              if (match && match[1]) {
                customerId = match[1].trim().toUpperCase();
                logger.log(`Extracted CustomerListID ${customerId} from customer name: ${customerName}`);
              }
            }

            // Collect unique customers (case-insensitive comparison)
            // Skip if this is the owner organization name
            // Clean customer name by removing ID in parentheses (same as in update process)
            const customerNameClean = customerName.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
            const isOwnerOrganization = organization && organization.name && 
              customerNameClean.toLowerCase() === organization.name.toLowerCase().trim();

            if (customerName.trim() && customerId && !processedCustomerIds.has(customerId) && !isOwnerOrganization) {

              processedCustomerIds.add(customerId);

              

              // Check if customer already exists in database OR is already queued for creation

              const customerAlreadyExists = Array.from(customerMap.keys()).some(key => key.toUpperCase() === customerId);

              const customerAlreadyQueued = customersToCreate.some(c => c.CustomerListID.toUpperCase() === customerId);

              

              if (!customerAlreadyExists && !customerAlreadyQueued) {

                customersToCreate.push({

                  CustomerListID: customerId,

                  name: customerName.trim(),

                  organization_id: organization.id

                });

              }

            } else if (isOwnerOrganization) {
              logger.log(`Skipping customer creation for "${customerNameClean}" - this is the owner organization`);
            }



            // Create bottle

            const location = row['Location'] || row['location'] || '';

            const isAtYourFacility = locationNames.some(loc => location.toLowerCase().includes(loc));

            

            // Determine gas_type from Group, Gas Type, or description

            let gasType = row['Group'] || row['group'] || row['Gas Type'] || row['gas_type'] || row['GasType'] || row['Gas'] || '';

            if (!gasType && row['Description']) {

              const desc = row['Description'].toUpperCase();

              if (desc.includes('ARGON')) gasType = 'ARGON';

              else if (desc.includes('OXYGEN')) gasType = 'OXYGEN';

              else if (desc.includes('NITROGEN')) gasType = 'NITROGEN';

              else if (desc.includes('HELIUM')) gasType = 'HELIUM';

              else if (desc.includes('CO2')) gasType = 'CO2';

            }



            // Ensure barcode is properly converted to string, preserving leading zeros
            // Excel may read numeric barcodes as numbers, so we need to handle that
            let barcodeValue = row['Barcode'] || row['barcode_number'] || row['Barcode Number'] || '';
            const originalBarcodeType = typeof barcodeValue;
            const originalBarcodeValue = barcodeValue;
            
            // If it's a number, convert to string without scientific notation
            // For numbers that should have leading zeros (like 08674030), we need to pad them
            if (typeof barcodeValue === 'number') {
              // Check if the original string representation (if available) had leading zeros
              // Excel might have converted "08674030" to 8674030 (number)
              // We'll convert to string and check if it's 9 digits or less (likely had leading zero)
              const numStr = barcodeValue.toFixed(0);
              // If it's a 9-digit number starting with 8 or 6, it might have had a leading zero
              // But we can't know for sure, so we'll just convert it as-is
              barcodeValue = numStr;
            }
            const barcode_number = String(barcodeValue).trim();
            
            // Log if barcode starts with 6 or 0 for debugging
            if (barcode_number && (barcode_number.startsWith('6') || barcode_number.startsWith('0'))) {
              logger.log(`Processing barcode starting with ${barcode_number[0]}: "${barcode_number}" (original type: ${originalBarcodeType}, original value: ${originalBarcodeValue})`);
            }
            
            // Special logging for the specific barcode the user mentioned
            if (barcode_number === '08674030' || barcode_number === '8674030' || originalBarcodeValue === '08674030' || originalBarcodeValue === 8674030) {
              logger.log(`🔍 Found barcode 08674030/8674030: processed as "${barcode_number}" (original: ${originalBarcodeType} ${originalBarcodeValue})`);
            }

            const bottle = {

              barcode_number: barcode_number,

              serial_number: (row['Serial Number'] || row['serial_number'] || row['Serial'] || row['SerialNumber'] || '').toString().trim(),

              assigned_customer: Array.from(customerMap.keys()).some(key => key.toUpperCase() === customerId) ? customerId : null,

              customer_name: customerName,

              customer_id_from_excel: customerId, // Store the CustomerListID from Excel for later matching

              location: location,

              product_code: row['Product Code'] || row['product_code'] || row['ProductCode'] || row['Product'] || '',

              description: row['Description'] || row['description'] || row['Desc'] || '',

              gas_type: gasType,

              group_name: row['Group'] || row['group'] || row['Group Name'] || '',

              category: row['Category'] || row['category'] || '',

              type: row['Type'] || row['type'] || '',

              ownership: row['Ownership'] || row['ownership'] || '',

              days_at_location: row['Days At Location'] || row['days_at_location'] || row['DaysAtLocation'] ? parseInt(row['Days At Location'] || row['days_at_location'] || row['DaysAtLocation']) : null,

              status: 'rented', // All bottles are rentals by default

              organization_id: organization.id

            };



            bottlesToInsert.push(bottle);

          });



          // Create customers first

          if (customersToCreate.length > 0) {

            logger.log(`Creating ${customersToCreate.length} customers...`);

            

            const { error: customerError } = await supabase

              .from('customers')

              .upsert(customersToCreate, { 

                onConflict: 'CustomerListID',

                ignoreDuplicates: false 

              });



            if (customerError) {

              logger.error('Customer creation error:', customerError);

              

              // Handle duplicate key errors by querying existing customers

              if (customerError.code === '23505') {

                logger.log('Handling duplicate customers - querying existing ones...');

                

                // Query for existing customers that might have caused the duplicate error

                const existingCustomerIds = customersToCreate.map(c => c.CustomerListID);

                const { data: existingCustomers } = await supabase

                  .from('customers')

                  .select('id, "CustomerListID", name')

                  .in('"CustomerListID"', existingCustomerIds)

                  .eq('organization_id', organization.id);

                

                if (existingCustomers) {

                  existingCustomers.forEach(customer => {

                    customerMap.set(customer.CustomerListID.toUpperCase(), {

                      id: customer.id,

                      CustomerListID: customer.CustomerListID,

                      name: customer.name

                    });

                  });

                  logger.log(`Added ${existingCustomers.length} existing customers to map`);

                }

              }

            } else {

              // After creating customers, refresh the entire customer map to ensure we have all latest UUIDs

              logger.log('Refreshing customer map after customer creation...');

              
              const { data: allCustomers } = await supabase

                .from('customers')

                .select('id, "CustomerListID", name')

                .eq('organization_id', organization.id);

              

              if (allCustomers) {

                // Clear and rebuild the customer map with fresh data

                customerMap.clear();

                allCustomers.forEach(customer => {

                  customerMap.set(customer.CustomerListID.toUpperCase(), {

                    id: customer.id,

                    CustomerListID: customer.CustomerListID,

                    name: customer.name

                  });

                });

                logger.log(`Refreshed customer map with ${allCustomers.length} customers`);

              }

            }

          }

          // Final refresh of customer map to ensure we have the latest UUIDs before matching
          // This ensures any customers created during upload are available for matching
          logger.log('Performing final refresh of customer map before matching...');
          const { data: finalCustomers } = await supabase
            .from('customers')
            .select('id, "CustomerListID", name')
            .eq('organization_id', organization.id);
          
          if (finalCustomers) {
            customerMap.clear();
            // Create a name-to-customer map for easier lookup by name
            const nameMap = new Map();
            finalCustomers.forEach(customer => {
              const customerData = {
                id: customer.id,
                CustomerListID: customer.CustomerListID,
                name: customer.name
              };
              // Map by CustomerListID (uppercase)
              customerMap.set(customer.CustomerListID.toUpperCase(), customerData);
              // Also map by normalized name for name-based lookups
              if (customer.name) {
                const normalizedName = customer.name.trim().toLowerCase();
                // Store in nameMap, but allow multiple customers with same name (take first)
                if (!nameMap.has(normalizedName)) {
                  nameMap.set(normalizedName, customerData);
                }
              }
            });
            // Store nameMap in customerMap for later use
            customerMap._nameMap = nameMap;
            logger.log(`Final customer map refreshed with ${finalCustomers.length} customers (${nameMap.size} unique names)`);
          }

          // Now update bottles with correct assigned_customer values (using customer UUID id, not CustomerListID)

          bottlesToInsert.forEach(bottle => {

            if (bottle.customer_name && bottle.customer_name.trim()) {

              let customer = null;

              let customerListIdKey = null;

              

              // First, try to match by CustomerListID from Excel (most reliable)

              if (bottle.customer_id_from_excel) {

                const excelCustomerId = bottle.customer_id_from_excel.toUpperCase();

                if (customerMap.has(excelCustomerId)) {

                  customer = customerMap.get(excelCustomerId);

                  customerListIdKey = excelCustomerId;

                }

              }

              

              // If not found by ID, try to match by customer name

              if (!customer) {

                // Extract name part (remove ID in parentheses if present)

                const customerNameClean = bottle.customer_name.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();

                

                // Try exact match first

                customerListIdKey = Array.from(customerMap.keys()).find(key => 

                  customerMap.get(key).name.toLowerCase() === bottle.customer_name.trim().toLowerCase()

                );

                

                // If exact match fails, try matching cleaned name (without ID in parentheses)

                if (!customerListIdKey && customerNameClean !== bottle.customer_name.trim()) {

                  customerListIdKey = Array.from(customerMap.keys()).find(key => 

                    customerMap.get(key).name.toLowerCase() === customerNameClean.toLowerCase()

                  );

                }

                

                // If still not found, try matching parent customer (for child accounts like "PARENT:CHILD:SUBCHILD")
                // Extract the part before the first colon as the parent name
                if (!customerListIdKey && customerNameClean.includes(':')) {

                  const parentName = customerNameClean.split(':')[0].trim();

                  if (parentName) {

                    customerListIdKey = Array.from(customerMap.keys()).find(key => 

                      customerMap.get(key).name.toLowerCase() === parentName.toLowerCase()

                    );

                    if (customerListIdKey) {

                      logger.log(`Matched child account "${customerNameClean}" to parent customer "${customerMap.get(customerListIdKey).name}"`);

                    }

                  }

                }

                

                if (customerListIdKey) {

                  customer = customerMap.get(customerListIdKey);

                }

              }

              

              if (customer) {

                // Use CustomerListID for assigned_customer (application logic uses CustomerListID, not UUID)

                bottle.assigned_customer = customer.CustomerListID;

                bottle.status = 'rented'; // Ensure status is rented if customer is assigned

              } else {

                // If no customer found, this bottle should be available (not rented)

                bottle.status = 'available';

                bottle.assigned_customer = null;

              }

            } else {

              // No customer name means this bottle should be available

              bottle.status = 'available';

              bottle.assigned_customer = null;

            }

            

            // Keep customer_id_from_excel for now - we need it for auto-creating missing customers during updates
            // It will be removed after all processing is complete

          });



          // Check for existing bottles to prevent duplicates

          const bottleBarcodes = bottlesToInsert.map(b => b.barcode_number).filter(b => b && b.trim() !== '');

          const bottleSerials = bottlesToInsert.map(b => b.serial_number).filter(s => s && s.trim() !== '');

          

          logger.log(`Checking for duplicates: ${bottleBarcodes.length} barcodes, ${bottleSerials.length} serials`);

          

          let existingBottles = [];

          if (bottleBarcodes.length > 0 || bottleSerials.length > 0) {

            // Get ALL existing bottles for this organization to check against
            // Include customer info to compare if customer has changed

            const { data: allExisting } = await supabase

              .from('bottles')

              .select('barcode_number, serial_number, id, assigned_customer, customer_name')

              .eq('organization_id', organization.id);

            

            existingBottles = allExisting || [];

            logger.log(`Found ${existingBottles.length} total existing bottles in database`);

          }

          

          // Separate bottles into: new bottles, bottles to update (different customer), and true duplicates (same customer)

          const newBottles = [];

          const bottlesToUpdate = [];

          const duplicates = [];

          

          bottlesToInsert.forEach(bottle => {

            const barcode = bottle.barcode_number?.trim();

            const serial = bottle.serial_number?.trim();
            
            // Special logging for barcode 08674030
            if (barcode === '08674030' || barcode === '8674030' || barcode?.endsWith('08674030') || barcode?.endsWith('8674030')) {
              logger.log(`🔍 Processing barcode "${barcode}" (serial: "${serial}") - checking for existing bottle...`);
            }

            

            // Find existing bottle by barcode or serial
            // Handle case where Excel converts barcodes with leading zeros to numbers
            // e.g., "08674030" becomes 8674030, but database has "08674030"
            const existingBottle = existingBottles.find(existing => {
              const existingBarcode = existing.barcode_number?.trim();
              const existingSerial = existing.serial_number?.trim();
              
              // Exact match first
              if (barcode && existingBarcode === barcode) return true;
              if (serial && existingSerial === serial) return true;
              
              // Handle leading zero mismatch: if one starts with 0 and the other doesn't,
              // try matching the numeric parts
              if (barcode && existingBarcode) {
                const barcodeNum = barcode.replace(/^0+/, ''); // Remove leading zeros
                const existingBarcodeNum = existingBarcode.replace(/^0+/, ''); // Remove leading zeros
                if (barcodeNum && existingBarcodeNum && barcodeNum === existingBarcodeNum) {
                  logger.log(`Matched barcode with leading zero mismatch: "${barcode}" matches "${existingBarcode}"`);
                  return true;
                }
              }
              
              return false;
            });

            

            // Special logging for barcode 08674030
            if (barcode === '08674030' || barcode === '8674030' || barcode?.endsWith('08674030') || barcode?.endsWith('8674030')) {
              if (existingBottle) {
                logger.log(`🔍 Found existing bottle for "${barcode}": id=${existingBottle.id}, existing_barcode="${existingBottle.barcode_number}", existing_customer="${existingBottle.assigned_customer || existingBottle.customer_name}"`);
              } else {
                logger.log(`🔍 No existing bottle found for "${barcode}" - will be inserted as new`);
              }
            }
            
            if (existingBottle) {

              // Bottle exists - check if customer is different
              // Get the CustomerListID from the existing bottle's assigned_customer
              const existingCustomerListID = existingBottle.assigned_customer || '';
              
              // Get the new customer assignment from the uploaded file
              // The bottle object should have assigned_customer set during customer matching (lines 720-852)
              let newCustomerListID = bottle.assigned_customer || '';
              
              // Normalize both for comparison
              const existingCustomerNormalized = String(existingCustomerListID).trim().toUpperCase();
              const newCustomerNormalized = String(newCustomerListID).trim().toUpperCase();
              
              // Also get customer names for fallback comparison
              const existingCustomerName = String(existingBottle.customer_name || '').trim().toUpperCase();
              const newCustomerName = String(bottle.customer_name || '').trim().toUpperCase();
              
              // Determine if customer has changed
              // Customer is different if:
              // 1. CustomerListIDs are different (most reliable)
              // 2. One has a customer and the other doesn't
              // 3. Both have customer names but they're different AND neither has a CustomerListID
              const customerChanged = 
                (existingCustomerNormalized !== newCustomerNormalized) ||
                (!existingCustomerNormalized && newCustomerNormalized) ||
                (existingCustomerNormalized && !newCustomerNormalized) ||
                (!existingCustomerNormalized && !newCustomerNormalized && 
                 existingCustomerName && newCustomerName && 
                 existingCustomerName !== newCustomerName);

              if (customerChanged) {

                // Customer has changed - update the existing bottle

                bottlesToUpdate.push({

                  id: existingBottle.id,

                  bottle: bottle,

                  reason: barcode && existingBottle.barcode_number?.trim() === barcode ? 'barcode' : 'serial',

                  oldCustomer: existingCustomerListID || existingBottle.customer_name || 'No customer',

                  newCustomer: newCustomerListID || bottle.customer_name || 'No customer'

                });

                logger.log(`Updating bottle ${barcode || serial}: customer changed from "${existingCustomerListID || existingBottle.customer_name || 'No customer'}" to "${newCustomerListID || bottle.customer_name || 'No customer'}"`);

              } else {

                // Same bottle, same customer - skip as duplicate

                duplicates.push({

                  barcode: barcode || 'N/A',

                  serial: serial || 'N/A',

                  reason: barcode && existingBottle.barcode_number?.trim() === barcode ? 'barcode' : 'serial',

                  customer: newCustomerListID || bottle.customer_name || 'No customer'

                });

                logger.log(`Skipping duplicate bottle: ${barcode || serial} (same customer: ${newCustomerListID || bottle.customer_name || 'No customer'})`);

              }

            } else {

              // Bottle doesn't exist - add to new bottles
              // Log if barcode starts with 6 or 0 for debugging
              if (bottle.barcode_number && (bottle.barcode_number.startsWith('6') || bottle.barcode_number.startsWith('0'))) {
                logger.log(`Adding new bottle with barcode starting with ${bottle.barcode_number[0]}: "${bottle.barcode_number}"`);
              }
              
              // Special logging for barcode 08674030
              if (barcode === '08674030' || barcode === '8674030') {
                logger.log(`🔍 Adding barcode "${barcode}" as NEW bottle (not found in existing bottles)`);
              }
              
              newBottles.push(bottle);

            }

          });

          

          logger.log(`Found ${duplicates.length} duplicates (skipped), ${bottlesToUpdate.length} bottles to update, ${newBottles.length} new bottles to insert`);



          // Update bottles with different customers - ONLY update customer fields, don't modify other bottle data
          // Batch updates in parallel for better performance

          if (bottlesToUpdate.length > 0) {

            logger.log(`Updating ${bottlesToUpdate.length} bottles in batches...`);

            // Fetch locations again to ensure we have them for location name filtering
            const { data: updateLocations } = await supabase
              .from('locations')
              .select('name')
              .eq('organization_id', organization.id);
            const updateLocationNames = updateLocations?.map(loc => loc.name.toLowerCase()) || [];
            
            // Refresh customer map one more time right before validation to ensure we have latest data
            logger.log('Refreshing customer map one final time before validation...');
            const { data: validationCustomers } = await supabase
              .from('customers')
              .select('id, "CustomerListID", name')
              .eq('organization_id', organization.id);
            
            if (validationCustomers) {
              customerMap.clear();
              // Create name map for faster lookups
              const nameMap = new Map();
              validationCustomers.forEach(customer => {
                const customerData = {
                  id: customer.id,
                  CustomerListID: customer.CustomerListID,
                  name: customer.name
                };
                customerMap.set(customer.CustomerListID.toUpperCase(), customerData);
                if (customer.name) {
                  const normalizedName = customer.name.trim().toLowerCase();
                  if (!nameMap.has(normalizedName)) {
                    nameMap.set(normalizedName, customerData);
                  }
                }
              });
              customerMap._nameMap = nameMap;
              logger.log(`Customer map refreshed with ${validationCustomers.length} customers for validation`);
            }
            
            // Track missing customers to avoid duplicate warnings and collect for auto-creation
            const missingCustomersSet = new Set();
            const missingCustomersToCreate = new Map(); // Map: normalizedName -> { name, CustomerListID from Excel }
            
            // No need to validate UUIDs - we're using CustomerListID which is the application identifier
            const batchSize = 50; // Process 50 updates in parallel at a time

            

            for (let i = 0; i < bottlesToUpdate.length; i += batchSize) {

              const batch = bottlesToUpdate.slice(i, i + batchSize);

              

              // Process batch in parallel

              const batchPromises = batch.map(({ id, bottle }) => {

                // Use CustomerListID directly (application logic uses CustomerListID, not UUID)
                let assignedCustomer = bottle.assigned_customer;
                
                // If assigned_customer is not set but we have customer_name, try to find the customer
                if (!assignedCustomer && bottle.customer_name && bottle.customer_name.trim()) {
                  const customerNameClean = bottle.customer_name.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
                  
                  // Check if this looks like a location name rather than a customer name
                  // Common location names that shouldn't be treated as customers
                  const commonLocationNames = ['saskatoon', 'regina', 'prince george', 'chilliwack', 'horseshoe lake', 
                    'warehouse', 'inventory', 'stock', 'available', 'unassigned', 'home', 'base'];
                  const isLikelyLocation = commonLocationNames.some(loc => 
                    customerNameClean.toLowerCase().includes(loc.toLowerCase())
                  );
                  
                  // Also check if it matches any known locations in the organization
                  let isKnownLocation = false;
                  const locationNamesToCheck = updateLocationNames || locationNames || [];
                  if (locationNamesToCheck.length > 0) {
                    const normalizedCustomerName = customerNameClean.toLowerCase();
                    isKnownLocation = locationNamesToCheck.some(loc => 
                      normalizedCustomerName === loc || 
                      normalizedCustomerName.includes(loc) || 
                      loc.includes(normalizedCustomerName)
                    );
                  }
                  
                  // Check if it matches the organization name (owner) - owners are not customers
                  const isOwnerOrganization = organization && organization.name && 
                    customerNameClean.toLowerCase() === organization.name.toLowerCase().trim();
                  
                  // If it's likely a location or the owner organization, skip customer matching and set to null silently
                  if (isLikelyLocation || isKnownLocation || isOwnerOrganization) {
                    if (isOwnerOrganization) {
                      logger.log(`Skipping customer lookup for "${bottle.customer_name}" - this is the owner organization`);
                    } else {
                      logger.log(`Skipping customer lookup for "${bottle.customer_name}" - appears to be a location name`);
                    }
                    assignedCustomer = null;
                  } else {
                    let matchingCustomer = null;
                    
                    // First, try using the nameMap if available (faster lookup)
                    if (customerMap._nameMap) {
                      const normalizedName = customerNameClean.toLowerCase();
                      matchingCustomer = customerMap._nameMap.get(normalizedName);
                    }
                    
                    // If not found in nameMap, search through all customers (fallback)
                    if (!matchingCustomer) {
                      matchingCustomer = Array.from(customerMap.values()).find(c => {
                        if (!c || !c.name) return false;
                        const cName = c.name.trim().toLowerCase();
                        const bottleName = bottle.customer_name.trim().toLowerCase();
                        const cleanName = customerNameClean.toLowerCase();
                        return cName === bottleName || cName === cleanName;
                      });
                    }
                    
                    // If not found, try fuzzy matching (handle extra spaces, case differences)
                    if (!matchingCustomer) {
                      const normalizedBottleName = customerNameClean.toLowerCase().replace(/\s+/g, ' ').trim();
                      matchingCustomer = Array.from(customerMap.values()).find(c => {
                        if (!c || !c.name) return false;
                        const normalizedCName = c.name.trim().toLowerCase().replace(/\s+/g, ' ').trim();
                        return normalizedCName === normalizedBottleName;
                      });
                    }
                    
                    // If not found, try matching parent customer (for child accounts)
                    if (!matchingCustomer && customerNameClean.includes(':')) {
                      const parentName = customerNameClean.split(':')[0].trim();
                      if (parentName) {
                        if (customerMap._nameMap) {
                          matchingCustomer = customerMap._nameMap.get(parentName.toLowerCase());
                        }
                        if (!matchingCustomer) {
                          matchingCustomer = Array.from(customerMap.values()).find(c => 
                            c && c.name && c.name.toLowerCase().trim() === parentName.toLowerCase()
                          );
                        }
                        if (matchingCustomer) {
                          logger.log(`Matched child account "${customerNameClean}" to parent customer "${matchingCustomer.name}"`);
                        }
                      }
                    }
                    
                    if (matchingCustomer) {
                      assignedCustomer = matchingCustomer.CustomerListID;
                      logger.log(`Found customer CustomerListID ${assignedCustomer} for ${bottle.customer_name}`);
                    } else {
                      // Try partial/fuzzy matching as last resort (e.g., "Central Welding" might match "Central Welding Supplies")
                      const normalizedSearch = customerNameClean.toLowerCase().replace(/[^a-z0-9]/g, '');
                      const fuzzyMatch = Array.from(customerMap.values()).find(c => {
                        if (!c || !c.name) return false;
                        const normalizedCName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        // Check if search name is contained in customer name or vice versa (for partial matches)
                        return (normalizedCName.includes(normalizedSearch) || normalizedSearch.includes(normalizedCName)) && 
                               normalizedSearch.length > 5; // Only for names longer than 5 chars to avoid false matches
                      });
                      
                      if (fuzzyMatch) {
                        assignedCustomer = fuzzyMatch.CustomerListID;
                        logger.log(`Found customer via fuzzy match: CustomerListID ${assignedCustomer} for "${bottle.customer_name}" (matched: "${fuzzyMatch.name}")`);
                      } else {
                        // Check if this is the owner organization before tracking for auto-creation
                        const isOwnerOrganization = organization && organization.name && 
                          customerNameClean.toLowerCase() === organization.name.toLowerCase().trim();
                        
                        // Debug logging for owner organization check
                        if (customerNameClean.toLowerCase().includes('central welding')) {
                          logger.log(`Owner check for "${customerNameClean}": org.name="${organization?.name}", isOwner=${isOwnerOrganization}`);
                        }
                        
                        // Only track if it's not a location, not the owner organization, and not a very short name (likely data error)
                        const isShortName = customerNameClean.length < 3;
                        if (!isShortName && !isOwnerOrganization) {
                          // Track missing customer for auto-creation
                          const normalizedMissingName = customerNameClean.toLowerCase();
                          if (!missingCustomersSet.has(normalizedMissingName)) {
                            missingCustomersSet.add(normalizedMissingName);
                            // Try to extract CustomerListID from the bottle's customer_id_from_excel if available
                            // Also try to extract from customer_name if it has ID in parentheses
                            let customerIdFromExcel = bottle.customer_id_from_excel;
                            if (!customerIdFromExcel && bottle.customer_name) {
                              const idMatch = bottle.customer_name.match(/\(([^)]+)\)/);
                              if (idMatch && idMatch[1]) {
                                customerIdFromExcel = idMatch[1].trim().toUpperCase();
                              }
                            }
                            if (!missingCustomersToCreate.has(normalizedMissingName)) {
                              const autoCustomerId = customerIdFromExcel || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                              missingCustomersToCreate.set(normalizedMissingName, {
                                name: customerNameClean,
                                CustomerListID: autoCustomerId
                              });
                              logger.log(`Will auto-create customer: "${customerNameClean}" with ID: ${autoCustomerId}`);
                            }
                          }
                        } else if (isOwnerOrganization) {
                          logger.log(`Skipping auto-creation for "${customerNameClean}" - this is the owner organization`);
                        }
                        assignedCustomer = null;
                      }
                    }
                  }
                }
                
                // Determine status: if customer is assigned, status should be 'rented', otherwise 'available'

                const hasCustomer = assignedCustomer || 

                                   (bottle.customer_name && bottle.customer_name.trim());

                const newStatus = hasCustomer ? 'rented' : 'available';

                

                return supabase

                  .from('bottles')

                  .update({

                    assigned_customer: assignedCustomer,

                    customer_name: bottle.customer_name,

                    status: newStatus // Set status based on whether customer is assigned

                  })

                  .eq('id', id);

              });

              

              // Wait for this batch to complete before starting next batch

              const results = await Promise.all(batchPromises);

              

              // Check for errors

              for (const result of results) {

                if (result.error) {

                  logger.error('Error updating bottle:', result.error);

                  throw result.error;

                }

              }

              

              logger.log(`Updated batch: ${Math.min(i + batchSize, bottlesToUpdate.length)} / ${bottlesToUpdate.length}`);

            }

            

            logger.log(`Successfully updated ${bottlesToUpdate.length} bottles`);
            
            // Auto-create missing customers that were found during updates
            if (missingCustomersToCreate.size > 0) {
              logger.log(`Auto-creating ${missingCustomersToCreate.size} missing customer(s) found during updates...`);
              const customersToAutoCreate = Array.from(missingCustomersToCreate.values()).map(customer => ({
                CustomerListID: customer.CustomerListID,
                name: customer.name,
                organization_id: organization.id
              }));
              
              const { error: autoCreateError } = await supabase
                .from('customers')
                .upsert(customersToAutoCreate, {
                  onConflict: 'CustomerListID',
                  ignoreDuplicates: false
                });
              
              if (autoCreateError) {
                logger.error('Error auto-creating missing customers:', autoCreateError);
              } else {
                logger.log(`✅ Auto-created ${customersToAutoCreate.length} missing customer(s)`);
                
                // Refresh customer map with newly created customers
                const { data: refreshedCustomers } = await supabase
                  .from('customers')
                  .select('id, "CustomerListID", name')
                  .eq('organization_id', organization.id);
                
                if (refreshedCustomers) {
                  customerMap.clear();
                  const nameMap = new Map();
                  refreshedCustomers.forEach(customer => {
                    const customerData = {
                      id: customer.id,
                      CustomerListID: customer.CustomerListID,
                      name: customer.name
                    };
                    customerMap.set(customer.CustomerListID.toUpperCase(), customerData);
                    if (customer.name) {
                      const normalizedName = customer.name.trim().toLowerCase();
                      if (!nameMap.has(normalizedName)) {
                        nameMap.set(normalizedName, customerData);
                      }
                    }
                  });
                  customerMap._nameMap = nameMap;
                  logger.log(`Refreshed customer map with ${refreshedCustomers.length} customers (including newly created)`);
                  
                  // Now update bottles again with the newly created customers
                  logger.log('Re-updating bottles with newly created customers...');
                  for (let i = 0; i < bottlesToUpdate.length; i += batchSize) {
                    const batch = bottlesToUpdate.slice(i, i + batchSize);
                    const batchPromises = batch.map(({ id, bottle }) => {
                      let assignedCustomer = bottle.assigned_customer;
                      
                      // Try to find customer again now that we've created missing ones
                      if (!assignedCustomer && bottle.customer_name && bottle.customer_name.trim()) {
                        const customerNameClean = bottle.customer_name.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
                        const normalizedName = customerNameClean.toLowerCase();
                        
                        // Check if it's a location (skip)
                        const isLikelyLocation = ['saskatoon', 'regina', 'prince george', 'chilliwack', 'horseshoe lake', 
                          'warehouse', 'inventory', 'stock', 'available', 'unassigned', 'home', 'base'].some(loc => 
                          customerNameClean.toLowerCase().includes(loc.toLowerCase())
                        );
                        const isKnownLocation = updateLocationNames.some(loc => 
                          normalizedName === loc || normalizedName.includes(loc) || loc.includes(normalizedName)
                        );
                        
                        // Check if it matches the organization name (owner) - owners are not customers
                        const isOwnerOrganization = organization && organization.name && 
                          normalizedName === organization.name.toLowerCase().trim();
                        
                        if (!isLikelyLocation && !isKnownLocation && !isOwnerOrganization) {
                          // Try to find customer now
                          if (customerMap._nameMap) {
                            const matchingCustomer = customerMap._nameMap.get(normalizedName);
                            if (matchingCustomer) {
                              assignedCustomer = matchingCustomer.CustomerListID;
                            }
                          }
                        }
                      }
                      
                      const hasCustomer = assignedCustomer || (bottle.customer_name && bottle.customer_name.trim());
                      const newStatus = hasCustomer ? 'rented' : 'available';
                      
                      return supabase
                        .from('bottles')
                        .update({
                          assigned_customer: assignedCustomer,
                          customer_name: bottle.customer_name,
                          status: newStatus
                        })
                        .eq('id', id);
                    });
                    
                    await Promise.all(batchPromises);
                  }
                  logger.log('✅ Re-updated bottles with newly created customers');
                }
              }
            }
            
            // Clean up customer_id_from_excel from all bottles after processing
            bottlesToInsert.forEach(bottle => {
              if (bottle.customer_id_from_excel) {
                delete bottle.customer_id_from_excel;
              }
            });
            bottlesToUpdate.forEach(({ bottle }) => {
              if (bottle.customer_id_from_excel) {
                delete bottle.customer_id_from_excel;
              }
            });

          }



          // Insert only new bottles

          if (newBottles.length > 0) {

            const batchSize = 100;

            for (let i = 0; i < newBottles.length; i += batchSize) {

              const batch = newBottles.slice(i, i + batchSize);
              
              // Clean up customer_id_from_excel from batch before inserting (explicitly exclude it)
              const cleanBatch = batch.map(bottle => {
                const { customer_id_from_excel, ...cleanBottle } = bottle;
                return cleanBottle;
              });
              
              // Log barcodes starting with 6 in this batch for debugging
              const barcodesStartingWith6 = batch.filter(b => b.barcode_number && b.barcode_number.startsWith('6'));
              if (barcodesStartingWith6.length > 0) {
                logger.log(`Inserting batch ${i / batchSize + 1}: ${barcodesStartingWith6.length} bottles with barcodes starting with 6:`, 
                  barcodesStartingWith6.map(b => b.barcode_number));
              }

              const { error } = await supabase

                .from('bottles')

                .insert(cleanBatch);



              if (error) {

                logger.error('Error inserting batch:', error);
                // Log which barcodes failed if error is about barcodes
                if (error.message && error.message.includes('barcode')) {
                  logger.error('Failed barcodes in batch:', batch.map(b => b.barcode_number));
                }
                throw error;

              }

            }

          }



          // Show proper success message with update and duplicate info

          let message = '';

          if (newBottles.length > 0) {

            message += `${newBottles.length} bottles uploaded`;

          }

          if (bottlesToUpdate.length > 0) {

            if (message) message += ', ';

            message += `${bottlesToUpdate.length} bottles updated`;

          }

          if (duplicates.length > 0) {

            if (message) message += ', ';

            message += `${duplicates.length} duplicates skipped`;

          }

          if (!message) {

            message = 'No changes made';

          } else {

            message += ' successfully!';

          }

          setSnackbar({ open: true, message, severity: 'success' });

          setUploadDialog(false);

          setUploadFile(null);

          setUploadPreview([]);

          loadBottles();

          loadCustomers();



        } catch (error) {

          logger.error('Error processing file:', error);

          setSnackbar({ open: true, message: 'Failed to upload bottles', severity: 'error' });

        } finally {

          setLoading(false);

        }

      };

      reader.readAsArrayBuffer(uploadFile);

    } catch (error) {

      logger.error('Error uploading bottles:', error);

      setSnackbar({ open: true, message: 'Failed to upload bottles', severity: 'error' });

      setLoading(false);

    }

  };



  const handleEditBottle = (bottle) => {

    setEditingBottle(bottle);

    setEditDialog(true);

  };



  const handleSaveEdit = async () => {

    try {

      const { error } = await supabase

        .from('bottles')

        .update({

          serial_number: editingBottle.serial_number,

          barcode_number: editingBottle.barcode_number,

          assigned_customer: editingBottle.assigned_customer,

          customer_name: editingBottle.customer_name,

          location: editingBottle.location,

          product_code: editingBottle.product_code,

          description: editingBottle.description,

          gas_type: editingBottle.gas_type,

          status: editingBottle.status

        })

        .eq('id', editingBottle.id);



      if (error) throw error;



      setSnackbar({ open: true, message: 'Bottle updated successfully', severity: 'success' });

      setEditDialog(false);

      setEditingBottle(null);

      loadBottles();

    } catch (error) {

      logger.error('Error updating bottle:', error);

      setSnackbar({ open: true, message: 'Failed to update bottle', severity: 'error' });

    }

  };



  const handleDeleteBottles = async () => {

    try {

      const bottleIds = bottlesToDelete.map(b => b.id);

      logger.log('Deleting bottles:', bottlesToDelete.map(b => ({ id: b.id, barcode: b.barcode_number })));

      logger.log('Bottle IDs to delete:', bottleIds);

      

      // Check if we have valid IDs

      if (bottleIds.length === 0) {

        throw new Error('No bottles selected for deletion');

      }

      

      // Check for invalid IDs

      const invalidIds = bottleIds.filter(id => !id || typeof id !== 'string');

      if (invalidIds.length > 0) {

        logger.error('Invalid bottle IDs found:', invalidIds);

        throw new Error('Some bottles have invalid IDs');

      }



      // Try deleting in smaller batches to avoid timeouts

      const batchSize = 50; // Smaller batches for better reliability

      let successCount = 0;

      let errorCount = 0;

      

      logger.log(`Deleting ${bottleIds.length} bottles in batches of ${batchSize}...`);

      

      for (let i = 0; i < bottleIds.length; i += batchSize) {

        const batch = bottleIds.slice(i, i + batchSize);

        logger.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(bottleIds.length/batchSize)} (${batch.length} bottles)`);

        

        try {

          const { error: batchError } = await supabase

            .from('bottles')

            .delete()

            .in('id', batch);

          

          if (batchError) {

            logger.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);

            // If batch fails, try individual deletions

            for (const bottleId of batch) {

              try {

                const { error: individualError } = await supabase

                  .from('bottles')

                  .delete()

                  .eq('id', bottleId);

                

                if (individualError) {

                  logger.error(`Failed to delete bottle ${bottleId}:`, individualError);

                  errorCount++;

                } else {

                  successCount++;

                }

              } catch (err) {

                logger.error(`Exception deleting bottle ${bottleId}:`, err);

                errorCount++;

              }

            }

          } else {

            successCount += batch.length;

            logger.log(`Batch ${Math.floor(i/batchSize) + 1} successful: ${batch.length} bottles deleted`);

          }

          

          // Small delay between batches to avoid overwhelming the database

          if (i + batchSize < bottleIds.length) {

            await new Promise(resolve => setTimeout(resolve, 100));

          }

        } catch (err) {

          logger.error(`Exception in batch ${Math.floor(i/batchSize) + 1}:`, err);

          errorCount += batch.length;

        }

      }

      

      if (errorCount > 0) {

        throw new Error(`${errorCount} bottles failed to delete, ${successCount} deleted successfully`);

      }



      setSnackbar({ 

        open: true, 

        message: `${successCount} bottles deleted successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`, 

        severity: errorCount > 0 ? 'warning' : 'success' 

      });

      setDeleteDialog(false);

      setBottlesToDelete([]);

      loadBottles();

    } catch (error) {

      logger.error('Error deleting bottles:', error);

      

      // Provide more specific error messages

      let errorMessage = 'Failed to delete bottles';

      if (error.code === '23503') {

        errorMessage = 'Cannot delete bottles that are referenced by other records (rentals, scans, etc.)';

      } else if (error.code === '400') {

        errorMessage = 'Bad request - check bottle IDs and try again';

      } else if (error.message) {

        errorMessage = `Delete failed: ${error.message}`;

      }

      

      setSnackbar({ open: true, message: errorMessage, severity: 'error' });

    }

  };



  const handleBottleDetails = (bottle) => {

    navigate(`/bottle/${bottle.barcode_number || bottle.id}`);

  };



  const handleCustomerDetails = async (customerId, customerName) => {

    if (customerId) {

      navigate(`/customer/${customerId}`);

    } else if (customerName && customerName !== '-') {

      // If no customer ID but we have a name, try to find the customer

      try {

        // First try exact match

        let { data: customerData, error } = await supabase

          .from('customers')

          .select('"CustomerListID"')

          .eq('name', customerName.trim())

          .eq('organization_id', organization.id)

          .single();



        // If not found, try case-insensitive partial match

        if (error || !customerData) {

          const { data: partialMatch, error: partialError } = await supabase

            .from('customers')

            .select('"CustomerListID"')

            .ilike('name', `%${customerName.trim()}%`)

            .eq('organization_id', organization.id)

            .limit(1)

            .single();



          if (!partialError && partialMatch) {

            customerData = partialMatch;

            error = null;

          }

        }



        if (!error && customerData) {

          navigate(`/customer/${customerData.CustomerListID}`);

        } else {

          setSnackbar({ 

            open: true, 

            message: `Customer "${customerName}" not found. They may need to be created first.`, 

            severity: 'warning' 

          });

        }

      } catch (error) {

        logger.error('Error finding customer:', error);

        setSnackbar({ open: true, message: 'Error finding customer', severity: 'error' });

      }

    } else {

      setSnackbar({ open: true, message: 'No customer information available', severity: 'warning' });

    }

  };



  const handleBulkDelete = () => {

    if (bottles.length === 0) {

      setSnackbar({ open: true, message: 'No bottles to delete', severity: 'warning' });

      return;

    }

    setBottlesToDelete(bottles);

    setDeleteDialog(true);

  };



  const handleDeleteAllBottles = async () => {

    try {

      // Get total count of all bottles for this organization

      const { count: totalBottles } = await supabase

        .from('bottles')

        .select('*', { count: 'exact', head: true })

        .eq('organization_id', organization.id);



      if (totalBottles === 0) {

        setSnackbar({ open: true, message: 'No bottles to delete', severity: 'warning' });

        return;

      }



      // Confirm deletion of ALL bottles

      const confirmMessage = `Are you sure you want to delete ALL ${totalBottles} bottles for this organization?\n\nThis action cannot be undone!`;

      if (!confirm(confirmMessage)) {

        return;

      }



      setLoading(true);

      

      // Delete all bottles for this organization

      const { error } = await supabase

        .from('bottles')

        .delete()

        .eq('organization_id', organization.id);



      if (error) {

        throw error;

      }



      setSnackbar({ 

        open: true, 

        message: `Successfully deleted all ${totalBottles} bottles`, 

        severity: 'success' 

      });

      

      // Reload the bottles list

      loadBottles();

      

    } catch (error) {

      logger.error('Error deleting all bottles:', error);

      setSnackbar({ 

        open: true, 

        message: `Failed to delete all bottles: ${error.message}`, 

        severity: 'error' 

      });

    } finally {

      setLoading(false);

    }

  };



  const handleCreateMissingCustomers = async () => {

    try {

      // Get all unique customers from bottles that don't have assigned_customer

      // We need to re-read the Excel data to get the original CustomerListID

      if (!uploadFile) {

        setSnackbar({ open: true, message: 'No upload file available. Please re-upload to create customers.', severity: 'warning' });

        return;

      }



      // Re-read the Excel file to get original CustomerListID values

      const reader = new FileReader();

      reader.onload = async (e) => {

        try {

          const data = new Uint8Array(e.target.result);

          const workbook = XLSX.read(data, { type: 'array' });

          const sheetName = workbook.SheetNames[0];

          const worksheet = workbook.Sheets[sheetName];

          const jsonData = XLSX.utils.sheet_to_json(worksheet);



          // Get unique customers with their original CustomerListID

          const customerMap = new Map();

          jsonData.forEach(row => {

            const customerName = row['Customer'] || row['customer_name'] || '';

            const customerId = String(row['CustomerListID'] || row['customer_list_id'] || '');

            

            if (customerName.trim() && customerId.trim()) {

              customerMap.set(customerName.trim(), customerId.trim());

            }

          });



          // Find bottles that need customers created

          const missingCustomers = bottles

            .filter(bottle => bottle.customer_name && bottle.customer_name !== '-' && !bottle.assigned_customer)

            .map(bottle => {

              const originalCustomerId = customerMap.get(bottle.customer_name.trim());

              return {

                name: bottle.customer_name.trim(),

                CustomerListID: originalCustomerId || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

              };

            })

            .filter((customer, index, self) => 

              index === self.findIndex(c => c.name === customer.name)

            );



          if (missingCustomers.length === 0) {

            setSnackbar({ open: true, message: 'No missing customers found', severity: 'info' });

            return;

          }



          logger.log(`Creating ${missingCustomers.length} missing customers with original CustomerListID...`);

          logger.log('Missing customers:', missingCustomers);



          // Create customers

          const customersToCreate = missingCustomers.map(customer => ({

            CustomerListID: customer.CustomerListID,

            name: customer.name,

            organization_id: organization.id

          }));



          // Use upsert to handle existing customers gracefully

          const { error } = await supabase

            .from('customers')

            .upsert(customersToCreate, { 

              onConflict: 'CustomerListID',

              ignoreDuplicates: false 

            });



          if (error) {

            logger.error('Error creating missing customers:', error);

            setSnackbar({ open: true, message: 'Failed to create missing customers', severity: 'error' });

          } else {

            // Now update bottles to assign them to the newly created customers

            logger.log('Updating bottles with customer assignments...');

            

            for (const customer of missingCustomers) {

              const { error: updateError } = await supabase

                .from('bottles')

                .update({ assigned_customer: customer.CustomerListID }) // Use CustomerListID (application logic)

                .eq('customer_name', customer.name)

                .eq('organization_id', organization.id)

                .is('assigned_customer', null);



              if (updateError) {

                logger.error(`Error updating bottles for customer ${customer.name}:`, updateError);

              }

            }



            setSnackbar({ 

              open: true, 

              message: `Successfully created ${missingCustomers.length} missing customers with original CustomerListID and assigned bottles!`, 

              severity: 'success' 

            });

            loadBottles(); // Reload to refresh the data

          }

        } catch (error) {

          logger.error('Error creating missing customers:', error);

          setSnackbar({ open: true, message: 'Failed to create missing customers', severity: 'error' });

        }

      };



      reader.readAsArrayBuffer(uploadFile);

    } catch (error) {

      logger.error('Error creating missing customers:', error);

      setSnackbar({ open: true, message: 'Failed to create missing customers', severity: 'error' });

    }

  };



  const handleDeleteBottle = (bottle) => {

    setBottlesToDelete([bottle]);

    setDeleteDialog(true);

  };



  if (loading && bottles.length === 0) {

    return (

      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">

        <Typography>Loading bottles...</Typography>

      </Box>

    );

  }



  return (

    <Box sx={{ p: 3 }}>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>

        <Typography variant="h4">Bottle Management</Typography>

        <Box display="flex" gap={2}>

          <Button

            variant="outlined"

            color="error"

            startIcon={<DeleteIcon />}

            onClick={handleDeleteAllBottles}

            disabled={loading}

          >

            Delete All Bottles

          </Button>

          <Button

            variant="outlined"

            color="warning"

            startIcon={<PersonAddIcon />}

            onClick={handleCreateMissingCustomers}

            sx={{ mr: 1 }}

          >

            Create Missing Customers

          </Button>

          <Button

            variant="contained"

            startIcon={<UploadIcon />}

            onClick={() => setUploadDialog(true)}

          >

            Upload Bottles

          </Button>

        </Box>

      </Box>



      {/* Filters */}

      <Box display="flex" gap={2} mb={3}>

        <TextField

          label="Search bottles"

          placeholder="Search by barcode, serial, customer, or description"

          value={searchTerm}

          onChange={(e) => {

            setSearchTerm(e.target.value);

            handleChangePage(null, 0); // Reset to first page when searching

          }}

          size="small"

          sx={{ minWidth: 300 }}

        />

        <FormControl size="small" sx={{ minWidth: 120 }}>

          <InputLabel>Status</InputLabel>

          <Select

            value={statusFilter}

            label="Status"

            onChange={(e) => {

              setStatusFilter(e.target.value);

              handleChangePage(null, 0); // Reset to first page when filtering

            }}

          >

            <MenuItem value="all">All</MenuItem>

            <MenuItem value="available">Available</MenuItem>

            <MenuItem value="rented">Rented</MenuItem>

          </Select>

        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>

          <InputLabel>Gas Type</InputLabel>

          <Select

            value={gasTypeFilter}

            label="Gas Type"

            onChange={(e) => {

              setGasTypeFilter(e.target.value);

              handleChangePage(null, 0); // Reset to first page when filtering

            }}

          >

            <MenuItem value="all">All</MenuItem>

            {availableGasTypes.map((gasType) => (

              <MenuItem key={gasType} value={gasType}>

                {gasType}

              </MenuItem>

            ))}

          </Select>

        </FormControl>

      </Box>



      {/* Bulk Actions Bar */}
      {selectedBottles.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" fontWeight={600}>
            {selectedBottles.length} bottle{selectedBottles.length !== 1 ? 's' : ''} selected
          </Typography>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => {
              const bottlesToDelete = filteredBottles.filter(b => selectedBottles.includes(b.id));
              setBottlesToDelete(bottlesToDelete);
              setDeleteDialog(true);
            }}
          >
            Delete Selected
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setSelectedBottles([])}
          >
            Clear Selection
          </Button>
        </Box>
      )}

      {/* Responsive Table */}

      <ResponsiveTable

        columns={[

          { 
            field: 'select', 
            header: 'Select',
            renderHeader: () => (
              <Checkbox
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onChange={handleSelectAll}
                size="small"
              />
            ),
            render: (value, row) => (
              <Checkbox
                checked={isSelected(row.id)}
                onChange={() => handleSelectBottle(row.id)}
                size="small"
                onClick={(e) => e.stopPropagation()}
              />
            )
          },

          { field: 'serial_number', header: 'Serial Number' },

          { field: 'barcode_number', header: 'Barcode', render: (value, row) => (

            <Box 

              onClick={() => handleBottleDetails(row)}

              sx={{ 

                cursor: 'pointer',

                color: 'primary.main',

                textDecoration: 'underline',

                '&:hover': { backgroundColor: 'action.hover' }

              }}

            >

              {value || '-'}

            </Box>

          )},

          { field: 'product_code', header: 'Product Code' },

          { field: 'description', header: 'Description' },

          { field: 'gas_type', header: 'Gas Type' },

          { field: 'status', header: 'Status', chip: true, chipColor: 'success' },

          { field: 'location', header: 'Location' },

          { field: 'customer_name', header: 'Customer' }

        ]}

        data={filteredBottles}

        keyField="id"

        title="Bottle Inventory"

        renderActions={(bottle) => (

          <Box sx={{ display: 'flex', gap: 1 }}>

            <IconButton 

              size="small" 

              onClick={() => handleEditBottle(bottle)}

              color="primary"

            >

              <EditIcon />

            </IconButton>

            <IconButton 

              size="small" 

              onClick={() => handleDeleteBottle(bottle)}

              color="error"

            >

              <DeleteIcon />

            </IconButton>

          </Box>

        )}

        renderExpandedContent={(bottle) => (

          <Box sx={{ p: 2 }}>

            <Typography variant="subtitle2" gutterBottom>Additional Details</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>

              <Box>

                <Typography variant="caption" color="text.secondary">Serial Number</Typography>

                <Typography variant="body2">{bottle.serial_number || '-'}</Typography>

              </Box>

              <Box>

                <Typography variant="caption" color="text.secondary">Product Code</Typography>

                <Typography variant="body2">{bottle.product_code || '-'}</Typography>

              </Box>

              <Box>

                <Typography variant="caption" color="text.secondary">Gas Type</Typography>

                <Typography variant="body2">{bottle.gas_type || '-'}</Typography>

              </Box>

              <Box>

                <Typography variant="caption" color="text.secondary">Location</Typography>

                <Typography variant="body2">{bottle.location || '-'}</Typography>

              </Box>

            </Box>

          </Box>

        )}

        onRowClick={handleBottleDetails}

      />



      {/* Optimized Pagination */}

      <TablePagination

        component="div"

        count={totalCount}

        page={page}

        onPageChange={handleChangePage}

        rowsPerPage={rowsPerPage}

        onRowsPerPageChange={handleChangeRowsPerPage}

        rowsPerPageOptions={[10, 25, 50, 100]}

        labelRowsPerPage="Rows per page:"

        labelDisplayedRows={({ from, to, count }) => 

          `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`

        }

      />



      {/* Upload Dialog */}

      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="md" fullWidth>

        <DialogTitle>Upload Bottles</DialogTitle>

        <DialogContent>

          <Box sx={{ mt: 2 }}>

            <input

              type="file"

              accept=".xlsx,.xls"

              onChange={handleFileSelect}

              style={{ marginBottom: 16 }}

            />

            

            {uploadPreview.length > 0 && (

              <Box>

                <Typography variant="h6" gutterBottom>Preview (first 5 rows):</Typography>

                <TableContainer component={Paper}>

                  <Table size="small">

                    <TableHead>

                      <TableRow>

                        {Object.keys(uploadPreview[0]).map(key => (

                          <TableCell key={key}>{key}</TableCell>

                        ))}

                      </TableRow>

                    </TableHead>

                    <TableBody>

                      {uploadPreview.map((row, index) => (

                        <TableRow key={index}>

                          {Object.values(row).map((value, i) => (

                            <TableCell key={i}>{String(value)}</TableCell>

                          ))}

                        </TableRow>

                      ))}

                    </TableBody>

                  </Table>

                </TableContainer>

              </Box>

            )}

          </Box>

        </DialogContent>

        <DialogActions>

          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>

          <Button

            onClick={handleUploadBottles}

            variant="contained"

            disabled={!uploadFile}

          >

            Upload

          </Button>

        </DialogActions>

      </Dialog>



      {/* Edit Dialog */}

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>

        <DialogTitle>Edit Bottle</DialogTitle>

        <DialogContent>

          {editingBottle && (

            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

              <TextField

                label="Serial Number"

                value={editingBottle.serial_number || ''}

                onChange={(e) => setEditingBottle({...editingBottle, serial_number: e.target.value})}

                fullWidth

              />

              <TextField

                label="Barcode"

                value={editingBottle.barcode_number || ''}

                onChange={(e) => setEditingBottle({...editingBottle, barcode_number: e.target.value})}

                fullWidth

              />

              <TextField

                label="Customer Name"

                value={editingBottle.customer_name || ''}

                onChange={(e) => setEditingBottle({...editingBottle, customer_name: e.target.value})}

                fullWidth

              />

              <FormControl fullWidth>

                <InputLabel>Location</InputLabel>

                <Select

                  value={editingBottle.location || ''}

                  onChange={(e) => setEditingBottle({...editingBottle, location: e.target.value})}

                  label="Location"

                >

                  <MenuItem value="SASKATOON">Saskatoon (Saskatchewan)</MenuItem>

                  <MenuItem value="REGINA">Regina (Saskatchewan)</MenuItem>

                  <MenuItem value="CHILLIWACK">Chilliwack (British Columbia)</MenuItem>

                  <MenuItem value="PRINCE_GEORGE">Prince George (British Columbia)</MenuItem>

                </Select>

              </FormControl>

              <TextField

                label="Product Code"

                value={editingBottle.product_code || ''}

                onChange={(e) => setEditingBottle({...editingBottle, product_code: e.target.value})}

                fullWidth

              />

              <TextField

                label="Description"

                value={editingBottle.description || ''}

                onChange={(e) => setEditingBottle({...editingBottle, description: e.target.value})}

                fullWidth

              />

              <TextField

                label="Gas Type"

                value={editingBottle.gas_type || ''}

                onChange={(e) => setEditingBottle({...editingBottle, gas_type: e.target.value})}

                fullWidth

              />

              <FormControl fullWidth>

                <InputLabel>Status</InputLabel>

                <Select

                  value={editingBottle.status}

                  label="Status"

                  onChange={(e) => setEditingBottle({...editingBottle, status: e.target.value})}

                >

                  <MenuItem value="available">Available</MenuItem>

                  <MenuItem value="rented">Rented</MenuItem>

                </Select>

              </FormControl>

            </Box>

          )}

        </DialogContent>

        <DialogActions>

          <Button onClick={() => setEditDialog(false)}>Cancel</Button>

          <Button onClick={handleSaveEdit} variant="contained">Save</Button>

        </DialogActions>

      </Dialog>



      {/* Delete Confirmation Dialog */}

      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>

        <DialogTitle>Confirm Delete</DialogTitle>

        <DialogContent>

          <Typography>

            Are you sure you want to delete {bottlesToDelete.length} bottle(s)? This action cannot be undone.

          </Typography>

        </DialogContent>

        <DialogActions>

          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>

          <Button onClick={handleDeleteBottles} variant="contained" color="error">

            Delete

          </Button>

        </DialogActions>

      </Dialog>



      {/* Snackbar */}

      <Snackbar

        open={snackbar.open}

        autoHideDuration={6000}

        onClose={() => setSnackbar({...snackbar, open: false})}

        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}

        sx={{ 

          zIndex: 99999999,

          position: 'fixed !important',

          top: '200px !important',

          right: '20px !important',

          '& .MuiSnackbar-root': {

            position: 'fixed !important',

            top: '200px !important',

            right: '20px !important'

          }

        }}

      >

        <Alert

          onClose={() => setSnackbar({...snackbar, open: false})}

          severity={snackbar.severity}

          sx={{ width: '100%' }}

        >

          {snackbar.message}

        </Alert>

      </Snackbar>

    </Box>

  );

};



export default BottleManagement;