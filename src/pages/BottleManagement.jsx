import React, { useState, useEffect, useRef } from 'react';
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
  Snackbar,
  Alert,
  Dialog
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { supabase, supabaseWithRetry } from '../../supabase';
import * as XLSX from 'xlsx';

const statusOptions = ['All', 'Available', 'In Use', 'Maintenance'];
const rowsPerPageOptions = [10, 25, 50, 100];

export default function BottleManagement() {
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking'); // 'online', 'offline', 'checking'
  const fileInputRef = useRef();

  // Simulate total/filtered count
  const totalBottles = bottles.length;
  const filteredBottles = bottles.filter(bottle => 
    (bottle.bottleId || '').toLowerCase().includes(search.toLowerCase()) ||
    (bottle.barcode || '').toLowerCase().includes(search.toLowerCase()) ||
    (bottle.serial || '').toLowerCase().includes(search.toLowerCase())
  ).length;

  useEffect(() => {
    setLoading(true);
    supabase
      .from('cylinders')
      .select('*')
      .not('assigned_customer', 'is', null)
      .then(({ data, error }) => {
        if (error) {
          setSnackbarMsg('Failed to load bottles: ' + error.message);
          setSnackbarOpen(true);
          setBottles([]);
        } else {
          setBottles(data || []);
        }
        setLoading(false);
      });
  }, []);

  const handleSearch = (e) => setSearch(e.target.value);
  const handleStatus = (e) => setStatus(e.target.value);
  const handleRowsPerPage = (e) => setRowsPerPage(Number(e.target.value));

  // Filtering (simulate)
  const filtered = bottles.filter(
    (b) =>
      (status === 'All' || b.status === status) &&
      ((b.serial || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.barcode || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.bottleId || '').toLowerCase().includes(search.toLowerCase()))
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

  // Test function to check Supabase permissions
  const testSupabasePermissions = async () => {
    console.log('Testing Supabase permissions...');
    
    try {
      // Test 1: Can we read from rentals table?
      console.log('Testing rentals table read access...');
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('*')
        .limit(1);
      
      if (rentalsError) {
        console.error('Cannot read from rentals table:', rentalsError);
        return false;
      }
      console.log('Can read from rentals table:', rentalsData?.length || 0, 'records');
      
      // Test 2: Can we read from cylinders table?
      console.log('Testing cylinders table read access...');
      const { data: cylindersData, error: cylindersError } = await supabase
        .from('cylinders')
        .select('*')
        .limit(1);
      
      if (cylindersError) {
        console.error('Cannot read from cylinders table:', cylindersError);
        return false;
      }
      console.log('Can read from cylinders table:', cylindersData?.length || 0, 'records');
      
      // Test 3: Can we perform a simple delete operation?
      console.log('Testing delete permissions...');
      try {
        const { error: deleteTestError } = await supabase
          .from('rentals')
          .delete()
          .eq('id', 'test-id-that-does-not-exist');
        
        // This should fail with a "not found" error, which is expected
        console.log('Delete test completed (expected to fail for non-existent record)');
      } catch (deleteTestError) {
        console.log('Delete test error (expected):', deleteTestError);
      }
      
      return true;
    } catch (error) {
      console.error('Permission test failed:', error);
      return false;
    }
  };

  // Comprehensive test function for debugging delete operations
  const testDeleteOperation = async () => {
    console.log('=== Starting comprehensive delete operation test ===');
    
    try {
      // Test 1: Check if we can connect to Supabase
      console.log('1. Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('cylinders')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('Connection test failed:', testError);
        return { success: false, error: `Connection failed: ${testError.message}` };
      }
      console.log('✓ Connection test passed');
      
      // Test 2: Check if we have any rentals to delete
      console.log('2. Checking for existing rentals...');
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('id, cylinder_id')
        .limit(5);
      
      if (rentalsError) {
        console.error('Rentals query failed:', rentalsError);
        return { success: false, error: `Rentals query failed: ${rentalsError.message}` };
      }
      
      console.log(`✓ Found ${rentalsData?.length || 0} rentals`);
      
      if (!rentalsData || rentalsData.length === 0) {
        console.log('No rentals found to delete');
        return { success: true, message: 'No rentals found to delete' };
      }
      
      // Test 3: Try to delete a single rental
      console.log('3. Testing single rental delete...');
      const testRentalId = rentalsData[0].id;
      const { error: singleDeleteError } = await supabase
        .from('rentals')
        .delete()
        .eq('id', testRentalId);
      
      if (singleDeleteError) {
        console.error('Single rental delete failed:', singleDeleteError);
        return { success: false, error: `Single delete failed: ${singleDeleteError.message}` };
      }
      console.log('✓ Single rental delete successful');
      
      // Test 4: Try direct fetch delete
      console.log('4. Testing direct fetch delete...');
      try {
        const response = await fetch(`https://jtfucttzaswmqqhmmhfb.supabase.co/rest/v1/rentals?id=eq.${testRentalId}`, {
          method: 'DELETE',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        });
        
        console.log('Direct fetch response:', response.status, response.statusText);
        if (response.ok) {
          console.log('✓ Direct fetch delete successful');
        } else {
          const errorText = await response.text();
          console.error('Direct fetch delete failed:', errorText);
        }
      } catch (fetchError) {
        console.error('Direct fetch delete error:', fetchError);
      }
      
      return { success: true, message: 'All tests completed' };
      
    } catch (error) {
      console.error('Test failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete All Bottles
  const handleDeleteAll = async () => {
    setLoadingDelete(true);
    try {
      console.log('Starting delete process...');
      
      // Test permissions first
      const hasPermissions = await testSupabasePermissions();
      if (!hasPermissions) {
        throw new Error('Supabase permissions test failed. Check your database configuration.');
      }
      
      // Test basic network connectivity first
      console.log('Testing network connectivity...');
      try {
        const response = await fetch('https://jtfucttzaswmqqhmmhfb.supabase.co/rest/v1/', {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg'
          }
        });
        console.log('Network test response:', response.status, response.statusText);
      } catch (networkError) {
        console.error('Network connectivity test failed:', networkError);
        throw new Error(`Network connectivity failed: ${networkError.message}`);
      }
      
      // First check if we can connect to Supabase
      console.log('Testing Supabase connection...');
      const { data: testConnection, error: connectionError } = await supabase
        .from('cylinders')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        console.error('Connection test failed:', connectionError);
        throw new Error(`Connection failed: ${connectionError.message}`);
      }
      
      console.log('Connection test successful');
      
      // Get all bottle IDs
      console.log('Fetching all bottle IDs...');
      const { data: allBottles, error: fetchError } = await supabase
        .from('cylinders')
        .select('id');
      
      if (fetchError) {
        console.error('Fetch bottles failed:', fetchError);
        throw new Error(`Failed to fetch bottles: ${fetchError.message}`);
      }
      
      if (!allBottles || allBottles.length === 0) {
        setLoadingDelete(false);
        setDeleteDialogOpen(false);
        setSnackbarMsg('No bottles found to delete.');
        setSnackbarOpen(true);
        return;
      }
      
      const bottleIds = allBottles.map(bottle => bottle.id);
      console.log(`Found ${bottleIds.length} bottles to delete`);
      
      // Helper function to process arrays in batches
      const processInBatches = async (items, batchSize, processFunction) => {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)`);
          const result = await processFunction(batch);
          results.push(result);
          
          // Add a small delay between batches to prevent overwhelming the server
          if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        return results;
      };
      
      // Step 1: Delete all related rentals first (to handle foreign key constraint)
      console.log('Deleting all related rentals first...');
      
      const deleteRentalsBatch = async (bottleIdsBatch) => {
        try {
          // Try direct fetch first
          console.log(`Attempting direct fetch delete for ${bottleIdsBatch.length} rentals...`);
          const response = await fetch(`https://jtfucttzaswmqqhmmhfb.supabase.co/rest/v1/rentals?cylinder_id=in.(${bottleIdsBatch.join(',')})`, {
            method: 'DELETE',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg',
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            }
          });
          
          if (response.ok) {
            console.log(`✓ Direct fetch delete for ${bottleIdsBatch.length} rentals successful`);
            return { success: true, method: 'direct' };
          } else {
            console.error(`Direct fetch delete for ${bottleIdsBatch.length} rentals failed:`, response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            
            // Fallback to Supabase client
            console.log(`Trying Supabase client for ${bottleIdsBatch.length} rentals...`);
            const { error: rentalsDeleteError } = await supabase
              .from('rentals')
              .delete()
              .in('cylinder_id', bottleIdsBatch);
            
            if (rentalsDeleteError) {
              console.error('Supabase client delete failed:', rentalsDeleteError);
              throw new Error(`Failed to delete rentals: ${rentalsDeleteError.message}`);
            }
            
            console.log(`✓ Supabase client delete for ${bottleIdsBatch.length} rentals successful`);
            return { success: true, method: 'supabase' };
          }
        } catch (error) {
          console.error(`Batch delete failed for ${bottleIdsBatch.length} rentals:`, error);
          throw error;
        }
      };
      
      // Process rentals deletion in batches of 50
      const rentalDeleteResults = await processInBatches(bottleIds, 50, deleteRentalsBatch);
      console.log('All rental batches processed:', rentalDeleteResults.length, 'batches');
      
      // Check if all rental batches were successful
      const failedRentalBatches = rentalDeleteResults.filter(result => !result.success);
      if (failedRentalBatches.length > 0) {
        throw new Error(`Failed to delete ${failedRentalBatches.length} rental batches`);
      }
      
      console.log('All related rentals deleted successfully');
      
      // Step 2: Now delete all cylinders
      console.log('Deleting all cylinders...');
      
      const deleteCylindersBatch = async (bottleIdsBatch) => {
        try {
          // Try direct fetch first
          console.log(`Attempting direct fetch delete for ${bottleIdsBatch.length} cylinders...`);
          const response = await fetch(`https://jtfucttzaswmqqhmmhfb.supabase.co/rest/v1/cylinders?id=in.(${bottleIdsBatch.join(',')})`, {
            method: 'DELETE',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg',
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            }
          });
          
          if (response.ok) {
            console.log(`✓ Direct fetch delete for ${bottleIdsBatch.length} cylinders successful`);
            return { success: true, method: 'direct' };
          } else {
            console.error(`Direct fetch delete for ${bottleIdsBatch.length} cylinders failed:`, response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            
            // Fallback to Supabase client
            console.log(`Trying Supabase client for ${bottleIdsBatch.length} cylinders...`);
            const { error: cylindersDeleteError } = await supabase
              .from('cylinders')
              .delete()
              .in('id', bottleIdsBatch);
            
            if (cylindersDeleteError) {
              console.error('Supabase client delete failed:', cylindersDeleteError);
              throw new Error(`Failed to delete cylinders: ${cylindersDeleteError.message}`);
            }
            
            console.log(`✓ Supabase client delete for ${bottleIdsBatch.length} cylinders successful`);
            return { success: true, method: 'supabase' };
          }
        } catch (error) {
          console.error(`Batch delete failed for ${bottleIdsBatch.length} cylinders:`, error);
          throw error;
        }
      };
      
      // Process cylinders deletion in batches of 50
      const cylinderDeleteResults = await processInBatches(bottleIds, 50, deleteCylindersBatch);
      console.log('All cylinder batches processed:', cylinderDeleteResults.length, 'batches');
      
      // Check if all cylinder batches were successful
      const failedCylinderBatches = cylinderDeleteResults.filter(result => !result.success);
      if (failedCylinderBatches.length > 0) {
        throw new Error(`Failed to delete ${failedCylinderBatches.length} cylinder batches`);
      }
      
      console.log('All cylinders deleted successfully');
      
      setLoadingDelete(false);
      setDeleteDialogOpen(false);
      setBottles([]);
      setSnackbarMsg(`Successfully deleted ${bottleIds.length} bottles and their related rentals!`);
      setSnackbarOpen(true);
      
    } catch (error) {
      setLoadingDelete(false);
      setDeleteDialogOpen(false);
      console.error('Delete error:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be busy. Please try again.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please check your database permissions.';
      }
      
      setSnackbarMsg(`Error: ${errorMessage}`);
      setSnackbarOpen(true);
    }
  };

  // Bulk Assign from File
  const handleBulkAssign = async (file) => {
    setLoadingBulk(true);
    setSnackbarMsg('');
    setSnackbarOpen(false);
    
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let data = [];
      
      if (ext === 'csv' || ext === 'txt') {
        // Handle CSV files
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = evt => resolve(evt.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        
        const lines = text.split('\n').filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim());
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Handle Excel files
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = evt => resolve(evt.target.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
        
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (data.length > 0) {
          const headers = data[0];
          data = data.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
        }
      } else {
        throw new Error('Unsupported file type. Please use CSV, XLS, or XLSX files.');
      }
      
      console.log('Parsed data:', data);
      
      // Validate required columns
      const requiredColumns = ['bottle_id', 'location'];
      const firstRow = data[0] || {};
      const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Expected columns: ${requiredColumns.join(', ')}`);
      }
      
      // Process the data
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Validate data
          if (!row.bottle_id || !row.location) {
            errors.push(`Row ${i + 1}: Missing bottle_id or location`);
            errorCount++;
            continue;
          }
          
          // Check if bottle exists
          const { data: bottleData, error: bottleError } = await supabase
            .from('cylinders')
            .select('id')
            .eq('id', row.bottle_id)
            .single();
          
          if (bottleError || !bottleData) {
            errors.push(`Row ${i + 1}: Bottle with ID ${row.bottle_id} not found`);
            errorCount++;
            continue;
          }
          
          // Validate location
          const validLocations = ['SASKATOON', 'REGINA', 'CHILLIWACK', 'PRINCE_GEORGE'];
          if (!validLocations.includes(row.location.toUpperCase())) {
            errors.push(`Row ${i + 1}: Invalid location ${row.location}. Must be one of: ${validLocations.join(', ')}`);
            errorCount++;
            continue;
          }
          
          // If customer_id is provided, validate customer exists
          if (row.customer_id) {
            let customerData, customerError;
            try {
              const res = await supabase
                .from('customers')
                .select('CustomerListID')
                .eq('CustomerListID', row.customer_id)
                .single();
              customerData = res.data;
              customerError = res.error;
            } catch (e) {
              customerError = e;
            }
            if (customerError || !customerData) {
              // Try to create the customer
              const insertRes = await supabase
                .from('customers')
                .insert({ CustomerListID: row.customer_id, name: row.customer_name || row.customer_id })
                .select('CustomerListID')
                .single();
              if (insertRes.error) {
                errors.push(`Row ${i + 1}: Customer with ID ${row.customer_id} not found and could not be created: ${insertRes.error.message}`);
                errorCount++;
                continue;
              }
            }
          }
          
          // Update bottle assignment
          const updateData = {
            location: row.location.toUpperCase(),
            rental_start_date: row.rental_start_date || new Date().toISOString().split('T')[0]
          };
          
          // If customer_id is provided, assign to customer
          if (row.customer_id) {
            updateData.assigned_customer = row.customer_id;
          }
          
          const { error: updateError } = await supabase
            .from('cylinders')
            .update(updateData)
            .eq('id', row.bottle_id);
          
          if (updateError) {
            errors.push(`Row ${i + 1}: Failed to update bottle - ${updateError.message}`);
            errorCount++;
            continue;
          }
          
          // Create rental record for location-assigned bottles (these are "at home" but tracked)
          if (!row.customer_id) {
            const { error: rentalError } = await supabase
              .from('rentals')
              .insert({
                cylinder_id: row.bottle_id,
                customer_id: null, // No customer assigned
                rental_start_date: row.rental_start_date || new Date().toISOString().split('T')[0],
                rental_type: 'Monthly',
                rental_amount: 0, // No rental fee for location-assigned bottles
                location: row.location.toUpperCase(),
                status: 'at_home'
              });
            
            if (rentalError) {
              console.warn(`Row ${i + 1}: Could not create rental record - ${rentalError.message}`);
              // Don't count this as an error since the bottle was successfully assigned
            }
          }
          
          successCount++;
          
        } catch (rowError) {
          errors.push(`Row ${i + 1}: ${rowError.message}`);
          errorCount++;
        }
      }
      
      // Refresh the bottles list
      const { data: updatedBottles } = await supabase
        .from('cylinders')
        .select('*, assigned_customer (CustomerListID, name, customer_number)')
        .order('serial_number');
      
      if (updatedBottles) {
        setBottles(updatedBottles);
      }
      
      // Show results
      let message = `Bulk assign completed! Successfully assigned: ${successCount} bottles`;
      if (errorCount > 0) {
        message += `, Errors: ${errorCount}`;
        console.error('Bulk assign errors:', errors);
      }
      
      setSnackbarMsg(message);
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Bulk assign error:', error);
      setSnackbarMsg(`Bulk assign error: ${error.message}`);
      setSnackbarOpen(true);
    } finally {
      setLoadingBulk(false);
    }
  };

  // Network status check
  const checkNetworkStatus = async () => {
    try {
      setNetworkStatus('checking');
      const response = await fetch('https://jtfucttzaswmqqhmmhfb.supabase.co/rest/v1/', {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg'
        }
      });
      if (response.ok) {
        setNetworkStatus('online');
      } else {
        setNetworkStatus('offline');
      }
    } catch (error) {
      console.error('Network check failed:', error);
      setNetworkStatus('offline');
    }
  };

  // Check network status on component mount and periodically
  useEffect(() => {
    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Bottle Management</Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: networkStatus === 'online' ? '#4caf50' : 
                                  networkStatus === 'offline' ? '#f44336' : '#ff9800',
                  animation: networkStatus === 'checking' ? 'pulse 1.5s infinite' : 'none'
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {networkStatus === 'online' ? 'Connected' : 
                 networkStatus === 'offline' ? 'Offline' : 'Checking...'}
              </Typography>
            </Box>
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
            disabled={loadingBulk}
          >
            {loadingBulk ? 'Processing...' : 'Bulk Assign from File'}
          </Button>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files[0]) {
                handleBulkAssign(e.target.files[0]);
              }
              e.target.value = '';
            }}
          />
          <Button
            variant="contained"
            sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3, background: '#e53935', ':hover': { background: '#b71c1c' } }}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loadingDelete || networkStatus === 'offline'}
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
      </Paper>
    </Box>
  );
} 