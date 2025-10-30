import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Alert, CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Chip, FormControl, InputLabel,
  Select, MenuItem, Switch, FormControlLabel, Divider, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, Tabs, Tab, CardActions
} from '@mui/material';
import {
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  QrCode as QrCodeIcon,
  ViewModule as BarcodeIcon,
  Upload as UploadIcon,
  ViewModule
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';

export default function BarcodeGenerator() {
  const { profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  const [activeTab, setActiveTab] = useState(0);
  
  // Excel Upload functionality
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [customersWithoutBarcodes, setCustomersWithoutBarcodes] = useState([]);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  
  // Single Generation
  const [singleForm, setSingleForm] = useState({
    prefix: organization?.order_number_prefix || 'CYL',
    customerName: '',
    assetType: assetConfig?.assetType || 'cylinder',
    quantity: 1,
    startNumber: 1,
    useCustomFormat: false,
    customFormat: ''
  });
  
  // Bulk Generation
  const [bulkForm, setBulkForm] = useState({
    prefix: organization?.order_number_prefix || 'CYL',
    quantity: 10,
    startNumber: 1,
    customerName: '',
    includeQR: false,
    includeSerial: true,
    format: 'standard' // standard, custom, sequential
  });
  
  // Generated Barcodes
  const [generatedBarcodes, setGeneratedBarcodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [previewDialog, setPreviewDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    totalGenerated: 0,
    lastGenerated: null,
    customersWithBarcodes: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: bottles, error } = await supabase
        .from('bottles')
        .select('id, created_at, assigned_customer')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueCustomers = new Set(bottles.filter(b => b.assigned_customer).map(b => b.assigned_customer));
      
      setStats({
        totalGenerated: bottles.length,
        lastGenerated: bottles.length > 0 ? bottles[0].created_at : null,
        customersWithBarcodes: uniqueCustomers.size
      });
    } catch (error) {
      logger.error('Error loading stats:', error);
    }
  };

  const generateBarcodeNumber = (prefix, number, format = 'standard') => {
    const paddedNumber = number.toString().padStart(6, '0');
    
    switch (format) {
      case 'standard':
        return `${prefix}${paddedNumber}`;
      case 'sequential':
        return `${prefix}-${paddedNumber}`;
      case 'timestamp':
        const timestamp = Date.now().toString().slice(-6);
        return `${prefix}${timestamp}${paddedNumber.slice(-3)}`;
      default:
        return `${prefix}${paddedNumber}`;
    }
  };

  const generateSerialNumber = (prefix, index) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const sequence = index.toString().padStart(4, '0');
    return `${prefix}${year}${month}${sequence}`;
  };

  const handleSingleGenerate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const barcodes = [];
      const startNum = parseInt(singleForm.startNumber);
      
      for (let i = 0; i < parseInt(singleForm.quantity); i++) {
        const barcodeNumber = singleForm.useCustomFormat && singleForm.customFormat
          ? singleForm.customFormat.replace('{n}', (startNum + i).toString().padStart(6, '0'))
          : generateBarcodeNumber(singleForm.prefix, startNum + i);
        
        const serialNumber = generateSerialNumber(singleForm.prefix, startNum + i);
        
        const barcode = {
          barcode_number: barcodeNumber,
          serial_number: serialNumber,
          asset_type: singleForm.assetType,
          customer_name: singleForm.customerName || null,
          organization_id: profile.organization_id,
          status: 'available',
          created_by: profile.id,
          barcode_format: singleForm.useCustomFormat ? 'custom' : 'standard'
        };
        
        barcodes.push(barcode);
      }

      // Insert into database
      const { data, error } = await supabase
        .from('bottles')
        .insert(barcodes)
        .select();

      if (error) throw error;

      setGeneratedBarcodes(data);
      setSuccess(`Successfully generated ${data.length} barcode(s)!`);
      loadStats();

    } catch (error) {
      logger.error('Error generating barcodes:', error);
      setError(`Error generating barcodes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const barcodes = [];
      const startNum = parseInt(bulkForm.startNumber);
      const quantity = parseInt(bulkForm.quantity);
      
      for (let i = 0; i < quantity; i++) {
        const barcodeNumber = generateBarcodeNumber(bulkForm.prefix, startNum + i, bulkForm.format);
        const serialNumber = bulkForm.includeSerial ? generateSerialNumber(bulkForm.prefix, startNum + i) : null;
        
        const barcode = {
          barcode_number: barcodeNumber,
          serial_number: serialNumber,
          asset_type: assetConfig?.assetType || 'cylinder',
          customer_name: bulkForm.customerName || null,
          organization_id: profile.organization_id,
          status: 'available',
          created_by: profile.id,
          barcode_format: bulkForm.format,
          has_qr: bulkForm.includeQR
        };
        
        barcodes.push(barcode);
      }

      // Insert into database in batches of 100
      const batchSize = 100;
      const insertedBarcodes = [];
      
      for (let i = 0; i < barcodes.length; i += batchSize) {
        const batch = barcodes.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('bottles')
          .insert(batch)
          .select();

        if (error) throw error;
        insertedBarcodes.push(...data);
      }

      setGeneratedBarcodes(insertedBarcodes);
      setSuccess(`Successfully generated ${insertedBarcodes.length} barcode(s) in bulk!`);
      loadStats();

    } catch (error) {
      logger.error('Error generating bulk barcodes:', error);
      setError(`Error generating bulk barcodes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (generatedBarcodes.length === 0) return;

    const headers = ['Barcode Number', 'Serial Number', 'Asset Type', 'Customer', 'Status', 'Created Date'];
    const csvContent = [
      headers.join(','),
      ...generatedBarcodes.map(barcode => [
        barcode.barcode_number,
        barcode.serial_number || '',
        barcode.asset_type,
        barcode.customer_name || '',
        barcode.status,
        new Date(barcode.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcodes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportQuickBooks = () => {
    if (generatedBarcodes.length === 0) return;

    // QuickBooks IIF format
    const iifContent = [
      '!HDR\tACCNT\tNAME\tACCNTTYPE',
      '!HDR\tINVITEM\tNAME\tINVITEMTYPE\tDESC\tPRICE\tACCNT',
      ...generatedBarcodes.map(barcode => 
        `INVITEM\t${barcode.barcode_number}\tINVENTORY\t${barcode.asset_type} - ${barcode.barcode_number}\t0.00\tInventory Asset`
      )
    ].join('\n');

    const blob = new Blob([iifContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quickbooks_import_${new Date().toISOString().split('T')[0]}.iif`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportXero = () => {
    if (generatedBarcodes.length === 0) return;

    const headers = ['Item Code', 'Item Name', 'Description', 'Unit Price', 'Account Code', 'Tax Rate'];
    const csvContent = [
      headers.join(','),
      ...generatedBarcodes.map(barcode => [
        barcode.barcode_number,
        `${barcode.asset_type} - ${barcode.barcode_number}`,
        `${barcode.asset_type} with barcode ${barcode.barcode_number}`,
        '0.00',
        '630', // Inventory asset account
        'GST' // Adjust based on region
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xero_import_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportNetSuite = () => {
    if (generatedBarcodes.length === 0) return;

    const headers = ['Item Name/Number', 'Display Name', 'Type', 'Subtype', 'Asset Account', 'Description'];
    const csvContent = [
      headers.join(','),
      ...generatedBarcodes.map(barcode => [
        barcode.barcode_number,
        `${barcode.asset_type} - ${barcode.barcode_number}`,
        'Inventory Item',
        'Sale',
        'Inventory Asset',
        `${barcode.asset_type} with barcode ${barcode.barcode_number}`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netsuite_import_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportSage = () => {
    if (generatedBarcodes.length === 0) return;

    const headers = ['Product Code', 'Product Name', 'Product Type', 'Category', 'Unit Price', 'Description'];
    const csvContent = [
      headers.join(','),
      ...generatedBarcodes.map(barcode => [
        barcode.barcode_number,
        `${barcode.asset_type} - ${barcode.barcode_number}`,
        'Stock',
        barcode.asset_type,
        '0.00',
        `${barcode.asset_type} with barcode ${barcode.barcode_number}`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sage_import_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (generatedBarcodes.length === 0) return;

    const jsonData = {
      export_date: new Date().toISOString(),
      organization_id: profile.organization_id,
      asset_type: assetConfig?.assetType || 'cylinder',
      total_items: generatedBarcodes.length,
      items: generatedBarcodes.map(barcode => ({
        barcode_number: barcode.barcode_number,
        serial_number: barcode.serial_number,
        asset_type: barcode.asset_type,
        customer_name: barcode.customer_name,
        status: barcode.status,
        created_at: barcode.created_at,
        barcode_format: barcode.barcode_format
      }))
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Excel Upload Functions
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadProcessing(true);
    setError('');

    try {
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      let data = [];

      if (isExcel) {
        // Handle Excel files
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            
            processUploadedData(data);
          } catch (error) {
            logger.error('Error processing Excel file:', error);
            setError(`Error processing Excel file: ${error.message}`);
            setUploadProcessing(false);
          }
        };
        reader.readAsBinaryString(file);
      } else {
        // Handle CSV files
        const text = await file.text();
        const lines = text.split('\n');
        
        if (lines.length < 2) {
          throw new Error('File must have at least a header row and one data row');
        }

        // Parse CSV
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = parseCSVLine(line);
          const record = {};
          
          headers.forEach((header, index) => {
            record[header] = values[index] || '';
          });
          
          data.push(record);
        }
        
        processUploadedData(data);
      }

    } catch (error) {
      logger.error('Error processing file:', error);
      setError(`Error processing file: ${error.message}`);
      setUploadProcessing(false);
    }
  };

  const processUploadedData = (data) => {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data found in file');
      }

      setUploadedData(data);
      
      // Identify customers without barcodes - more comprehensive detection for QuickBooks
      const withoutBarcodes = data.filter(customer => {
        // Check common barcode/customer number fields
        const barcodeFields = [
          'barcode', 'customer_barcode', 'customer_number', 'CustomerListID',
          'Customer Number', 'Customer ID', 'Barcode', 'Customer Barcode',
          'ID', 'Number', 'Code', 'customer_id', 'customerId'
        ];
        
        const hasBarcode = barcodeFields.some(field => {
          const value = customer[field];
          return value && value.toString().trim() !== '';
        });
        
        return !hasBarcode;
      });

      setCustomersWithoutBarcodes(withoutBarcodes);
      setSuccess(`File uploaded! Found ${data.length} customers, ${withoutBarcodes.length} need barcodes.`);
      setUploadProcessing(false);

    } catch (error) {
      logger.error('Error processing uploaded data:', error);
      setError(`Error processing data: ${error.message}`);
      setUploadProcessing(false);
    }
  };

  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim().replace(/"/g, ''));
    return values;
  };

  const generateBarcodesFromUpload = async () => {
    if (customersWithoutBarcodes.length === 0) {
      setError('No customers without barcodes found');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const barcodes = [];
      const startNum = parseInt(bulkForm.startNumber);
      
      for (let i = 0; i < customersWithoutBarcodes.length; i++) {
        const customer = customersWithoutBarcodes[i];
        const barcodeNumber = generateBarcodeNumber(bulkForm.prefix, startNum + i, bulkForm.format);
        const serialNumber = bulkForm.includeSerial ? generateSerialNumber(bulkForm.prefix, startNum + i) : null;
        
        const barcode = {
          barcode_number: barcodeNumber,
          serial_number: serialNumber,
          asset_type: assetConfig?.assetType || 'cylinder',
          customer_name: customer.name || customer.customer_name || customer.Customer || '',
          organization_id: profile.organization_id,
          status: 'available',
          created_by: profile.id,
          barcode_format: bulkForm.format,
          has_qr: bulkForm.includeQR,
          // Store original customer data for reference
          original_customer_data: JSON.stringify(customer)
        };
        
        barcodes.push(barcode);
      }

      // Insert into database in batches
      const batchSize = 100;
      const insertedBarcodes = [];
      
      for (let i = 0; i < barcodes.length; i += batchSize) {
        const batch = barcodes.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('bottles')
          .insert(batch)
          .select();

        if (error) throw error;
        insertedBarcodes.push(...data);
      }

      setGeneratedBarcodes(insertedBarcodes);
      setSuccess(`Successfully generated ${insertedBarcodes.length} barcodes for customers without them!`);
      loadStats();

      // Update the customers without barcodes list
      setCustomersWithoutBarcodes([]);

    } catch (error) {
      logger.error('Error generating barcodes from upload:', error);
      setError(`Error generating barcodes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadUpdatedCustomerList = () => {
    if (uploadedData.length === 0 || generatedBarcodes.length === 0) return;

    // Create updated customer list with new barcodes
    const updatedData = uploadedData.map(customer => {
      const hasBarcode = customer.barcode || customer.customer_barcode || customer.customer_number || customer.CustomerListID;
      
      if (!hasBarcode || hasBarcode.trim() === '') {
        // Find matching generated barcode
        const matchingBarcode = generatedBarcodes.find(barcode => {
          const originalData = JSON.parse(barcode.original_customer_data || '{}');
          return originalData.name === customer.name || 
                 originalData.customer_name === customer.customer_name ||
                 originalData.Customer === customer.Customer;
        });

        if (matchingBarcode) {
          return {
            ...customer,
            customer_number: matchingBarcode.barcode_number,
            barcode: `*%${matchingBarcode.barcode_number}*`,
            customer_barcode: `*%${matchingBarcode.barcode_number}*`,
            CustomerListID: matchingBarcode.barcode_number,
            serial_number: matchingBarcode.serial_number
          };
        }
      }
      
      return customer;
    });

    // Convert to CSV
    const headers = Object.keys(updatedData[0] || {});
    const csvContent = [
      headers.join(','),
      ...updatedData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return value.toString().includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `updated_customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderSingleGeneration = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Generate Individual Barcodes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate barcodes one at a time with custom settings.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Prefix"
              value={singleForm.prefix}
              onChange={(e) => setSingleForm({ ...singleForm, prefix: e.target.value.toUpperCase() })}
              placeholder="CYL"
              helperText="Prefix for barcode numbers"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Starting Number"
              type="number"
              value={singleForm.startNumber}
              onChange={(e) => setSingleForm({ ...singleForm, startNumber: e.target.value })}
              helperText="Starting sequence number"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={singleForm.quantity}
              onChange={(e) => setSingleForm({ ...singleForm, quantity: e.target.value })}
              inputProps={{ min: 1, max: 100 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Customer Name (Optional)"
              value={singleForm.customerName}
              onChange={(e) => setSingleForm({ ...singleForm, customerName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={singleForm.useCustomFormat}
                  onChange={(e) => setSingleForm({ ...singleForm, useCustomFormat: e.target.checked })}
                />
              }
              label="Use Custom Format"
            />
          </Grid>
          {singleForm.useCustomFormat && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Custom Format"
                value={singleForm.customFormat}
                onChange={(e) => setSingleForm({ ...singleForm, customFormat: e.target.value })}
                placeholder="CUSTOM-{n}-2024"
                helperText="Use {n} for sequential number"
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSingleGenerate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <BarcodeIcon />}
            >
              Generate Barcodes
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderBulkGeneration = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Bulk Barcode Generation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate large quantities of barcodes efficiently.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Prefix"
              value={bulkForm.prefix}
              onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={bulkForm.quantity}
              onChange={(e) => setBulkForm({ ...bulkForm, quantity: e.target.value })}
              inputProps={{ min: 1, max: 10000 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Starting Number"
              type="number"
              value={bulkForm.startNumber}
              onChange={(e) => setBulkForm({ ...bulkForm, startNumber: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={bulkForm.format}
                onChange={(e) => setBulkForm({ ...bulkForm, format: e.target.value })}
                label="Format"
              >
                <MenuItem value="standard">Standard (PREFIX000001)</MenuItem>
                <MenuItem value="sequential">Sequential (PREFIX-000001)</MenuItem>
                <MenuItem value="timestamp">Timestamp (PREFIX240801001)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Customer Name (Optional)"
              value={bulkForm.customerName}
              onChange={(e) => setBulkForm({ ...bulkForm, customerName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={bulkForm.includeSerial}
                  onChange={(e) => setBulkForm({ ...bulkForm, includeSerial: e.target.checked })}
                />
              }
              label="Include Serial Numbers"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={bulkForm.includeQR}
                  onChange={(e) => setBulkForm({ ...bulkForm, includeQR: e.target.checked })}
                />
              }
              label="Include QR Codes"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              onClick={handleBulkGenerate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <BarcodeIcon />}
            >
              Generate Bulk Barcodes
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderExcelUpload = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📂 Import File & Generate Missing Barcodes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload your customer Excel/CSV file. We'll detect customers without barcodes and generate them automatically.
        </Typography>
        
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            🎯 3-Step Process: Import → Generate → Export
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Step 1:</strong> Import your customer Excel/CSV file (like "Sask.xls")
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Step 2:</strong> We detect customers missing barcodes and generate them automatically
          </Typography>
          <Typography variant="body2">
            <strong>Step 3:</strong> Export updated file or specific format (IIF for QuickBooks Desktop + Zed Axis)
          </Typography>
        </Alert>

        {/* Workflow Status */}
        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Workflow Status:
            </Typography>
            <Stack direction="row" spacing={3} alignItems="center">
              <Chip 
                label={uploadedFile ? "✅ File Imported" : "📂 Import File"} 
                color={uploadedFile ? "success" : "default"}
                variant={uploadedFile ? "filled" : "outlined"}
              />
              <Typography variant="body2">→</Typography>
              <Chip 
                label={customersWithoutBarcodes.length > 0 ? `🔢 ${customersWithoutBarcodes.length} Ready to Generate` : "🔢 Generate Barcodes"} 
                color={customersWithoutBarcodes.length > 0 ? "warning" : "default"}
                variant={customersWithoutBarcodes.length > 0 ? "filled" : "outlined"}
              />
              <Typography variant="body2">→</Typography>
              <Chip 
                label={generatedBarcodes.length > 0 ? `📤 ${generatedBarcodes.length} Ready to Export` : "📤 Export Data"} 
                color={generatedBarcodes.length > 0 ? "info" : "default"}
                variant={generatedBarcodes.length > 0 ? "filled" : "outlined"}
              />
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* File Upload Section */}
          <Grid item xs={12}>
            <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 3, textAlign: 'center' }}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload"
                disabled={uploadProcessing}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={uploadProcessing ? <CircularProgress size={20} /> : <UploadIcon />}
                  disabled={uploadProcessing}
                  size="large"
                  color="primary"
                  sx={{ py: 2, px: 4, fontSize: '1.1rem' }}
                >
                  {uploadProcessing ? 'Processing File...' : '📂 STEP 1: Import Customer File'}
                </Button>
              </label>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Supports CSV, Excel (.xlsx, .xls) files - Perfect for QuickBooks Desktop exports
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                <strong>Detects these barcode columns:</strong> Customer Number, Customer ID, CustomerListID, Barcode, Customer Barcode, ID, Number, Code
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <strong>Customer name columns:</strong> Customer, Customer Name, Name, Company Name
              </Typography>
            </Box>
          </Grid>

          {/* File Analysis Results */}
          {uploadedFile && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    File Analysis Results
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h4" color="primary">
                        {uploadedData.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Customers
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h4" color="success.main">
                        {uploadedData.length - customersWithoutBarcodes.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Have Barcodes
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h4" color="warning.main">
                        {customersWithoutBarcodes.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Need Barcodes
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h4" color="info.main">
                        {uploadedFile.name.split('.').pop().toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        File Type
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Customers Without Barcodes Preview */}
          {customersWithoutBarcodes.length > 0 && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Customers Needing Barcodes ({customersWithoutBarcodes.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Customer Name</TableCell>
                          <TableCell>Current Barcode</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customersWithoutBarcodes.slice(0, 10).map((customer, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {customer.name || customer.customer_name || customer.Customer || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Chip label="Missing" size="small" color="warning" />
                            </TableCell>
                            <TableCell>
                              <Chip label="Ready to Generate" size="small" color="info" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {customersWithoutBarcodes.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Showing first 10 of {customersWithoutBarcodes.length} customers
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Generation Settings */}
          {customersWithoutBarcodes.length > 0 && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Barcode Generation Settings
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Prefix"
                        value={bulkForm.prefix}
                        onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Starting Number"
                        type="number"
                        value={bulkForm.startNumber}
                        onChange={(e) => setBulkForm({ ...bulkForm, startNumber: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Format</InputLabel>
                        <Select
                          value={bulkForm.format}
                          onChange={(e) => setBulkForm({ ...bulkForm, format: e.target.value })}
                          label="Format"
                        >
                          <MenuItem value="standard">Standard (PREFIX000001)</MenuItem>
                          <MenuItem value="sequential">Sequential (PREFIX-000001)</MenuItem>
                          <MenuItem value="timestamp">Timestamp (PREFIX240801001)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={bulkForm.includeSerial}
                            onChange={(e) => setBulkForm({ ...bulkForm, includeSerial: e.target.checked })}
                          />
                        }
                        label="Include Serial Numbers"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Action Buttons */}
          {customersWithoutBarcodes.length > 0 && (
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={generateBarcodesFromUpload}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <ViewModule />}
                  color="success"
                  sx={{ py: 1.5, px: 3, fontSize: '1.1rem' }}
                >
                  {loading ? 'Generating...' : `🔢 STEP 2: Generate ${customersWithoutBarcodes.length} Missing Barcodes`}
                </Button>
                {generatedBarcodes.length > 0 && (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={downloadUpdatedCustomerList}
                    startIcon={<DownloadIcon />}
                    color="info"
                    sx={{ py: 1.5, px: 3, fontSize: '1.1rem' }}
                  >
                    📤 STEP 3: Download Updated File
                  </Button>
                )}
              </Stack>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );

  const renderResults = () => (
    generatedBarcodes.length > 0 && (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              📤 STEP 3: Export Your Data ({generatedBarcodes.length} barcodes generated)
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExportCSV}
              >
                CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleExportQuickBooks}
              >
                QuickBooks Desktop
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleExportXero}
              >
                Xero
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleExportNetSuite}
              >
                NetSuite
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleExportSage}
              >
                Sage
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleExportJSON}
              >
                JSON/API
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PrintIcon />}
                onClick={() => setPreviewDialog(true)}
              >
                Print Labels
              </Button>
            </Stack>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Barcode</TableCell>
                  <TableCell>Serial</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {generatedBarcodes.slice(0, 50).map((barcode, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontFamily="monospace">
                          {barcode.barcode_number}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(barcode.barcode_number)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {barcode.serial_number || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={barcode.asset_type} size="small" />
                    </TableCell>
                    <TableCell>{barcode.customer_name || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(`${barcode.barcode_number}\t${barcode.serial_number || ''}`)}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {generatedBarcodes.length > 50 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Showing first 50 results. Export to see all {generatedBarcodes.length} barcodes.
            </Typography>
          )}
        </CardContent>
      </Card>
    )
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Barcode Generator
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Generate barcodes for your {assetConfig?.assetTypePlural || 'assets'} to replace Excel workflows.
        Integrates with QuickBooks and supports bulk operations.
      </Typography>

      {/* QuickBooks Desktop Setup Instructions */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🎯 QuickBooks Desktop + Zed Axis Setup Instructions
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Step 1:</strong> Click "📂 Import & Generate" tab below, then import your customer Excel file (like "Sask.xls")
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Step 2:</strong> System automatically detects customers without barcodes and generates them
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Step 3:</strong> Download updated file or export as IIF format for QuickBooks Desktop
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Step 4:</strong> Import IIF file to QuickBooks Desktop using Zed Axis (or import CSV manually)
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
          ✅ This completely replaces your manual Excel barcode generation process!
        </Typography>
      </Alert>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Generated
              </Typography>
              <Typography variant="h4">
                {stats.totalGenerated.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Customers with Barcodes
              </Typography>
              <Typography variant="h4">
                {stats.customersWithBarcodes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Last Generated
              </Typography>
              <Typography variant="h6">
                {stats.lastGenerated 
                  ? new Date(stats.lastGenerated).toLocaleDateString()
                  : 'Never'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Single Generation" />
        <Tab label="Bulk Generation" />
        <Tab label="📂 Import & Generate" />
      </Tabs>

      {activeTab === 0 && renderSingleGeneration()}
      {activeTab === 1 && renderBulkGeneration()}
      {activeTab === 2 && renderExcelUpload()}
      
      {renderResults()}
    </Box>
  );
}