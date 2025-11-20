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



          // Debug: Log available column names

          if (jsonData.length > 0) {

            logger.log('Available Excel columns:', Object.keys(jsonData[0]));

            logger.log('Sample row data:', jsonData[0]);

          }



          jsonData.forEach(row => {

            const customerName = row['Customer'] || row['customer_name'] || '';

            const customerId = String(row['CustomerListID'] || row['customer_list_id'] || '').trim().toUpperCase();

            

            // Collect unique customers (case-insensitive comparison)

            if (customerName.trim() && customerId && !processedCustomerIds.has(customerId)) {

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



            const bottle = {

              barcode_number: String(row['Barcode'] || row['barcode_number'] || row['Barcode Number'] || '').trim(),

              serial_number: (row['Serial Number'] || row['serial_number'] || row['Serial'] || row['SerialNumber'] || '').toString().trim(),

              assigned_customer: Array.from(customerMap.keys()).some(key => key.toUpperCase() === customerId) ? customerId : null,

              customer_name: customerName,

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

                  .select('"CustomerListID", name')

                  .in('"CustomerListID"', existingCustomerIds)

                  .eq('organization_id', organization.id);

                

                if (existingCustomers) {

                  existingCustomers.forEach(customer => {

                    customerMap.set(customer.CustomerListID, customer.name);

                  });

                  logger.log(`Added ${existingCustomers.length} existing customers to map`);

                }

              }

            } else {

              // Update customer map with newly created customers

              customersToCreate.forEach(customer => {

                customerMap.set(customer.CustomerListID, customer.name);

              });

              logger.log(`Added ${customersToCreate.length} new customers to map`);

            }

          }



          // Now update bottles with correct assigned_customer values

          bottlesToInsert.forEach(bottle => {

            if (bottle.customer_name && bottle.customer_name.trim()) {

              // Find the customer ID for this bottle by matching customer name (case-insensitive)

              const customerId = Array.from(customerMap.keys()).find(id => 

                customerMap.get(id).toLowerCase() === bottle.customer_name.trim().toLowerCase()

              );

              if (customerId) {

                bottle.assigned_customer = customerId;

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

          });



          // Check for existing bottles to prevent duplicates

          const bottleBarcodes = bottlesToInsert.map(b => b.barcode_number).filter(b => b && b.trim() !== '');

          const bottleSerials = bottlesToInsert.map(b => b.serial_number).filter(s => s && s.trim() !== '');

          

          logger.log(`Checking for duplicates: ${bottleBarcodes.length} barcodes, ${bottleSerials.length} serials`);

          

          let existingBottles = [];

          if (bottleBarcodes.length > 0 || bottleSerials.length > 0) {

            // Get ALL existing bottles for this organization to check against

            const { data: allExisting } = await supabase

              .from('bottles')

              .select('barcode_number, serial_number, id')

              .eq('organization_id', organization.id);

            

            existingBottles = allExisting || [];

            logger.log(`Found ${existingBottles.length} total existing bottles in database`);

          }

          

          // Filter out bottles that already exist (check by barcode first, then serial)

          const newBottles = [];

          const duplicates = [];

          

          bottlesToInsert.forEach(bottle => {

            const barcode = bottle.barcode_number?.trim();

            const serial = bottle.serial_number?.trim();

            

            // Check for existing bottle by barcode

            const hasExistingBarcode = barcode && existingBottles.some(existing => 

              existing.barcode_number?.trim() === barcode

            );

            

            // Check for existing bottle by serial

            const hasExistingSerial = serial && existingBottles.some(existing => 

              existing.serial_number?.trim() === serial

            );

            

            if (hasExistingBarcode || hasExistingSerial) {

              duplicates.push({

                barcode: barcode || 'N/A',

                serial: serial || 'N/A',

                reason: hasExistingBarcode ? 'barcode' : 'serial'

              });

              logger.log(`Skipping duplicate bottle: ${barcode || serial} (${hasExistingBarcode ? 'barcode' : 'serial'} match)`);

            } else {

              newBottles.push(bottle);

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