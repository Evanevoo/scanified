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

  Chip

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



  // Load data

  useEffect(() => {

    if (organization) {

      loadBottles();

      loadCustomers();

    }

  }, [organization, page, rowsPerPage, searchTerm, statusFilter]); // Re-load when search/filter changes



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

      if (searchTerm) {

        query = query.or(`serial_number.ilike.%${searchTerm}%,barcode_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

      }

      

      // Apply status filter

      if (statusFilter !== 'all') {

        query = query.eq('status', statusFilter);

      }

      

      // Get total count with filters

      const { count } = await query;

      setTotalCount(count || 0);

      

      // Apply pagination and ordering

      const { data, error } = await query

        .order('customer_name', { ascending: true, nullsFirst: false })

        .range(page * rowsPerPage, (page + 1) * rowsPerPage - 1);



      if (error) throw error;

      

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

          console.log('📤 BOTTLE UPLOAD: Starting file processing...');

          const data = new Uint8Array(e.target.result);

          const workbook = XLSX.read(data, { type: 'array' });

          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          console.log('📊 BOTTLE UPLOAD: Parsed', jsonData.length, 'rows from Excel');



          // Get locations from the Locations page/table. Only values that match one of these count as a location.
          const { data: locations } = await supabase
            .from('locations')
            .select('name, id')
            .eq('organization_id', organization.id);

          // Build set of valid location values (name and id, normalized) for "is this a location?" checks
          const validLocationValues = new Set([
            ...(locations?.map(loc => (loc.name || '').toLowerCase().trim()).filter(Boolean) || []),
            ...(locations?.map(loc => (loc.id || '').toString().toLowerCase().trim()).filter(Boolean) || [])
          ]);
          const locationNames = locations?.map(loc => loc.name.toLowerCase()) || [];



          // Create customer map

          const customerMap = new Map();

          const { data: existingCustomers } = await supabase

            .from('customers')

            .select('"CustomerListID", name')

            .eq('organization_id', organization.id);



          if (existingCustomers) {

            existingCustomers.forEach(customer => {

              customerMap.set(customer.CustomerListID.toUpperCase(), customer.name);

            });

          }



          // Process bottles

          const bottlesToInsert = [];

          const customersToCreate = [];

          const processedCustomerIds = new Set();
          
          // Map to track generated IDs for customers without CustomerListID
          const customerNameToGeneratedId = new Map();

          // Helper function to find column value case-insensitively and with trimmed keys
          const getColumnValue = (row, possibleNames) => {
            const rowKeys = Object.keys(row);
            
            // First try exact match
            for (const name of possibleNames) {
              if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                const value = String(row[name]).trim();
                if (value) return value;
              }
            }
            
            // Try case-insensitive match with trimmed keys (Excel sometimes adds spaces)
            for (const possibleName of possibleNames) {
              const foundKey = rowKeys.find(key => {
                const trimmedKey = key.trim();
                return trimmedKey.toLowerCase() === possibleName.toLowerCase() || 
                       key.toLowerCase() === possibleName.toLowerCase();
              });
              if (foundKey) {
                const value = row[foundKey];
                if (value !== undefined && value !== null && value !== '') {
                  const trimmedValue = String(value).trim();
                  if (trimmedValue) return trimmedValue;
                }
              }
            }
            return '';
          };

          // Debug: Log available column names

          if (jsonData.length > 0) {

            console.log('📋 BOTTLE UPLOAD: Available Excel columns:', Object.keys(jsonData[0]));

            logger.log('Available Excel columns:', Object.keys(jsonData[0]));

            logger.log('Sample row data:', jsonData[0]);

            // Log specific columns we're looking for
            const sampleRow = jsonData[0];
            const columnCheck = {
              'Item': sampleRow['Item'],
              'item': sampleRow['item'],
              'Item Description': sampleRow['Item Description'],
              'item_description': sampleRow['item_description'],
              'Product Code': sampleRow['Product Code'],
              'product_code': sampleRow['product_code'],
              'Group': sampleRow['Group'],
              'group': sampleRow['group'],
              'Type': sampleRow['Type'],
              'type': sampleRow['type']
            };
            
            console.log('🔍 BOTTLE UPLOAD: Column check (direct access):', columnCheck);
            logger.log('Column check:', columnCheck);

            // Log what we actually find with the helper
            const foundValues = {
              product_code: getColumnValue(sampleRow, ['Item', 'item', 'Product Code', 'product_code', 'ProductCode', 'Product', 'product']),
              description: getColumnValue(sampleRow, ['Item Description', 'item_description', 'ItemDescription', 'Description', 'description', 'Desc', 'desc']),
              group: getColumnValue(sampleRow, ['Group', 'group', 'Group Name']),
              type: getColumnValue(sampleRow, ['Type', 'type'])
            };
            
            console.log('✅ BOTTLE UPLOAD: Found values (using helper):', foundValues);
            logger.log('Found values:', foundValues);

          }



          jsonData.forEach((row, rowIndex) => {

            // Only values that match a location from the Locations page count as a location.
            const branchValue = getColumnValue(row, ['Branch', 'branch']) || '';
            const branchNorm = branchValue.toLowerCase().trim();
            const isLocationName = validLocationValues.size > 0 && (
              validLocationValues.has(branchNorm) ||
              validLocationValues.has(branchNorm.replace(/\s+/g, '-')) ||
              validLocationValues.has(branchNorm.replace(/\s+/g, '_'))
            );
            
            // If Branch is a location name, use it as location only, not as customer
            // Otherwise, check Branch and other columns for customer information
            let customerName = null;
            if (!isLocationName) {
              // Branch is not a location, so it might be a customer name
              customerName = getColumnValue(row, ['Branch', 'branch', 'Customer', 'customer', 'customer_name', 'Customer Name']);
            } else {
              // Branch is a location, check other columns for customer
              customerName = getColumnValue(row, ['Customer', 'customer', 'customer_name', 'Customer Name']);
            }
            
            // Get location - prefer Location column, but if Branch is a location name, use that
            const locationColumn = getColumnValue(row, ['Location', 'location']) || '';
            let location = locationColumn || (isLocationName ? branchValue.toUpperCase() : '');

            // Only treat Location column as a location if it matches one of the locations from the Locations page.
            // If it doesn't match but contains "Name (ID)", it's a customer stored in the wrong column.
            const locColumnNorm = (locationColumn || '').toLowerCase().trim();
            const locationColumnIsValidLocation = validLocationValues.size > 0 && (
              validLocationValues.has(locColumnNorm) ||
              validLocationValues.has(locColumnNorm.replace(/\s+/g, '-')) ||
              validLocationValues.has(locColumnNorm.replace(/\s+/g, '_'))
            );
            if ((!customerName || !String(customerName).trim()) && locationColumn && !locationColumnIsValidLocation && /\([^)]+\)\s*$/.test(String(locationColumn))) {
              customerName = String(locationColumn).trim();
              location = ''; // It's a customer, not a location; clear it.
            }

            // Extract CustomerListID from customer name if it's in brackets: "Name (ID)"
            // Also check for separate CustomerListID column
            let customerId = String(row['CustomerListID'] || row['customer_list_id'] || '').trim().toUpperCase();
            
            // If no separate CustomerListID column, extract from customer name brackets
            if (!customerId && customerName) {
              // Remove "Header:" prefix if present (e.g., "Supreme Steel Header:Supreme Steel LP SK")
              customerName = customerName.replace(/^[^:]*Header:\s*/i, '').trim();
              
              const idMatch = customerName.match(/\(([^)]+)\)\s*$/);
              if (idMatch) {
                customerId = idMatch[1].trim().toUpperCase();
                // Clean the customer name by removing the ID in brackets
                customerName = customerName.replace(/\s*\([^)]+\)\s*$/, '').trim();
                logger.log(`Extracted CustomerListID "${customerId}" from customer name, cleaned name: "${customerName}"`);
              }
            }

            

            // Generate CustomerListID if still missing (required for database)
            if (customerName.trim() && !customerId) {
              // Check if we already generated an ID for this customer name
              const normalizedName = customerName.trim().toLowerCase();
              if (customerNameToGeneratedId.has(normalizedName)) {
                customerId = customerNameToGeneratedId.get(normalizedName);
              } else {
                // Generate a unique ID based on customer name and organization
                const nameHash = customerName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
                const timestamp = Date.now().toString(36).toUpperCase();
                const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                customerId = `AUTO-${nameHash}-${timestamp}-${randomSuffix}`;
                customerNameToGeneratedId.set(normalizedName, customerId);
                logger.log(`Generated CustomerListID for customer "${customerName}": ${customerId}`);
              }
            }

            

            // Collect unique customers (case-insensitive comparison)

            if (customerName.trim() && customerId && !processedCustomerIds.has(customerId)) {

              processedCustomerIds.add(customerId);

              

              // Check if customer already exists in database OR is already queued for creation

              const customerAlreadyExists = Array.from(customerMap.keys()).some(key => key.toUpperCase() === customerId);

              const customerAlreadyQueued = customersToCreate.some(c => c.CustomerListID.toUpperCase() === customerId);

              

              if (!customerAlreadyExists && !customerAlreadyQueued) {

                // Determine location from city or use default
                const city = (row['City'] || row['city'] || '').trim().toUpperCase();
                let location = 'SASKATOON'; // Default
                if (city.includes('REGINA')) location = 'REGINA';
                else if (city.includes('CHILLIWACK')) location = 'CHILLIWACK';
                else if (city.includes('PRINCE GEORGE') || city.includes('PRINCE_GEORGE')) location = 'PRINCE_GEORGE';
                else if (city.includes('SASKATOON')) location = 'SASKATOON';
                
                customersToCreate.push({

                  CustomerListID: customerId,

                  name: customerName.trim(),

                  location: location,

                  organization_id: organization.id

                });

              }

            }



            // Create bottle
            // Location is already determined above (from Location column or Branch if it's a location name)

            

            // Determine gas_type from Group, Gas Type, or description

            let gasType = row['Group'] || row['group'] || row['Gas Type'] || row['gas_type'] || row['GasType'] || row['Gas'] || '';

            // If no gas type from Group, try to extract from Item Description or Description
            if (!gasType) {
              const itemDesc = row['Item Description'] || row['item_description'] || row['Description'] || row['description'] || '';
              if (itemDesc) {
                const desc = itemDesc.toUpperCase();
                if (desc.includes('ARGON')) gasType = 'ARGON';
                else if (desc.includes('OXYGEN')) gasType = 'OXYGEN';
                else if (desc.includes('NITROGEN')) gasType = 'NITROGEN';
                else if (desc.includes('HELIUM')) gasType = 'HELIUM';
                else if (desc.includes('CO2')) gasType = 'CO2';
                else if (desc.includes('CHEMTANE')) gasType = 'CHEMTANE';
              }
            }



            const bottle = {

              barcode_number: String(row['Barcode'] || row['barcode_number'] || row['Barcode Number'] || '').trim(),

              serial_number: getColumnValue(row, ['Serial Number', 'serial_number', 'Serial', 'SerialNumber', 'SerialNum', 'serial_num', 'serial']),

              // IMPORTANT: Only assign customer if customer_name exists AND is not empty
              // Bottles at locations without customers should remain unassigned (in-house)
              assigned_customer: (customerName && customerName.trim() && Array.from(customerMap.keys()).some(key => key.toUpperCase() === customerId)) ? customerId : null,

              customer_name: customerName,

              // Store the customerId temporarily so we can use it after customer creation
              _customerId: customerId || null,

              location: location || '', // Use location determined above (from Location column or Branch if it's a location name)

              product_code: (() => {
                const value = getColumnValue(row, ['Item', 'item', 'Product Code', 'product_code', 'ProductCode', 'Product', 'product']);
                if (rowIndex === 0 && !value) {
                  console.warn('⚠️ BOTTLE UPLOAD: product_code is empty for first row. Available keys:', Object.keys(row));
                }
                return value;
              })(),

              description: (() => {
                const value = getColumnValue(row, ['Item Description', 'item_description', 'ItemDescription', 'Description', 'description', 'Desc', 'desc']);
                const productCode = getColumnValue(row, ['Item', 'item', 'Product Code', 'product_code', 'ProductCode', 'Product', 'product']);
                const desc = (value && String(value).trim()) ? value : (productCode && String(productCode).trim()) ? productCode : '';
                if (rowIndex === 0 && !desc) {
                  console.warn('⚠️ BOTTLE UPLOAD: description is empty for first row. Available keys:', Object.keys(row));
                }
                return desc;
              })(),

              gas_type: gasType,

              group_name: getColumnValue(row, ['Group', 'group', 'Group Name']),

              category: getColumnValue(row, ['Category', 'category']),

              type: getColumnValue(row, ['Type', 'type']),

              ownership: row['Ownership'] || row['ownership'] || '',

              days_at_location: row['Days At Location'] || row['days_at_location'] || row['DaysAtLocation'] ? parseInt(row['Days At Location'] || row['days_at_location'] || row['DaysAtLocation']) : null,

              // Determine status based on ownership and customer assignment
              status: (() => {
                const ownershipValue = String(row['Ownership'] || row['ownership'] || '').trim().toLowerCase();
                const hasCustomer = customerName && customerName.trim();
                
                // If ownership indicates customer-owned, set to available
                if (ownershipValue.includes('customer') || ownershipValue.includes('owned') || ownershipValue === 'customer owned') {
                  return 'available'; // Customer-owned bottles are available (not rented)
                }
                
                // If ownership indicates rental/rented, set to rented
                if (ownershipValue.includes('rental') || ownershipValue.includes('rented') || ownershipValue === 'rent') {
                  return 'rented';
                }
                
                // If bottle has a customer assigned and no specific ownership, default to rented
                if (hasCustomer) {
                  return 'rented';
                }
                
                // If no customer assigned, status is available
                return 'available';
              })(),

              organization_id: organization.id

            };



            bottlesToInsert.push(bottle);

          });



          // Create customers first

          if (customersToCreate.length > 0) {

            logger.log(`Creating ${customersToCreate.length} customers...`);

            logger.log('Customers to create:', customersToCreate.map(c => ({ CustomerListID: c.CustomerListID, name: c.name })));

            

            const { data: createdCustomers, error: customerError } = await supabase

              .from('customers')

              .upsert(customersToCreate, { 

                onConflict: 'CustomerListID',

                ignoreDuplicates: false 

              })

              .select('"CustomerListID", name');



            if (customerError) {

              logger.error('Customer creation error:', customerError);

              logger.error('Error details:', JSON.stringify(customerError, null, 2));

              
              
              // Handle duplicate key errors by querying existing customers

              if (customerError.code === '23505') {

                logger.log('Handling duplicate customers - querying existing ones...');

                

                // Query for existing customers that might have caused the duplicate error

                const existingCustomerIds = customersToCreate.map(c => c.CustomerListID);

                const { data: existingCustomers, error: queryError } = await supabase

                  .from('customers')

                  .select('"CustomerListID", name')

                  .in('"CustomerListID"', existingCustomerIds)

                  .eq('organization_id', organization.id);

                
                if (queryError) {
                  logger.error('Error querying existing customers:', queryError);
                }

                if (existingCustomers) {

                  existingCustomers.forEach(customer => {

                    customerMap.set(customer.CustomerListID.toUpperCase(), customer.name);

                  });

                  logger.log(`Added ${existingCustomers.length} existing customers to map`);

                }

              } else {

                // For other errors, still try to query existing customers by name as fallback

                logger.log('Attempting to find existing customers by name as fallback...');

                for (const customerToCreate of customersToCreate) {

                  const { data: existingByName } = await supabase

                    .from('customers')

                    .select('"CustomerListID", name')

                    .eq('name', customerToCreate.name)

                    .eq('organization_id', organization.id)

                    .limit(1)

                    .maybeSingle();

                  

                  if (existingByName) {

                    customerMap.set(existingByName.CustomerListID.toUpperCase(), existingByName.name);

                    logger.log(`Found existing customer by name: ${existingByName.name} (${existingByName.CustomerListID})`);

                  }

                }

              }

            } else {

              // Update customer map with newly created customers

              if (createdCustomers && createdCustomers.length > 0) {

                createdCustomers.forEach(customer => {

                  customerMap.set(customer.CustomerListID.toUpperCase(), customer.name);

                });

                logger.log(`Added ${createdCustomers.length} newly created customers to map`);

              } else {

                // If no data returned but no error, customers might have been upserted

                // Update map with what we tried to create

                customersToCreate.forEach(customer => {

                  customerMap.set(customer.CustomerListID.toUpperCase(), customer.name);

                });

                logger.log(`Added ${customersToCreate.length} customers to map (upsert completed)`);

              }

            }

          } else {

            logger.log('No customers to create');

          }



          // Now update bottles with correct assigned_customer values and set status appropriately
          bottlesToInsert.forEach((bottle) => {
            // Store the initial status (determined by ownership)
            const initialStatus = bottle.status;
            const ownershipValue = String(bottle.ownership || '').trim().toLowerCase();
            const isCustomerOwned = ownershipValue.includes('customer') || 
                                   ownershipValue.includes('owned') || 
                                   ownershipValue === 'customer owned';

            // IMPORTANT: Only assign bottles to customers if there's an explicit customer_name
            // Bottles at locations without customers should remain unassigned (in-house/available)
            if (bottle.customer_name && bottle.customer_name.trim()) {

              // Use the stored customerId from when we processed the row
              let customerId = bottle._customerId;
              
              // If we have a customerId, verify it exists in customerMap (after creation)
              if (customerId) {
                customerId = customerId.toUpperCase();
                // Check if customer exists in map (either existing or newly created)
                const customerExists = customerMap.has(customerId) || 
                  Array.from(customerMap.keys()).some(key => key.toUpperCase() === customerId);
                
                if (customerExists) {
                  bottle.assigned_customer = customerId;
                  // Set status: customer-owned bottles stay 'available', others become 'rented'
                  if (isCustomerOwned) {
                    bottle.status = 'available';
                  } else {
                    // Bottle assigned to customer and not customer-owned = rented
                    bottle.status = 'rented';
                  }
                } else {
                  // Customer was supposed to be created but isn't in map - try to find by name
                  customerId = Array.from(customerMap.keys()).find(id => 
                    customerMap.get(id).toLowerCase() === bottle.customer_name.trim().toLowerCase()
                  );
                  if (customerId) {
                    bottle.assigned_customer = customerId;
                    // Set status: customer-owned bottles stay 'available', others become 'rented'
                    if (isCustomerOwned) {
                      bottle.status = 'available';
                    } else {
                      bottle.status = 'rented';
                    }
                  } else {
                    bottle.status = 'available';
                    bottle.assigned_customer = null;
                    logger.log(`Warning: Customer "${bottle.customer_name}" with ID "${bottle._customerId}" not found after creation`);
                  }
                }
              } else {
                // No customerId stored, try to find by name
                customerId = Array.from(customerMap.keys()).find(id => 
                  customerMap.get(id).toLowerCase() === bottle.customer_name.trim().toLowerCase()
                );
                if (customerId) {
                  bottle.assigned_customer = customerId;
                  // Set status: customer-owned bottles stay 'available', others become 'rented'
                  if (isCustomerOwned) {
                    bottle.status = 'available';
                  } else {
                    bottle.status = 'rented';
                  }
                } else {
                  bottle.status = 'available';
                  bottle.assigned_customer = null;
                }
              }

            } else {

              // No customer name means this bottle should be available

              bottle.status = 'available';

              bottle.assigned_customer = null;

            }
            
            // Remove the temporary _customerId field before inserting
            delete bottle._customerId;

          });



          // Check for existing bottles to prevent duplicates (by barcode only)
          // Also check for duplicates WITHIN the upload batch itself

          const bottleBarcodes = bottlesToInsert.map(b => b.barcode_number != null ? String(b.barcode_number).trim() : '').filter(b => b !== '');

          logger.log(`Checking for duplicates by barcode only: ${bottleBarcodes.length} barcodes`);
          logger.log(`Total bottles to check: ${bottlesToInsert.length}`);

          let existingBottles = [];

          if (bottleBarcodes.length > 0) {
            // Get ALL existing bottles for this organization to check against (by barcode only)
            const { data: allExisting, error: existingError } = await supabase
              .from('bottles')
              .select('barcode_number, serial_number, id')
              .eq('organization_id', organization.id);
            
            if (existingError) {
              logger.error('Error fetching existing bottles:', existingError);
            }
            
            existingBottles = allExisting || [];
            logger.log(`Found ${existingBottles.length} total existing bottles in database for organization ${organization.id}`);
            
            if (existingBottles.length > 0) {
              logger.log('Sample existing bottles:', existingBottles.slice(0, 5).map(b => ({
                id: b.id,
                barcode: b.barcode_number,
                serial: b.serial_number
              })));
            }
          }

          // Track barcodes we've seen in THIS upload batch to catch duplicates within the file
          // Only check barcodes for duplicates, not serial numbers
          const seenBarcodesInBatch = new Set();
          
          // Filter out bottles that already exist (check by barcode only)
          // Also filter out duplicates WITHIN the upload batch
          const newBottles = [];
          const duplicates = [];

          // Helper function to check if a value is a valid identifier (not empty, not "Not Set", etc.)
          const isValidIdentifier = (value) => {
            if (!value || typeof value !== 'string') return false;
            const trimmed = value.trim().toLowerCase();
            // Ignore placeholder values
            return trimmed !== '' && 
                   trimmed !== 'not set' && 
                   trimmed !== 'n/a' && 
                   trimmed !== 'na' &&
                   trimmed !== 'none' &&
                   trimmed !== 'null' &&
                   trimmed !== 'undefined';
          };

          bottlesToInsert.forEach((bottle, index) => {
            // Normalize barcode to string (CSV may give number) for consistent duplicate check
            const barcode = bottle.barcode_number != null ? String(bottle.barcode_number).trim() : '';
            const serial = bottle.serial_number != null ? String(bottle.serial_number).trim() : (bottle.serial_number?.trim?.() ?? '');
            
            // Only check for duplicates if we have a VALID barcode (not placeholder values)
            // Rows without valid barcode are still allowed – they're inserted (avoids blocking uploads when column name differs)
            const hasValidBarcode = isValidIdentifier(barcode);
            
            if (!hasValidBarcode) {
              newBottles.push(bottle);
              logger.log(`Allowing bottle without valid barcode (row ${index + 1}): Barcode="${barcode || 'N/A'}", Serial="${serial || 'N/A'}"`);
              return;
            }
            
            // First check: Is this a duplicate WITHIN the upload batch? (by barcode only, normalized)
            const isDuplicateInBatch = seenBarcodesInBatch.has(barcode);
            
            if (isDuplicateInBatch) {
              duplicates.push({
                barcode: barcode || 'N/A',
                serial: serial || 'N/A',
                reason: 'barcode (duplicate in file)',
                row: index + 1
              });
              logger.log(`Skipping duplicate bottle in upload file (row ${index + 1}): Barcode=${barcode}, Serial=${serial || 'N/A'} (barcode "${barcode}" already seen in this file)`);
              return; // Skip this bottle
            }
            
            // Second check: Does this bottle already exist in the database? (by barcode only, normalized string)
            const hasExistingBarcode = existingBottles.some(existing => {
              const existingBarcode = existing.barcode_number != null ? String(existing.barcode_number).trim() : '';
              return existingBarcode && isValidIdentifier(existingBarcode) && existingBarcode === barcode;
            });
            
            if (hasExistingBarcode) {
              duplicates.push({
                barcode: barcode || 'N/A',
                serial: serial || 'N/A',
                reason: 'barcode (exists in database)',
                row: index + 1
              });
              logger.log(`Skipping duplicate bottle: Barcode=${barcode}, Serial=${serial || 'N/A'} (barcode "${barcode}" already exists in database)`);
            } else {
              // This is a new bottle - add it and track its barcode (only valid barcodes)
              newBottles.push(bottle);
              seenBarcodesInBatch.add(barcode);
            }
          });

          

          logger.log(`Found ${duplicates.length} duplicates, inserting ${newBottles.length} new bottles`);



          // Insert only new bottles

          if (newBottles.length > 0) {

            const batchSize = 100;

            for (let i = 0; i < newBottles.length; i += batchSize) {

              const batch = newBottles.slice(i, i + batchSize);

              const { error } = await supabase

                .from('bottles')

                .insert(batch);



              if (error) {

                logger.error('Error inserting batch:', error);

                throw error;

              }

            }

          }



          // Show proper success message with duplicate info

          let message = `${newBottles.length} bottles uploaded successfully!`;

          if (duplicates.length > 0) {

            message += ` (${duplicates.length} duplicates skipped)`;

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

          status: editingBottle.status,

          updated_at: new Date().toISOString()

        })

        .eq('id', editingBottle.id)

        .eq('organization_id', organization?.id);



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

    navigate(`/bottle/${bottle.id}`);

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

            let customerName = row['Customer'] || row['customer_name'] || '';

            // Extract CustomerListID from customer name if it's in brackets: "Name (ID)"
            // Also check for separate CustomerListID column
            let customerId = String(row['CustomerListID'] || row['customer_list_id'] || '').trim();
            
            // If no separate CustomerListID column, extract from customer name brackets
            if (!customerId && customerName) {
              const idMatch = customerName.match(/\(([^)]+)\)\s*$/);
              if (idMatch) {
                customerId = idMatch[1].trim();
                // Clean the customer name by removing the ID in brackets
                customerName = customerName.replace(/\s*\([^)]+\)\s*$/, '').trim();
              }
            }

            if (customerName.trim() && customerId) {

              customerMap.set(customerName.trim(), customerId.toUpperCase());

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

                .update({ assigned_customer: customer.CustomerListID })

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

            onChange={(e) => setStatusFilter(e.target.value)}

          >

            <MenuItem value="all">All</MenuItem>

            <MenuItem value="available">Available</MenuItem>

            <MenuItem value="rented">Rented</MenuItem>

          </Select>

        </FormControl>

      </Box>



      {/* Responsive Table */}

      <ResponsiveTable

        columns={[

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