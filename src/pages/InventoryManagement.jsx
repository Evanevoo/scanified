import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import UpdateIcon from '@mui/icons-material/Update';
import BuildIcon from '@mui/icons-material/Build';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';
import { cylinderLimitService } from '../services/cylinderLimitService';
import CylinderLimitDialog from '../components/CylinderLimitDialog';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { useDebounce, useOptimizedFetch, useOptimisticUpdate, usePagination } from '../utils/performance';
import { TableSkeleton, LoadingOverlay, FadeIn, SmoothButton } from '../components/SmoothLoading';

export default function InventoryManagement() {
  console.log('=== INVENTORY MANAGEMENT COMPONENT RENDERING ===');
  
  const { profile: userProfile, organization } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();
  
  // Dynamic columns based on organization asset type
  const columns = useMemo(() => [
    { label: 'Barcode', key: 'barcode_number' },
    { label: 'Serial Number', key: 'serial_number' },
    { label: 'Customer ID', key: 'assigned_customer' },
    { label: 'Customer Name', key: 'customer_name' },
    { label: 'Product Code', key: 'product_code' },
    { label: 'Description', key: 'description' },
    { label: 'Days At Location', key: 'days_at_location' },
  ], []);
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [selected, setSelected] = useState([]);
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [deleteSelectedDialog, setDeleteSelectedDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Add debounced search
  const [filteredBottles, setFilteredBottles] = useState([]);
  const [locationFilter, setLocationFilter] = useState('All');
  const [editDialog, setEditDialog] = useState({ open: false, bottle: null });
  const [addDialog, setAddDialog] = useState({ open: false });
  const [newBottle, setNewBottle] = useState({
    barcode_number: '',
    serial_number: '',
    assigned_customer: '',
    customer_name: '',
    product_code: '',
    description: '',
    owner_id: '',
    owner_name: ''
  });
  const [editBottle, setEditBottle] = useState({});
  const [updatingDays, setUpdatingDays] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [limitDialog, setLimitDialog] = useState({ 
    open: false, 
    limitCheck: null, 
    message: null, 
    upgradeSuggestion: null,
    onProceed: null,
    proceedText: "Continue"
  });

  console.log('InventoryManagement state initialized');

  useEffect(() => {
    console.log('=== LOADING USER PROFILE AND ORGANIZATION ===');
    
    if (userProfile && userProfile.organization_id) {
      fetchOrganization();
      fetchBottles();
      fetchOwners();
      setDefaultLocations(); // Set default locations for bottles without location
    }
  }, [userProfile]);

  useEffect(() => {
    const filtered = bottles.filter(bottle => {
      // Text search filter
      const matchesSearch = 
        bottle.barcode_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bottle.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bottle.assigned_customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bottle.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bottle.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bottle.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Location filter - handle case sensitivity and null values
      let matchesLocation = true;
      if (locationFilter !== 'All') {
        const bottleLocation = bottle.location?.toUpperCase() || '';
        const filterLocation = locationFilter.toUpperCase();
        matchesLocation = bottleLocation === filterLocation;
      }
      
      return matchesSearch && matchesLocation;
    });
    setFilteredBottles(filtered);
    
    // Debug: Log location values for troubleshooting
    if (locationFilter !== 'All') {
      const uniqueLocations = [...new Set(bottles.map(b => b.location))];
      console.log('Available bottle locations:', uniqueLocations);
      console.log('Filtering by:', locationFilter);
      console.log('Filtered count:', filtered.length);
    }
  }, [bottles, searchTerm, locationFilter]);

  useEffect(() => {
    handleUpdateDaysAtLocation();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from('locations').select('name');
      if (!error && data) setLocations(data.map(loc => loc.name.toLowerCase()));
    };
    fetchLocations();
  }, []);

  const fetchOrganization = async () => {
    if (!userProfile?.organization_id) {
      console.log('NO ORG ERROR: userProfile is', userProfile);
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to your account. Please contact your administrator.', 
        severity: 'warning' 
      });
      return;
    }
    
    try {
      const { data: org, error } = await supabase
        .from('organizations')
        .select('name, slug')
        .eq('id', userProfile.organization_id)
        .single();
      
      if (error) throw error;
      
      // setOrganization(org);
    } catch (error) {
      console.error('Error fetching organization:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load organization details: ' + error.message, 
        severity: 'error' 
      });
    }
  };

  const fetchBottles = async () => {
    if (!userProfile?.organization_id) {
      console.log('NO ORG ERROR: userProfile is', userProfile);
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to your account. Please contact your administrator.', 
        severity: 'warning' 
      });
      setLoading(false);
      setBottles([]);
      return;
    }

    setLoading(true);
    try {
      // RLS will automatically filter by organization_id
      const { data, error } = await supabase
        .from('bottles')
        .select('*')
        .order('barcode_number');
      
      if (error) throw error;
      const realBottles = data.filter(b =>
        (b.barcode_number && b.barcode_number !== '') ||
        (b.serial_number && b.serial_number !== '')
      );
      setBottles(realBottles);
    } catch (error) {
      console.error('Error fetching bottles:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load bottles: ' + error.message, 
        severity: 'error' 
      });
      setBottles([]);
    } finally {
      setLoading(false);
      setSelected([]);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(filteredBottles.map(bottle => bottle.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleDeleteAll = async () => {
    if (!userProfile?.organization_id) {
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to user', 
        severity: 'error' 
      });
      return;
    }

    console.log('userProfile at delete:', userProfile);

    setDeleting(true);
    try {
      console.log('=== DELETING ALL BOTTLES AND RENTALS ===');
      
      // First, delete all rental records for this organization's bottles
      const { error: rentalDeleteError } = await supabase
        .from('rentals')
        .delete()
        .in('bottle_id', 
          supabase
            .from('bottles')
            .select('id')
            .eq('organization_id', userProfile.organization_id)
        );
      
      if (rentalDeleteError) {
        console.error('Error deleting rental records:', rentalDeleteError);
        throw rentalDeleteError;
      }
      
      console.log('Rental records deleted successfully');
      
      // Then delete all bottles
      const { error } = await supabase
        .from('bottles')
        .delete()
        .eq('organization_id', userProfile.organization_id);
      
      if (error) {
        console.error('Error deleting bottles:', error);
        throw error;
      }
      
      console.log('Bottles deleted successfully');
      
      setSnackbar({ 
        open: true, 
        message: 'All bottles and rental records deleted successfully', 
        severity: 'success' 
      });
      
      setSelected([]);
      fetchBottles();
    } catch (error) {
      console.error('Error deleting all bottles:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to delete all bottles: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setDeleting(false);
      setDeleteAllDialog(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!userProfile?.organization_id) {
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to user', 
        severity: 'error' 
      });
      return;
    }

    console.log('userProfile at deleteSelected:', userProfile);

    setDeleting(true);
    try {
      console.log('=== DELETING SELECTED BOTTLES AND RENTALS ===');
      
      // First, delete rental records for selected bottles
      const { error: rentalDeleteError } = await supabase
        .from('rentals')
        .delete()
        .in('bottle_id', selected);
      
      if (rentalDeleteError) {
        console.error('Error deleting rental records:', rentalDeleteError);
        throw rentalDeleteError;
      }
      
      console.log('Rental records for selected bottles deleted successfully');
      
      // Then delete the selected bottles
      const { error } = await supabase
        .from('bottles')
        .delete()
        .in('id', selected);
      
      if (error) {
        console.error('Error deleting selected bottles:', error);
        throw error;
      }
      
      console.log('Selected bottles deleted successfully');
      
      setSnackbar({ 
        open: true, 
        message: `${selected.length} bottles and their rental records deleted successfully`, 
        severity: 'success' 
      });
      
      setSelected([]);
      fetchBottles();
    } catch (error) {
      console.error('Error deleting selected bottles:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to delete selected bottles: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setDeleting(false);
      setDeleteSelectedDialog(false);
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!userProfile?.organization_id) {
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to user', 
        severity: 'error' 
      });
      return;
    }

    console.log('userProfile at deleteSingle:', userProfile);

    try {
      console.log('=== DELETING SINGLE BOTTLE AND RENTAL ===');
      
      // First, delete rental record for this bottle
      const { error: rentalDeleteError } = await supabase
        .from('rentals')
        .delete()
        .eq('bottle_id', id);
      
      if (rentalDeleteError) {
        console.error('Error deleting rental record:', rentalDeleteError);
        throw rentalDeleteError;
      }
      
      console.log('Rental record for bottle deleted successfully');
      
      // Then delete the bottle
      const { error } = await supabase
        .from('bottles')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting bottle:', error);
        throw error;
      }
      
      console.log('Bottle deleted successfully');
      
      setSnackbar({ 
        open: true, 
        message: 'Bottle and its rental record deleted successfully', 
        severity: 'success' 
      });
      
      fetchBottles();
    } catch (error) {
      console.error('Error deleting bottle:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to delete bottle: ' + error.message, 
        severity: 'error' 
      });
    }
  };

  const handleEdit = (bottle) => {
    setEditBottle(bottle);
    setEditDialog({ open: true, bottle });
  };

  const handleSaveEdit = async () => {
    if (!userProfile?.organization_id) {
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to user', 
        severity: 'error' 
      });
      return;
    }

    try {
      // RLS will automatically filter by organization_id
      const { error } = await supabase
        .from('bottles')
        .update(editBottle)
        .eq('id', editBottle.id);
      
      if (error) throw error;
      
      setSnackbar({ 
        open: true, 
        message: 'Bottle updated successfully', 
        severity: 'success' 
      });
      setEditDialog({ open: false, bottle: null });
      fetchBottles();
    } catch (error) {
      console.error('Error updating bottle:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to update bottle: ' + error.message, 
        severity: 'error' 
      });
    }
  };

  const handleAdd = async () => {
    if (!userProfile?.organization_id) {
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to user', 
        severity: 'error' 
      });
      return;
    }

    // Check cylinder limits before adding
    const validation = await cylinderLimitService.validateCylinderAddition(
      userProfile.organization_id, 
      newBottle
    );

    if (!validation.isValid) {
      setLimitDialog({
        open: true,
        limitCheck: validation.limitCheck,
        message: {
          type: validation.errorType,
          title: 'Cylinder Limit Exceeded',
          message: validation.error
        },
        upgradeSuggestion: validation.upgradeSuggestion,
        onProceed: null,
        proceedText: "Continue"
      });
      return;
    }

    try {
      // The trigger will automatically set organization_id
      const { error } = await supabase
        .from('bottles')
        .insert([newBottle]);
      
      if (error) throw error;
      
      setSnackbar({ 
        open: true, 
        message: 'Bottle added successfully', 
        severity: 'success' 
      });
      setAddDialog({ open: false });
      setNewBottle({
        barcode_number: '',
        serial_number: '',
        assigned_customer: '',
        customer_name: '',
        product_code: '',
        description: '',
        owner_id: '',
        owner_name: ''
      });
      fetchBottles();
    } catch (error) {
      console.error('Error adding bottle:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to add bottle: ' + error.message, 
        severity: 'error' 
      });
    }
  };

  // Utility function to clean up duplicate customer numbers
  const cleanupDuplicateCustomerNumbers = async () => {
    try {
      console.log('🧹 Cleaning up duplicate customer numbers...');
      
      // Find customers with duplicate customer_numbers
      const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('id, customer_number, CustomerListID, name, organization_id')
        .eq('organization_id', userProfile.organization_id)
        .order('id');
      
      if (fetchError) {
        console.error('Error fetching customers:', fetchError);
        throw fetchError;
      }
      
      // Check for duplicates in both customer_number and CustomerListID
      const customerNumberCounts = {};
      const customerListIDCounts = {};
      const duplicates = [];
      
      // Find duplicates in customer_number
      customers.forEach(customer => {
        if (customer.customer_number) {
          if (customerNumberCounts[customer.customer_number]) {
            customerNumberCounts[customer.customer_number].push(customer);
            if (!duplicates.find(d => d.id === customer.id)) {
              duplicates.push(customer);
            }
          } else {
            customerNumberCounts[customer.customer_number] = [customer];
          }
        }
      });
      
      // Find duplicates in CustomerListID
      customers.forEach(customer => {
        if (customer.CustomerListID) {
          if (customerListIDCounts[customer.CustomerListID]) {
            customerListIDCounts[customer.CustomerListID].push(customer);
            if (!duplicates.find(d => d.id === customer.id)) {
              duplicates.push(customer);
            }
          } else {
            customerListIDCounts[customer.CustomerListID] = [customer];
          }
        }
      });
      
      console.log('Found duplicate customer numbers:', duplicates.length);
      
      if (duplicates.length === 0) {
        console.log('✅ No duplicates found');
        return;
      }
      
      // Get all existing numbers to ensure uniqueness
      const allExistingNumbers = new Set();
      customers.forEach(customer => {
        if (customer.customer_number) allExistingNumbers.add(customer.customer_number);
        if (customer.CustomerListID) allExistingNumbers.add(customer.CustomerListID);
      });
      
      // Fix duplicates by generating new customer numbers
      for (const duplicate of duplicates) {
        let newCustomerNumber;
        let attempts = 0;
        
        // Generate a unique number
        do {
          newCustomerNumber = `1370000-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          attempts++;
          if (attempts > 20) {
            throw new Error(`Failed to generate unique customer number for ${duplicate.name} after 20 attempts`);
          }
        } while (allExistingNumbers.has(newCustomerNumber));
        
        // Add to existing numbers to prevent duplicates in this batch
        allExistingNumbers.add(newCustomerNumber);
        
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            customer_number: newCustomerNumber,
            CustomerListID: newCustomerNumber,
            barcode: `*%${newCustomerNumber}*`,
            customer_barcode: `*%${newCustomerNumber}*`,
            AccountNumber: newCustomerNumber
          })
          .eq('id', duplicate.id);
        
        if (updateError) {
          console.error('Error updating customer:', duplicate.name, updateError);
          throw updateError;
        } else {
          console.log(`✅ Updated customer "${duplicate.name}" with new number: ${newCustomerNumber}`);
        }
      }
      
      console.log(`✅ Successfully cleaned up ${duplicates.length} duplicate customer numbers`);
      
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      throw error; // Re-throw to be handled by caller
    }
  };

  const handleFileUpload = async (event) => {
    console.log('=== FILE UPLOAD STARTED ===');
    console.log('User profile:', userProfile);
    console.log('Organization ID:', userProfile?.organization_id);
    
    if (!userProfile?.organization_id) {
      setSnackbar({ 
        open: true, 
        message: 'Your account is not linked to an organization. Please use the Fix Organization Link tool at /fix-organization-link or contact support.', 
        severity: 'error' 
      });
      return;
    }
    
    // Verify organization access by trying to read from a simple table
    try {
      setSnackbar({ 
        open: true, 
        message: 'Verifying organization access...', 
        severity: 'info' 
      });
      
      const { data: testAccess, error: accessError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', userProfile.organization_id)
        .single();
      
      if (accessError) {
        console.error('Organization access error:', accessError);
        setSnackbar({ 
          open: true, 
          message: 'Unable to verify your organization access. Please contact support.', 
          severity: 'error' 
        });
        return;
      }
      
      console.log('✅ Organization access verified:', testAccess.name);
    } catch (error) {
      console.error('Organization verification failed:', error);
      setSnackbar({ 
        open: true, 
        message: 'Organization verification failed. Please contact support.', 
        severity: 'error' 
      });
      return;
    }
    
    // Clean up any existing duplicate customer numbers before import
    console.log('🧹 Running pre-import cleanup...');
    try {
      setSnackbar({ 
        open: true, 
        message: 'Running pre-import cleanup...', 
        severity: 'info' 
      });
      
      await cleanupDuplicateCustomerNumbers();
      console.log('✅ Pre-import cleanup completed');
      
      // Wait a moment to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (cleanupError) {
      console.error('Pre-import cleanup failed:', cleanupError);
      setSnackbar({ 
        open: true, 
        message: `Pre-import cleanup failed: ${cleanupError.message}. Please try the "Fix Duplicates" button first.`, 
        severity: 'error' 
      });
      setImporting(false);
      return;
    }
    
    const file = event.target.files[0];
    if (!file) {
      setImporting(false);
      return;
    }
    
    setImporting(true);
    
    try {
      setSnackbar({ 
        open: true, 
        message: 'Reading Excel file...', 
        severity: 'info' 
      });
      
      const data = await readExcelFile(file);
      console.log('Excel data loaded:', data.length, 'rows');
      console.log('First row sample:', data[0]);
      
      if (data.length === 0) {
        throw new Error('No data found in the Excel file');
      }
      
      setSnackbar({ 
        open: true, 
        message: `Processing ${data.length} rows...`, 
        severity: 'info' 
      });
      
      // Fetch all location names (case-insensitive)
      const { data: locationRows, error: locError } = await supabase.from('locations').select('name');
      const locationNames = (locationRows || []).map(l => l.name.toLowerCase());
      console.log('Available locations:', locationNames);
      
      // Step 1: Collect all unique ownership values from the data
      const allOwnershipNames = Array.from(new Set(data.map(row => getOwnershipValue(row)).filter(Boolean)));

      // Step 1.5: Insert all unique ownership values into the owners table for this organization (skip duplicates)
      if (allOwnershipNames.length > 0) {
        // Fetch existing owners for this org
        const { data: existingOwners, error: fetchOwnersError } = await supabase
          .from('owners')
          .select('name')
          .eq('organization_id', userProfile.organization_id);
        if (fetchOwnersError) {
          console.error('FETCH OWNERS ERROR:', fetchOwnersError);
        }
        const existingNames = new Set((existingOwners || []).map(o => o.name.trim().toLowerCase()));
        const missingOwners = allOwnershipNames.filter(name => !existingNames.has(name.toLowerCase()));
        console.log('IMPORT DEBUG - missingOwners:', missingOwners);
        if (missingOwners.length > 0) {
          const { error: insertError } = await supabase
            .from('owners')
            .insert(missingOwners.map(name => ({ name, organization_id: userProfile.organization_id })));
          if (insertError) {
            console.error('IMPORT DEBUG - OWNER INSERT ERROR:', insertError);
          } else {
            console.log('IMPORT DEBUG - Successfully inserted owners:', missingOwners);
          }
        } else {
          console.log('IMPORT DEBUG - No missing owners to insert.');
        }
      }
      // Step 2: Ensure all ownership values exist in the owners table
      const { data: existingOwners, error: fetchOwnersError } = await supabase
        .from('owners')
        .select('*')
        .eq('organization_id', userProfile.organization_id);
      if (fetchOwnersError) throw fetchOwnersError;
      const existingOwnerNames = new Set((existingOwners || []).map(o => (o.name || '').trim().toLowerCase()));
      const missingOwners = allOwnershipNames.filter(name => !existingOwnerNames.has(name.toLowerCase()));
      if (missingOwners.length > 0) {
        // Insert all missing owners for this organization (no 'type' column)
        await supabase
          .from('owners')
          .insert(missingOwners.map(name => ({ name, organization_id: userProfile.organization_id })));
      }
      // Step 3: Fetch all owners again to get their IDs
      const { data: allOwners, error: allOwnersError } = await supabase
        .from('owners')
        .select('*')
        .eq('organization_id', userProfile.organization_id);
      if (allOwnersError) throw allOwnersError;
      const ownershipNameToOwner = {};
      allOwners.forEach(o => { if (o.name) ownershipNameToOwner[o.name.trim().toLowerCase()] = o; });
      
      // Fetch all owners for the organization before processing rows
      const { data: allOwnersList, error: ownersError } = await supabase
        .from('owners')
        .select('*')
        .eq('organization_id', userProfile.organization_id);
      if (ownersError) throw ownersError;
      let ownersList = allOwnersList || [];
      
      // Step 2: Process customers from mapped data
      const customerMap = {};
      const customerIdMap = {};
      
      for (const row of data) {
        // Get customer name from Customer column
        const customerName = row['Customer']?.trim() || row['customer_name']?.trim();
        
        // Get customer ID from CustomerListID column (this is the ID, not the name)
        const customerId = row['CustomerListID']?.trim() || row['Customer ID']?.trim() || row['CustomerID']?.trim() || 
                          row['Customer #']?.trim() || row['Customer Number']?.trim() || row['CUSTOMER_NUMBER']?.trim() ||
                          row['assigned_customer']?.trim();
        
        console.log('Processing row with customer:', customerName, 'ID:', customerId);
        
        // Only process if we have a customer name and it's not a location
        if (customerName && customerName !== '' && !locationNames.includes(customerName.toLowerCase())) {
          customerMap[customerName] = true;
          
          // If we have both name and ID, store the mapping
          if (customerId && customerId !== '') {
            customerIdMap[customerName.toLowerCase()] = customerId;
            console.log('Using existing customer ID:', customerId, 'for customer:', customerName);
          } else {
            console.log('No customer ID found for:', customerName, '- will generate one');
          }
          
          console.log('Added to customer map:', customerName);
        } else if (customerName) {
          console.log('Skipping customer (might be location):', customerName);
        }
      }
      
      console.log('Customer map:', customerMap);
      console.log('Customer ID map:', customerIdMap);
      console.log('Customer names to process:', Object.keys(customerMap));
      
      // Check/create missing customers using existing IDs from file
      const customerNames = Object.keys(customerMap);
      let customersList = [];
      let toCreate = [];
      
      if (customerNames.length > 0) {
        console.log('🔍 Checking for existing customers...');
        
        // Get existing customers by name (case-insensitive)
        const { data: existingCustomers, error: existingError } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', userProfile.organization_id);
        
        if (existingError) {
          console.error('Error fetching existing customers:', existingError);
          throw existingError;
        }
        
        // Filter existing customers by name (case-insensitive)
        const existingCustomersFiltered = (existingCustomers || []).filter(customer => 
          customerNames.some(name => customer.name.toLowerCase() === name.toLowerCase())
        );
        
        console.log('✅ Found existing customers:', existingCustomersFiltered.map(c => c.name));
        customersList = existingCustomersFiltered;
        
        const existingNames = customersList.map(c => c.name.toLowerCase());
        toCreate = customerNames.filter(n => !existingNames.includes(n.toLowerCase()));
        
        console.log('📝 Customers to create:', toCreate);
        console.log('🔄 Customers to reuse:', existingNames);
        
        if (toCreate.length > 0) {
          console.log('🆕 Creating new customers with existing IDs from file:', toCreate);
          
          // First, get ALL existing customer numbers for this organization to avoid duplicates
          const { data: allExistingCustomers, error: allCustomersError } = await supabase
            .from('customers')
            .select('customer_number, CustomerListID')
            .eq('organization_id', userProfile.organization_id);
          
          if (allCustomersError) {
            console.error('Error fetching all existing customers:', allCustomersError);
            throw allCustomersError;
          }
          
          const existingCustomerNumbers = new Set();
          const existingCustomerListIDs = new Set();
          
          (allExistingCustomers || []).forEach(customer => {
            if (customer.customer_number) existingCustomerNumbers.add(customer.customer_number);
            if (customer.CustomerListID) existingCustomerListIDs.add(customer.CustomerListID);
          });
          
          console.log('📊 Found existing customer numbers:', existingCustomerNumbers.size);
          console.log('📊 Found existing CustomerListIDs:', existingCustomerListIDs.size);
          
          const inserts = [];
          const usedNumbers = new Set(); // Track numbers we're about to use in this batch
          
          for (const name of toCreate) {
            const existingId = customerIdMap[name.toLowerCase()];
            let customerId = existingId;
            
            // Check if the ID from file already exists in database or batch
            if (existingId && (existingCustomerNumbers.has(existingId) || existingCustomerListIDs.has(existingId) || usedNumbers.has(existingId))) {
              console.log(`⚠️ Customer ID "${existingId}" for "${name}" already exists, generating new one`);
              customerId = null; // Force generation of new ID
            }
            
            // Generate unique ID if needed
            if (!customerId) {
              let attempts = 0;
              do {
                customerId = `1370000-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                attempts++;
                if (attempts > 10) {
                  throw new Error(`Failed to generate unique customer ID for ${name} after 10 attempts`);
                }
              } while (existingCustomerNumbers.has(customerId) || existingCustomerListIDs.has(customerId) || usedNumbers.has(customerId));
            }
            
            // Track this number to avoid duplicates within the batch
            usedNumbers.add(customerId);
            
            console.log(`Creating customer "${name}" with ID: ${customerId} (${existingId ? 'from file' : 'generated'})`);
            
            inserts.push({
              CustomerListID: customerId,
              name: name,
              organization_id: userProfile.organization_id,
              customer_number: customerId,
              barcode: `*%${customerId}*`,
              customer_barcode: `*%${customerId}*`,
              AccountNumber: customerId
            });
          }
          
          console.log('💾 Inserting new customers:', inserts);
          
          // Add better error handling for RLS policy issues
          try {
            console.log('💾 Attempting to insert/upsert customers...');
            
            // Use upsert to handle potential duplicates more gracefully
            const { data: insertedCustomers, error: insertError } = await supabase
              .from('customers')
              .upsert(inserts, { 
                onConflict: 'customer_number',
                ignoreDuplicates: false 
              })
              .select();
            
            if (insertError) {
              console.error('Customer upsert error:', insertError);
              
              // Handle specific duplicate key errors
              if (insertError.message.includes('duplicate key value violates unique constraint')) {
                console.error('🚨 Duplicate Key Error Details:');
                console.error('Error message:', insertError.message);
                console.error('Customers being inserted:', inserts);
                
                // Try to identify which customer number is causing the issue
                const duplicateMatch = insertError.message.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
                if (duplicateMatch) {
                  console.error(`Duplicate key: ${duplicateMatch[1]} = ${duplicateMatch[2]}`);
                  
                  // Try to fix the specific duplicate and retry
                  const duplicateValue = duplicateMatch[2];
                  console.log(`🔧 Attempting to fix duplicate: ${duplicateValue}`);
                  
                  // Run cleanup again to fix any remaining duplicates
                  await cleanupDuplicateCustomerNumbers();
                  
                  // Generate new IDs for all customers to be safe
                  const newInserts = inserts.map(customer => {
                    const newId = `1370000-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    return {
                      ...customer,
                      CustomerListID: newId,
                      customer_number: newId,
                      barcode: `*%${newId}*`,
                      customer_barcode: `*%${newId}*`,
                      AccountNumber: newId
                    };
                  });
                  
                  console.log('🔄 Retrying with new generated IDs...');
                  
                  // Retry with new IDs
                  const { data: retryInsertedCustomers, error: retryInsertError } = await supabase
                    .from('customers')
                    .insert(newInserts)
                    .select();
                  
                  if (retryInsertError) {
                    console.error('Retry insert also failed:', retryInsertError);
                    throw new Error(`Customer creation failed even after retry: ${retryInsertError.message}`);
                  }
                  
                  console.log('✅ Retry successful, customers created:', retryInsertedCustomers.length);
                  customersList.push(...retryInsertedCustomers);
                } else {
                  throw new Error(`Duplicate customer number detected: ${insertError.message}. Please try the import again.`);
                }
              } else if (insertError.message.includes('row-level security policy')) {
                console.error('🚨 RLS Policy Error Details:');
                console.error('User ID:', userProfile.id);
                console.error('User Profile:', userProfile);
                console.error('Organization ID:', userProfile.organization_id);
                console.error('Customers to insert:', inserts);
                
                // Check if user has proper organization_id
                if (!userProfile.organization_id) {
                  throw new Error('Your account is not linked to an organization. Please visit /fix-organization-link to fix your account setup, then try the import again.');
                }
                
                // Try to get more details about the current user's profile
                const { data: currentProfile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', userProfile.id)
                  .single();
                
                if (profileError) {
                  console.error('Error fetching current profile:', profileError);
                  throw new Error('Unable to verify your account permissions. Please contact support.');
                } else {
                  console.error('Current profile from database:', currentProfile);
                  if (!currentProfile.organization_id) {
                    throw new Error('Your account is not properly linked to an organization. Please visit /fix-organization-link to fix this issue.');
                  }
                }
                
                // Provide comprehensive error message with solutions
                const rlsErrorMessage = `
Database security policy error: The system cannot create customers for your organization.

This usually happens when:
1. Your account is not properly linked to an organization
2. Database security policies need to be updated

Solutions:
1. Visit /fix-organization-link to fix your account setup
2. Run the fix-customers-rls-policies.sql script in your database
3. Contact support if the issue persists

Technical details: ${insertError.message}
                `.trim();
                
                throw new Error(rlsErrorMessage);
              }
              
              throw insertError;
            } else {
              console.log('✅ Customers created successfully:', insertedCustomers.length);
              customersList.push(...insertedCustomers);
            }
          } catch (insertError) {
            console.error('Customer insertion failed:', insertError);
            
            // Final fallback: If all else fails, create customers with guaranteed unique IDs
            if (insertError.message.includes('duplicate key value violates unique constraint')) {
              console.log('🔄 Using final fallback: generating completely unique IDs...');
              
              const fallbackInserts = inserts.map((customer, index) => {
                const timestamp = Date.now();
                const randomSuffix = Math.random().toString(36).substr(2, 9);
                const uniqueId = `FB-${timestamp}-${index}-${randomSuffix}`;
                
                return {
                  ...customer,
                  CustomerListID: uniqueId,
                  customer_number: uniqueId,
                  barcode: `*%${uniqueId}*`,
                  customer_barcode: `*%${uniqueId}*`,
                  AccountNumber: uniqueId
                };
              });
              
              try {
                const { data: fallbackCustomers, error: fallbackError } = await supabase
                  .from('customers')
                  .insert(fallbackInserts)
                  .select();
                
                if (fallbackError) {
                  console.error('Even fallback failed:', fallbackError);
                  throw new Error(`Customer creation failed completely: ${fallbackError.message}. Please contact support.`);
                }
                
                console.log('✅ Fallback successful, customers created:', fallbackCustomers.length);
                customersList.push(...fallbackCustomers);
                
              } catch (fallbackErr) {
                console.error('Fallback mechanism failed:', fallbackErr);
                throw new Error(`All customer creation attempts failed: ${fallbackErr.message}. Please contact support.`);
              }
            } else {
              throw insertError;
            }
          }
        } else {
          console.log('✅ All customers already exist - no new customers created');
        }
      }
      
      // Map for quick lookup - prioritize existing IDs from file
      const customerNameToId = {};
      for (const c of customersList) {
        // Use existing ID from file if available, otherwise use from database
        const existingId = customerIdMap[c.name.toLowerCase()];
        customerNameToId[c.name.toLowerCase()] = existingId || c.CustomerListID;
      }
      console.log('Customer name to ID mapping:', customerNameToId);
      // Prepare bottles and rentals using existing customer IDs from file
      const bottlesToInsert = [];
      const rentalsToInsert = [];
      
      for (const row of data) {
        // Use the mapped owner_name field (already set in readExcelFile mapping)
        // If owner_name is empty, try to get it from the Ownership column using getOwnershipValue
        if (!row.owner_name) {
          row.owner_name = getOwnershipValue(row);
        }
        
        // Always use owners table for owner_id
        const ownerObj = ownershipNameToOwner[row.owner_name.trim().toLowerCase()];
        row.owner_type = ownerObj?.type || 'external_company';
        row.owner_id = ownerObj?.id || null;
        row.owner_name = ownerObj?.name || row.owner_name;
        
        // Get customer information from the Customer column
        const customerName = row['Customer']?.trim() || row['customer_name']?.trim();
        const customerId = row['CustomerListID']?.trim() || row['Customer ID']?.trim() || row['CustomerID']?.trim() || 
                          row['Customer #']?.trim() || row['Customer Number']?.trim() || row['CUSTOMER_NUMBER']?.trim() ||
                          row['assigned_customer']?.trim();
        
        // Check if this is a customer assignment (not a location)
        const isCustomerAssignment = customerName && !locationNames.includes(customerName.toLowerCase());
        
        console.log(`Processing bottle: ${row.barcode_number} | Customer: ${customerName} | Customer ID: ${customerId} | Is Customer: ${isCustomerAssignment} | Owner: ${row.owner_name} | Location: ${row.location}`);
        
        // If there's a customer specified, assign the bottle to them
        if (isCustomerAssignment) {
          // Find the customer ID (either from file or from created customers)
          let finalCustomerId = customerId || customerNameToId[customerName.toLowerCase()];
          
          if (!finalCustomerId) {
            console.error(`❌ No customer ID found for: ${customerName}`);
            console.error('Available customer mappings:', customerNameToId);
            console.error('Customer from file:', customerId);
            console.error('Customer from created:', customerNameToId[customerName.toLowerCase()]);
            // This shouldn't happen if our customer creation logic worked properly
            continue;
          }
          
          // Assign bottle to customer - ensure it's a string
          row.assigned_customer = String(finalCustomerId);
          console.log(`✅ Bottle ${row.barcode_number} assigned to customer: ${customerName} (${finalCustomerId})`);
          
          // Determine ownership and create rental if needed
          if (row.owner_name.toUpperCase() === 'CUSTOMER OWNED') {
            // Customer owns the bottle - no rental needed
            row.owner_type = 'customer';
            // Use the UUID from the owners table for "CUSTOMER OWNED"
            const customerOwnedOwner = ownershipNameToOwner['customer owned'];
            row.owner_id = customerOwnedOwner?.id || null;
            console.log(`📋 Customer owned bottle ${row.barcode_number} - no rental created`);
          } else {
            // Company or external owns the bottle - create rental
            console.log(`💰 Creating rental for bottle ${row.barcode_number} (owned by: ${row.owner_name})`);
            rentalsToInsert.push({
              customer_id: String(finalCustomerId), // Ensure it's a string, not UUID
              bottle_id: row.id, // will update after insert
              rental_start_date: new Date().toISOString().split('T')[0],
              rental_type: 'monthly',
              rental_amount: 10,
              location: row.location || 'SASKATOON',
              tax_code: 'pst+gst',
              tax_rate: 0.11,
              organization_id: userProfile.organization_id
            });
          }
        } else {
          // No customer assignment - bottle goes to inventory
          row.assigned_customer = null;
          console.log(`📦 Bottle ${row.barcode_number} added to inventory (no customer assignment)`);
        }
        
        // Set organization ownership for company-owned bottles
        if (row.owner_name.toLowerCase() === 'weldcor' || row.owner_name.toLowerCase() === userProfile.organization?.name?.toLowerCase()) {
          row.owner_type = 'organization';
          row.owner_id = userProfile.organization_id; // This should be a UUID
        }
        
        // Ensure organization_id is set for all bottles
        row.organization_id = userProfile.organization_id;
        
        // Ensure assigned_customer is a string, not UUID
        if (row.assigned_customer) {
          row.assigned_customer = String(row.assigned_customer);
        }
        
        bottlesToInsert.push(row);
      }
      
      // Check cylinder limits before bulk insert
      const bulkCheck = await cylinderLimitService.checkBulkOperation(
        userProfile.organization_id, 
        bottlesToInsert.length
      );
      
      if (!bulkCheck.canProceed) {
        setLimitDialog({
          open: true,
          limitCheck: bulkCheck.limitCheck,
          message: bulkCheck.message,
          upgradeSuggestion: bulkCheck.upgradeSuggestion,
          onProceed: null,
          proceedText: "Continue"
        });
        setImporting(false);
        return;
      }
      
      // Insert bottles
      const { data: insertedBottles, error } = await supabase.from('bottles').insert(bottlesToInsert).select();
      if (error) throw error;
      // Debug: Fetch and log all owners for this organization after import
      const { data: allOwnersAfter, error: ownersAfterError } = await supabase
        .from('owners')
        .select('*')
        .eq('organization_id', userProfile.organization_id);
      if (ownersAfterError) {
        console.error('IMPORT DEBUG - Error fetching owners after import:', ownersAfterError);
      } else {
        console.log('IMPORT DEBUG - All owners for org after import:', allOwnersAfter);
      }
      // Update rental records with bottle IDs
      const bottleIdMap = {};
      for (let i = 0; i < bottlesToInsert.length; i++) {
        if (insertedBottles[i]) bottleIdMap[i] = insertedBottles[i].id;
      }
      for (let i = 0; i < rentalsToInsert.length; i++) {
        rentalsToInsert[i].bottle_id = bottleIdMap[i];
      }
      if (rentalsToInsert.length > 0) {
        const { error: rentalError } = await supabase.from('rentals').insert(rentalsToInsert);
        if (rentalError) {
          setSnackbar({ open: true, message: 'Warning: Bottles imported but rental records could not be created: ' + rentalError.message, severity: 'warning' });
        }
      }
      // Create detailed summary message
      const existingCustomersCount = customerNames.length - toCreate.length;
      const newCustomersCount = toCreate.length;
      const bottlesCount = bottlesToInsert.length;
      const rentalsCount = rentalsToInsert.length;
      const bottlesWithCustomers = bottlesToInsert.filter(b => b.assigned_customer).length;
      const bottlesInInventory = bottlesToInsert.length - bottlesWithCustomers;
      
      let summaryMessage = `✅ Import completed successfully!\n`;
      summaryMessage += `📦 ${bottlesCount} bottles processed\n`;
      summaryMessage += `👥 ${bottlesWithCustomers} bottles assigned to customers\n`;
      summaryMessage += `🏪 ${bottlesInInventory} bottles added to inventory\n`;
      
      if (customerNames.length > 0) {
        summaryMessage += `\n👤 Customer processing:\n`;
        if (existingCustomersCount > 0) {
          summaryMessage += `🔄 ${existingCustomersCount} existing customers found\n`;
        }
        if (newCustomersCount > 0) {
          summaryMessage += `🆕 ${newCustomersCount} new customers created\n`;
        }
        summaryMessage += `📋 Customer names processed: ${customerNames.join(', ')}\n`;
      }
      
      if (rentalsCount > 0) {
        summaryMessage += `💰 ${rentalsCount} rental records created\n`;
      }
      
      console.log('📊 Import Summary:', summaryMessage);
      setSnackbar({ open: true, message: summaryMessage, severity: 'success' });
      fetchBottles();
      fetchOwners(); // Refresh the owners list as new owners may have been created
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to import bottles: ' + error.message, severity: 'error' });
    }
    setImporting(false);
  };

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet);
          
          // Debug: Log available column names from the first row
          if (data.length > 0) {
            console.log('Available Excel columns:', Object.keys(data[0]));
            console.log('First row sample:', data[0]);
          }
          
          // Map Excel columns to database columns
          const mappedData = data.map(row => {
            // Enhanced column name mapping with more variations
            const mapped = {
              barcode_number: row['Barcode'] || row['barcode_number'] || row['Barcode Number'] || row['BARCODE'] || row['BARCODE_NUMBER'] || row['Barcode Number'] || '',
              serial_number: (row['Serial Number'] || row['serial_number'] || row['Serial'] || row['SERIAL'] || row['SERIAL_NUMBER'] || row['Serial'] || '').toString().trim(),
              assigned_customer: row['CustomerListID'] || row['assigned_customer'] || row['Customer ID'] || row['CustomerID'] || row['CUSTOMER_ID'] || row['Customer #'] || row['Customer Number'] || row['CUSTOMER_NUMBER'] || '',
              customer_name: row['Customer'] || row['customer_name'] || row['Customer Name'] || row['CUSTOMER'] || row['CUSTOMER_NAME'] || '',
              location: row['Location'] || row['location'] || row['LOCATION'] || row['Current Location'] || row['current_location'] || row['CURRENT_LOCATION'] || '',
              product_code: row['Product Code'] || row['product_code'] || row['Product'] || row['PRODUCT'] || row['PRODUCT_CODE'] || '',
              description: row['Description'] || row['description'] || row['DESCRIPTION'] || '',
              days_at_location: cleanInt(row['Days At Location'] || row['days_at_location'] || row['Days'] || row['DAYS'] || 0),
              in_house_total: cleanInt(row['In-House Total'] || row['in_house_total'] || row['In House'] || row['IN_HOUSE'] || 0),
              with_customer_total: cleanInt(row['With Customer Total'] || row['with_customer_total'] || row['With Customer'] || row['WITH_CUSTOMER'] || 0),
              lost_total: cleanInt(row['Lost Total'] || row['lost_total'] || row['Lost'] || row['LOST'] || 0),
              total: cleanInt(row['Total'] || row['total'] || row['TOTAL'] || 0),
              // Enhanced ownership mapping - look for various column names
              owner_type: row['Ownership Type'] || row['ownership_type'] || row['Owner Type'] || row['owner_type'] || '',
              owner_id: row['Owner ID'] || row['owner_id'] || row['OWNER_ID'] || '',
              owner_name: row['Owner'] || row['owner'] || row['OWNER'] || row['Owner Name'] || row['owner_name'] || row['OWNER_NAME'] || 
                          row['Ownership'] || row['ownership'] || row['OWNERSHIP'] || '',
            };
            
            // If serial_number is empty after trimming, set to 'Not Set'
            if (!mapped.serial_number) {
              mapped.serial_number = 'Not Set';
            }
            
            // Auto-fill product_code and gas_type based on description if empty
            if (!mapped.product_code && mapped.description) {
              const desc = mapped.description.toLowerCase();
              if (desc.includes('propane') || desc.includes('lpg')) {
                mapped.product_code = 'PROPANE';
              } else if (desc.includes('oxygen') || desc.includes('o2')) {
                mapped.product_code = 'OXYGEN';
              } else if (desc.includes('nitrogen') || desc.includes('n2')) {
                mapped.product_code = 'NITROGEN';
              } else if (desc.includes('argon') || desc.includes('ar')) {
                mapped.product_code = 'ARGON';
              } else if (desc.includes('co2') || desc.includes('carbon dioxide')) {
                mapped.product_code = 'CO2';
              } else {
                mapped.product_code = mapped.description.toUpperCase().substring(0, 10); // Use first 10 chars of description
              }
            }
            
            // Set default location if not provided
            if (!mapped.location) {
              mapped.location = 'SASKATOON';
            }
            
            // Debug: Log the first few rows for debugging
            if (data.indexOf(row) < 3) {
              console.log('Excel row mapping:', {
                original: row,
                mapped: mapped,
                hasCustomer: !!mapped.assigned_customer,
                hasSerial: !!mapped.serial_number,
                hasProductCode: !!mapped.product_code,
                hasLocation: !!mapped.location,
                hasOwner: !!mapped.owner_name,
                customerIdFromFile: row['Customer #'] || row['CustomerListID'] || row['Customer ID'],
                customerNameFromFile: row['Customer'] || row['customer_name'],
                locationFromFile: row['Location'] || row['location'],
                ownerFromFile: row['Owner'] || row['Ownership'] || row['owner_name']
              });
            }
            
            return mapped;
          });
          
          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  const cleanInt = (val) => parseInt(String(val).replace(/,/g, ''), 10) || 0;

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredBottles);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bottles');
    XLSX.writeFile(wb, 'bottles_export.xlsx');
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleUpdateDaysAtLocation = async () => {
    if (!userProfile?.organization_id) {
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to user', 
        severity: 'error' 
      });
      return;
    }

    setUpdatingDays(true);
    try {
      // Use the new database function for daily updates
      const { data, error } = await supabase.rpc('update_days_at_location_daily');
      
      if (error) {
        throw error;
      }
      
      setSnackbar({ 
        open: true, 
        message: `Daily update completed successfully! All bottles have been updated.`, 
        severity: 'success' 
      });
      setLastUpdateTime(new Date().toISOString());
      fetchBottles();
    } catch (error) {
      console.error('Error updating days at location:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to update days at location: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setUpdatingDays(false);
    }
  };

  const checkLastUpdateTime = () => {
    const now = new Date();
    const lastUpdate = lastUpdateTime ? new Date(lastUpdateTime) : null;
    const timeDiff = lastUpdate ? now - lastUpdate : Infinity;
    return timeDiff > 24 * 60 * 60 * 1000; // 24 hours
  };

  // Function to set default locations for bottles without location
  const setDefaultLocations = async () => {
    try {
      console.log('Setting default locations for bottles without location...');
      
      // Get bottles without location
      const { data: bottlesWithoutLocation, error } = await supabase
        .from('bottles')
        .select('id, location')
        .or('location.is.null,location.eq.')
        .limit(100); // Process in batches
      
      if (error) {
        console.error('Error fetching bottles without location:', error);
        return;
      }
      
      if (bottlesWithoutLocation && bottlesWithoutLocation.length > 0) {
        console.log(`Found ${bottlesWithoutLocation.length} bottles without location`);
        
        // Update them with default location
        const { error: updateError } = await supabase
          .from('bottles')
          .update({ location: 'SASKATOON' })
          .in('id', bottlesWithoutLocation.map(b => b.id));
        
        if (updateError) {
          console.error('Error updating bottle locations:', updateError);
        } else {
          console.log('Successfully set default locations');
          fetchBottles(); // Refresh the data
        }
      }
    } catch (error) {
      console.error('Error in setDefaultLocations:', error);
    }
  };

  // Helper to get ownership value from a row, case-insensitive
  function getOwnershipValue(row) {
    // Find any key that matches ownership-related terms case-insensitively
    const ownershipKeys = [
      'ownership',
      'owner',
      'owner_name',
      'ownername',
      'owner name',
      'ownership_type',
      'ownershiptype',
      'ownership type'
    ];
    
    for (const keyPattern of ownershipKeys) {
      const key = Object.keys(row).find(
        k => k.replace(/\s+/g, '').toLowerCase() === keyPattern.replace(/\s+/g, '').toLowerCase()
      );
      if (key && row[key]) {
        return (row[key] || '').toString().trim();
      }
    }
    
    return '';
  }

  // Handler to trigger file input for import
  const handleImport = () => {
    console.log('🔘 Import button clicked');
    console.log('Current importing state:', importing);
    console.log('File input ref:', fileInputRef.current);
    
    // Reset importing state if it's stuck
    if (importing) {
      console.log('⚠️ Importing state is stuck, resetting...');
      setImporting(false);
      return;
    }
    
    // Trigger file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
      console.log('✅ File input clicked');
    } else {
      console.error('❌ File input ref not found');
    }
  };

  const fetchOwners = async () => {
    if (!userProfile?.organization_id) return;
    
    setOwnersLoading(true);
    try {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('name');
      
      if (error) throw error;
      setOwners(data || []);
    } catch (err) {
      console.error('Error fetching owners:', err);
    } finally {
      setOwnersLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!userProfile?.organization_id) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          {isReady ? terms.pageTitles.itemManagement : 'Asset Management'}
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your account is not assigned to an organization. Please contact your administrator to assign you to an organization.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          You need to be assigned to an organization to manage {isReady ? terms.assetsLower : 'assets'}.
        </Typography>
      </Box>
    );
  }

  console.log('Current userProfile in render:', userProfile);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isReady ? terms.pageTitles.itemManagement : 'Asset Management'}
        </h1>
        <p className="text-gray-600">
          {isReady ? `Manage your ${terms.assetsLower} and import data` : 'Manage your assets and import data'}
        </p>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <Box p={3}>
          <Typography variant="h4" gutterBottom>
            {isReady ? terms.pageTitles.itemManagement : 'Asset Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Organization: {organization?.name || organization?.slug || 'Loading...'} • 
            {isReady ? ` ${terms.assets} Tracking` : ' Asset Tracking'}
          </Typography>
          
          {/* Search and Actions Bar */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                placeholder="Search barcode, serial, customer ID, or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
                sx={{ minWidth: 300 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="All">All Locations</MenuItem>
                  <MenuItem value="SASKATOON">SASKATOON</MenuItem>
                  <MenuItem value="REGINA">REGINA</MenuItem>
                  <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
                  <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredBottles.length} {isReady ? terms.assetsLower : 'assets'}
              </Typography>
            </Box>
            
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddDialog({ open: true })}
              >
                Add {isReady ? terms.asset : 'Asset'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import Excel'}
              </Button>
              {importing && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    console.log('🔄 Resetting import state');
                    setImporting(false);
                  }}
                >
                  Reset
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
              >
                Export
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<BuildIcon />}
                onClick={cleanupDuplicateCustomerNumbers}
                disabled={importing}
              >
                Fix Duplicates
              </Button>
              {selected.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteSelectedDialog(true)}
                >
                  Delete Selected ({selected.length})
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteAllDialog(true)}
              >
                Delete All
              </Button>
            </Box>
          </Box>
        </Box>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
      />

      {/* Bottles Table */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < filteredBottles.length}
                    checked={filteredBottles.length > 0 && selected.length === filteredBottles.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key} sx={{ fontWeight: 'bold' }}>
                    {column.label}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBottles.map((bottle) => {
                const isItemSelected = isSelected(bottle.id);
                return (
                  <TableRow
                    key={bottle.id}
                    hover
                    selected={isItemSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onChange={() => handleSelect(bottle.id)}
                      />
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.key === 'barcode_number' && bottle[column.key] ? (
                          <Typography
                            component="span"
                            sx={{
                              color: '#1976d2',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              '&:hover': {
                                color: '#1565c0'
                              }
                            }}
                            onClick={() => navigate(`/asset/${bottle.id}`)}
                          >
                            {bottle[column.key]}
                          </Typography>
                        ) : (
                          bottle[column.key] || '-'
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(bottle)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteSingle(bottle.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, bottle: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit {isReady ? terms.asset : 'Asset'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Location"
                  value={editBottle.location || ''}
                  onChange={e => setEditBottle({ ...editBottle, location: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Owner</InputLabel>
                  <Select
                    value={editBottle.owner_id || ''}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedOwner = owners.find(o => o.id === selectedId);
                      setEditBottle({ 
                        ...editBottle, 
                        owner_id: selectedId,
                        owner_name: selectedOwner ? selectedOwner.name : ''
                      });
                    }}
                    label="Owner"
                  >
                    <MenuItem value="">
                      <em>Select owner...</em>
                    </MenuItem>
                    {owners.map(owner => (
                      <MenuItem key={owner.id} value={owner.id}>
                        {owner.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Ownership"
                  value={editBottle.owner_name || ''}
                  onChange={e => setEditBottle({ ...editBottle, owner_name: e.target.value })}
                  fullWidth
                  helperText="This field is automatically filled when you select an owner above"
                />
              </Grid>
            </Grid>
            {columns.filter(c => c.key !== 'location' && c.key !== 'owner_name').map((column) => (
              <TextField
                key={column.key}
                label={column.label}
                value={editBottle[column.key] || ''}
                onChange={(e) => setEditBottle({ ...editBottle, [column.key]: e.target.value })}
                fullWidth
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, bottle: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialog.open} onClose={() => setAddDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Add New {isReady ? terms.asset : 'Asset'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Location"
                  value={newBottle.location || ''}
                  onChange={e => setNewBottle({ ...newBottle, location: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Owner</InputLabel>
                  <Select
                    value={newBottle.owner_id || ''}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedOwner = owners.find(o => o.id === selectedId);
                      setNewBottle({ 
                        ...newBottle, 
                        owner_id: selectedId,
                        owner_name: selectedOwner ? selectedOwner.name : ''
                      });
                    }}
                    label="Owner"
                  >
                    <MenuItem value="">
                      <em>Select owner...</em>
                    </MenuItem>
                    {owners.map(owner => (
                      <MenuItem key={owner.id} value={owner.id}>
                        {owner.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Ownership"
                  value={newBottle.owner_name || ''}
                  onChange={e => setNewBottle({ ...newBottle, owner_name: e.target.value })}
                  fullWidth
                  helperText="This field is automatically filled when you select an owner above"
                />
              </Grid>
            </Grid>
            {columns.filter(c => c.key !== 'location' && c.key !== 'owner_name').map((column) => (
              <TextField
                key={column.key}
                label={column.label}
                value={newBottle[column.key] || ''}
                onChange={(e) => setNewBottle({ ...newBottle, [column.key]: e.target.value })}
                fullWidth
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog({ open: false })}>
            Cancel
          </Button>
          <Button onClick={handleAdd} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Dialog */}
      <Dialog open={deleteAllDialog} onClose={() => setDeleteAllDialog(false)}>
        <DialogTitle>Delete All {isReady ? terms.assets : 'Assets'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete ALL {isReady ? terms.assetsLower : 'assets'} in your organization? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAll} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Selected Dialog */}
      <Dialog open={deleteSelectedDialog} onClose={() => setDeleteSelectedDialog(false)}>
        <DialogTitle>Delete Selected {isReady ? terms.assets : 'Assets'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selected.length} selected {isReady ? terms.assetsLower : 'assets'}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSelectedDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteSelected} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Selected'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{
          maxWidth: 400,
          width: 'auto',
          right: 24,
          left: 'auto',
          bottom: 24,
        }}
        ContentProps={{
          sx: {
            maxWidth: 400,
            width: 'auto',
            wordBreak: 'break-word',
            whiteSpace: 'pre-line',
            boxSizing: 'border-box',
          }
        }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ alignItems: 'center', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Cylinder Limit Dialog */}
      <CylinderLimitDialog
        open={limitDialog.open}
        onClose={() => setLimitDialog({ ...limitDialog, open: false })}
        limitCheck={limitDialog.limitCheck}
        message={limitDialog.message}
        upgradeSuggestion={limitDialog.upgradeSuggestion}
        onProceed={limitDialog.onProceed}
        proceedText={limitDialog.proceedText}
      />
    </div>
  );
} 