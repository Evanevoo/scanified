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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import UpdateIcon from '@mui/icons-material/Update';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase/client';
import { updateDaysAtLocation } from '../utils/daysAtLocationUpdater';
import { useNavigate } from 'react-router-dom';

const columns = [
  { label: 'Barcode', key: 'barcode_number' },
  { label: 'Serial Number', key: 'serial_number' },
  { label: 'Customer ID', key: 'assigned_customer' },
  { label: 'Customer Name', key: 'customer_name' },
  { label: 'Product Code', key: 'product_code' },
  { label: 'Description', key: 'description' },
  { label: 'Days At Location', key: 'days_at_location' },
];

export default function BottleManagement() {
  console.log('=== BOTTLE MANAGEMENT COMPONENT RENDERING ===');
  
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [selected, setSelected] = useState([]);
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [deleteSelectedDialog, setDeleteSelectedDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
    description: ''
  });
  const [editBottle, setEditBottle] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [updatingDays, setUpdatingDays] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const fileInputRef = useRef();
  const navigate = useNavigate();

  console.log('BottleManagement state initialized');

  useEffect(() => {
    console.log('=== LOADING USER PROFILE AND ORGANIZATION ===');
    
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user);
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.error('Error loading profile:', profileError);
          } else {
            console.log('User profile loaded:', profile);
            setUserProfile(profile);
            
            if (profile.organization_id) {
              const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .single();
              
              if (orgError) {
                console.error('Error loading organization:', orgError);
              } else {
                console.log('Organization loaded:', org);
                setOrganization(org);
              }
            } else {
              console.log('No organization_id in profile');
            }
          }
        } else {
          console.log('No authenticated user found');
        }
      } catch (error) {
        console.error('Error in loadUserData:', error);
      }
    };
    
    loadUserData();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchOrganization();
      fetchBottles();
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
      
      // Location filter
      const matchesLocation = locationFilter === 'All' || bottle.location === locationFilter;
      
      return matchesSearch && matchesLocation;
    });
    setFilteredBottles(filtered);
  }, [bottles, searchTerm, locationFilter]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (!profile?.organization_id) {
          setSnackbar({ 
            open: true, 
            message: 'Your account is not assigned to an organization. Please contact your administrator.', 
            severity: 'warning' 
          });
        }
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load user profile: ' + error.message, 
        severity: 'error' 
      });
    }
  };

  const fetchOrganization = async () => {
    if (!userProfile?.organization_id) {
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
      
      setOrganization(org);
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
        description: ''
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

  const handleFileUpload = async (event) => {
    console.log('=== FILE UPLOAD STARTED ===');
    
    if (!userProfile?.organization_id) {
      console.log('No organization_id found in userProfile:', userProfile);
      setSnackbar({ 
        open: true, 
        message: 'No organization assigned to user', 
        severity: 'error' 
      });
      return;
    }

    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, 'Size:', file.size);
    setImporting(true);
    
    try {
      const data = await readExcelFile(file);
      console.log('Excel data parsed:', data.length, 'rows');
      console.log('First row sample:', data[0]);
      
      // 1. Extract and create customers first
      const customerMap = {};
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const customerId = row.assigned_customer;
        const customerName = row.customer_name;
        
        if (customerId && customerName) {
          customerMap[customerId] = customerName;
        }
      }
      
      console.log('Customer map extracted:', customerMap);
      
      // 2. Check existing customers and create missing ones
      const customerIds = Object.keys(customerMap);
      if (customerIds.length > 0) {
        console.log('Checking for existing customers:', customerIds);
        
        // Get existing customers
        const { data: existingCustomers, error: custError } = await supabase
          .from('customers')
          .select('*')
          .in('CustomerListID', customerIds);
        
        if (custError) {
          console.error('Error checking existing customers:', custError);
        } else {
          console.log('Existing customers found:', existingCustomers);
          const existingIds = (existingCustomers || []).map(c => c.CustomerListID);
          const missingCustomers = customerIds.filter(id => !existingIds.includes(id));
          
          console.log('Missing customers to create:', missingCustomers);
          
          if (missingCustomers.length > 0) {
            console.log('Creating missing customers:', missingCustomers);
            
            const customersToInsert = missingCustomers.map(id => ({
              CustomerListID: id,
              name: customerMap[id],
              organization_id: userProfile.organization_id
            }));
            
            console.log('Customers to insert:', customersToInsert);
            
            const { error: insertError } = await supabase
              .from('customers')
              .insert(customersToInsert);
            
            if (insertError) {
              console.error('Error creating customers:', insertError);
              setSnackbar({ 
                open: true, 
                message: 'Warning: Some customers could not be created: ' + insertError.message, 
                severity: 'warning' 
              });
            } else {
              console.log('Successfully created customers:', missingCustomers);
            }
          }
        }
      }
      
      // 3. Insert bottles (the trigger will automatically set organization_id)
      console.log('Inserting bottles:', data.length, 'bottles');
      const { data: insertedBottles, error } = await supabase
        .from('bottles')
        .insert(data)
        .select();
      
      if (error) {
        console.error('Error inserting bottles:', error);
        throw error;
      }
      
      console.log('Bottles inserted successfully:', insertedBottles);
      
      // 4. Create rental records for ALL bottles (both customer-assigned and location-assigned)
      console.log('Creating rental records for all bottles:', insertedBottles.length);
      
      const rentalRecords = insertedBottles.map(bottle => {
        // Determine if this is a customer-assigned or location-assigned bottle
        const isCustomerAssigned = bottle.assigned_customer && bottle.assigned_customer !== '';
        const isLocationAssigned = bottle.location && bottle.location !== '';
        
        let customerId = null;
        let location = 'SASKATOON'; // Default location
        
        if (isCustomerAssigned) {
          customerId = bottle.assigned_customer;
          location = bottle.location || 'SASKATOON';
        } else if (isLocationAssigned) {
          // For location-assigned bottles, create rental with null customer_id
          customerId = null;
          location = bottle.location;
        } else {
          // For bottles with no assignment, use default location
          customerId = null;
          location = 'SASKATOON';
        }
        
        return {
          customer_id: customerId,
          bottle_id: bottle.id,
          rental_start_date: new Date().toISOString().split('T')[0], // Today's date
          rental_type: 'monthly',
          rental_amount: 10, // Default rental amount
          location: location,
          tax_code: 'pst+gst',
          tax_rate: 0.11 // Default tax rate
        };
      });
      
      console.log('Rental records to create:', rentalRecords);
      
      const { error: rentalError } = await supabase
        .from('rentals')
        .insert(rentalRecords);
      
      if (rentalError) {
        console.error('Error creating rental records:', rentalError);
        setSnackbar({ 
          open: true, 
          message: 'Warning: Bottles imported but rental records could not be created: ' + rentalError.message, 
          severity: 'warning' 
        });
      } else {
        console.log('Rental records created successfully');
        
        // Ensure all bottles have the correct location set based on their rental location
        for (const rentalRecord of rentalRecords) {
          if (rentalRecord.location && rentalRecord.bottle_id) {
            await supabase
              .from('bottles')
              .update({ location: rentalRecord.location })
              .eq('id', rentalRecord.bottle_id);
          }
        }
        
        // Debug: Check what rental records were actually created
        const { data: createdRentals, error: checkError } = await supabase
          .from('rentals')
          .select('*')
          .in('bottle_id', insertedBottles.map(b => b.id))
          .limit(5);
        
        console.log('Created rental records sample:', createdRentals, checkError);
      }
      
      setSnackbar({ 
        open: true, 
        message: `${data.length} bottles imported successfully and ${rentalRecords.length} rental records created`, 
        severity: 'success' 
      });
      fetchBottles();
    } catch (error) {
      console.error('Error importing bottles:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to import bottles: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setImporting(false);
      event.target.value = '';
      console.log('=== FILE UPLOAD COMPLETED ===');
    }
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
          
          // Map Excel columns to database columns
          const mappedData = data.map(row => {
            // Enhanced column name mapping with more variations
            const mapped = {
              barcode_number: row['Barcode'] || row['barcode_number'] || row['Barcode Number'] || row['BARCODE'] || row['BARCODE_NUMBER'] || '',
              serial_number: row['Serial Number'] || row['serial_number'] || row['Serial'] || row['SERIAL'] || row['SERIAL_NUMBER'] || '',
              assigned_customer: row['CustomerListID'] || row['assigned_customer'] || row['Customer ID'] || row['CustomerID'] || row['CUSTOMER_ID'] || '',
              customer_name: row['Customer'] || row['customer_name'] || row['Customer Name'] || row['CUSTOMER'] || row['CUSTOMER_NAME'] || '',
              location: row['Location'] || row['location'] || row['LOCATION'] || '',
              product_code: row['Product Code'] || row['product_code'] || row['Product'] || row['PRODUCT'] || row['PRODUCT_CODE'] || '',
              description: row['Description'] || row['description'] || row['DESCRIPTION'] || '',
              days_at_location: cleanInt(row['Days At Location'] || row['days_at_location'] || row['Days'] || row['DAYS'] || 0),
              in_house_total: cleanInt(row['In-House Total'] || row['in_house_total'] || row['In House'] || row['IN_HOUSE'] || 0),
              with_customer_total: cleanInt(row['With Customer Total'] || row['with_customer_total'] || row['With Customer'] || row['WITH_CUSTOMER'] || 0),
              lost_total: cleanInt(row['Lost Total'] || row['lost_total'] || row['Lost'] || row['LOST'] || 0),
              total: cleanInt(row['Total'] || row['total'] || row['TOTAL'] || 0)
            };
            
            // Set default values for empty required fields
            if (!mapped.serial_number && mapped.barcode_number) {
              mapped.serial_number = mapped.barcode_number; // Use barcode as serial if serial is empty
            }
            if (!mapped.serial_number && !mapped.barcode_number) {
              mapped.serial_number = 'Not Set'; // Default fallback
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
            
            // Log the first few rows for debugging
            if (data.indexOf(row) < 3) {
              console.log('Excel row mapping:', {
                original: row,
                mapped: mapped,
                hasCustomer: !!mapped.assigned_customer,
                hasSerial: !!mapped.serial_number,
                hasProductCode: !!mapped.product_code
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
      const result = await updateDaysAtLocation();
      
      if (result.success) {
        setSnackbar({ 
          open: true, 
          message: `Daily update completed! Updated ${result.updated} bottles out of ${result.total} total.`, 
          severity: 'success' 
        });
        setLastUpdateTime(new Date().toISOString());
        fetchBottles();
      } else {
        setSnackbar({ 
          open: true, 
          message: 'Failed to update days at location: ' + result.error, 
          severity: 'error' 
        });
      }
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
    const stored = localStorage.getItem('lastDaysUpdate');
    if (stored) {
      setLastUpdateTime(stored);
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
          Bottle Management
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your account is not assigned to an organization. Please contact your administrator to assign you to an organization.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          You need to be assigned to an organization to manage bottles.
        </Typography>
      </Box>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bottle Management</h1>
        <p className="text-gray-600">Manage your gas cylinders and import data</p>
      </div>

      {/* Debug Panel */}
      <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
        <h3 className="font-bold text-yellow-800 mb-2">Debug Info:</h3>
        <div className="text-sm text-yellow-700">
          <p>User Profile: {userProfile ? 'Loaded' : 'Not loaded'}</p>
          <p>Organization: {organization ? 'Loaded' : 'Not loaded'}</p>
          <p>Organization ID: {userProfile?.organization_id || 'None'}</p>
          <p>Bottles Count: {bottles.length}</p>
          <p>Importing: {importing ? 'Yes' : 'No'}</p>
        </div>
        <div className="mt-2">
          <button 
            onClick={async () => {
              console.log('=== MANUAL DATABASE CHECK ===');
              const { data: customers, error: custError } = await supabase
                .from('customers')
                .select('*')
                .limit(5);
              console.log('Customers in DB:', customers, custError);
              
              const { data: bottles, error: bottleError } = await supabase
                .from('bottles')
                .select('*')
                .limit(5);
              console.log('Bottles in DB:', bottles, bottleError);
              
              const { data: rentals, error: rentalError } = await supabase
                .from('rentals')
                .select('*')
                .limit(5);
              console.log('Rentals in DB:', rentals, rentalError);
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs mr-2"
          >
            Check DB
          </button>
          <button 
            onClick={() => {
              console.log('Current userProfile:', userProfile);
              console.log('Current organization:', organization);
            }}
            className="px-3 py-1 bg-green-500 text-white rounded text-xs mr-2"
          >
            Log State
          </button>
          <button 
            onClick={async () => {
              console.log('=== CHECKING BOTTLES WITH CUSTOMERS ===');
              const { data: bottlesWithCustomers, error } = await supabase
                .from('bottles')
                .select('id, barcode_number, serial_number, assigned_customer, customer_name')
                .not('assigned_customer', 'is', null);
              console.log('Bottles with customers:', bottlesWithCustomers, error);
            }}
            className="px-3 py-1 bg-purple-500 text-white rounded text-xs mr-2"
          >
            Check Assigned
          </button>
          <button 
            onClick={async () => {
              console.log('=== CHECKING RENTAL RECORDS ===');
              const { data: rentals, error } = await supabase
                .from('rentals')
                .select('*')
                .limit(10);
              console.log('Rental records with joins:', rentals, error);
            }}
            className="px-3 py-1 bg-orange-500 text-white rounded text-xs mr-2"
          >
            Check Rentals
          </button>
          <button 
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.xlsx,.xls';
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const workbook = XLSX.read(e.target.result, { type: 'binary' });
                      const sheetName = workbook.SheetNames[0];
                      const worksheet = workbook.Sheets[sheetName];
                      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                      
                      if (data.length > 0) {
                        console.log('=== EXCEL COLUMN NAMES ===');
                        console.log('Column names:', data[0]);
                        console.log('First data row:', data[1]);
                        alert('Check console for Excel column names');
                      }
                    } catch (error) {
                      console.error('Error reading Excel:', error);
                    }
                  };
                  reader.readAsBinaryString(file);
                }
              };
              input.click();
            }}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-xs mr-2"
          >
            Check Excel Columns
          </button>
          <button 
            onClick={async () => {
              console.log('=== DELETING ALL RENTAL RECORDS ===');
              const { error } = await supabase
                .from('rentals')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
              
              if (error) {
                console.error('Error deleting rentals:', error);
                alert('Error: ' + error.message);
              } else {
                console.log('All rental records deleted');
                alert('All rental records deleted successfully');
              }
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-xs"
          >
            Delete All Rentals
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <Box p={3}>
          <Typography variant="h4" gutterBottom>
            Bottle Management
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Organization: {organization?.name || organization?.slug || 'Loading...'}
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
                Showing {filteredBottles.length} bottles
              </Typography>
            </Box>
            
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddDialog({ open: true })}
              >
                Add Bottle
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
              >
                Export
              </Button>
              <Button
                variant="outlined"
                startIcon={<UpdateIcon />}
                onClick={handleUpdateDaysAtLocation}
                disabled={updatingDays}
              >
                {updatingDays ? 'Updating...' : 'Update Days At Location'}
              </Button>
              {lastUpdateTime && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, alignSelf: 'center' }}>
                  Last update: {new Date(lastUpdateTime).toLocaleString()}
                </Typography>
              )}
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
                            onClick={() => navigate(`/bottle/${bottle.id}`)}
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
        <DialogTitle>Edit Bottle</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {columns.map((column) => (
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
        <DialogTitle>Add New Bottle</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {columns.map((column) => (
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
        <DialogTitle>Delete All Bottles</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete ALL bottles in your organization? This action cannot be undone.
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
        <DialogTitle>Delete Selected Bottles</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selected.length} selected bottles? This action cannot be undone.
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
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
} 