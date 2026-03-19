import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, IconButton, Alert, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Card, CardContent, Stack, Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase/client';

export default function ImportAssetBalance() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const MAX_PREVIEW_ROWS = 5;
  const MAX_FILE_ROWS = 1000;

  useEffect(() => {
    if (loading) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Import in progress. Are you sure you want to leave?';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [loading]);

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setPreview([]);
    setResult(null);
    setError(null);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        if (json.length > MAX_FILE_ROWS) {
          setError(`File has too many rows (${json.length}). Please upload a file with less than ${MAX_FILE_ROWS} rows.`);
          setPreview([]);
          return;
        }
        setPreview(json);
      } catch (err) {
        setError('Error parsing file: ' + err.message);
        setPreview([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async e => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      if (!preview.length) throw new Error('No data to import.');
      
      // Map fields for asset inventory data
      const mapped = preview.map(row => {
        const inHouse = parseInt(row['In-House Total'] || row['In-HouseTotal'] || row['in_house_total'] || 0) || 0;
        const withCustomer = parseInt(row['With Customer Total'] || row['WithCustomerTotal'] || row['with_customer_total'] || 0) || 0;
        const lost = parseInt(row['Lost Total'] || row['LostTotal'] || row['lost_total'] || 0) || 0;
        let status = 'available';
        if (withCustomer > 0) status = 'rented';
        else if (lost > 0) status = 'lost';
        return {
          barcode_number: '', // Assets don't have barcodes - use empty string
          serial_number: '', // Assets don't have serial numbers - use empty string
          category: row['Category'] || row['category'] || '',
          group_name: row['Group'] || row['group'] || '',
          type: row['Type'] || row['type'] || '',
          product_code: row['Product Code'] || row['ProductCode'] || row['product_code'] || '',
          description: row['Description'] || row['description'] || '',
          in_house_total: inHouse,
          with_customer_total: withCustomer,
          lost_total: lost,
          total: parseInt(row['Total'] || row['total'] || 0) || 0,
          dock_stock: row['Dock Stock'] || row['DockStock'] || row['dock_stock'] || '',
          gas_type: row['Gas Type'] || row['GasType'] || row['gas_type'] || 'Unknown',
          location: row['Location'] || row['location'] || '',
          status
        };
      });
      
      // Filter out rows without essential asset information
      const validRows = mapped.filter(row =>
        (row.product_code && row.product_code.trim()) || 
        (row.description && row.description.trim()) ||
        (row.type && row.type.trim())
      );
      
      if (!validRows.length) throw new Error('No valid asset rows found. Each row must have at least a Product Code, Description, or Type.');
      
      // Insert assets into bottles table
      const { error: insertError, count } = await supabase
        .from('bottles')
        .insert(validRows);
        
      if (insertError) throw insertError;
      
      setResult({ success: true, imported: validRows.length, errors: preview.length - validRows.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
            Import Asset Balance
          </Typography>
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Import finished! Imported: {result.imported}, Errors: {result.errors}
        </Alert>
      )}

      {/* File Upload Card */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Upload Asset Balance File
          </Typography>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              disabled={loading}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
            >
              Choose File
              <input
                type="file"
                accept=".pdf,.csv,.xlsx,.xls,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </Button>
            
            {file && (
              <Chip 
                label={file.name} 
                color="primary" 
                variant="outlined" 
                onDelete={() => {
                  setFile(null);
                  setPreview([]);
                  setResult(null);
                  setError(null);
                }}
              />
            )}
            
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!file || !preview.length || loading}
              startIcon={loading ? <LinearProgress size={16} /> : <CheckCircleIcon />}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
            >
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {preview.length > 0 && (
        <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Preview
              </Typography>
              <Chip 
                label={`${preview.length} rows`} 
                color="primary" 
                variant="outlined" 
                size="small"
              />
            </Box>
            
            <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    {Object.keys(preview[0]).map(key => (
                      <TableCell key={key} sx={{ fontWeight: 600 }}>
                        {key}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.slice(0, MAX_PREVIEW_ROWS).map((row, i) => (
                    <TableRow key={i} hover>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j}>
                          {val || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {preview.length > MAX_PREVIEW_ROWS && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing first {MAX_PREVIEW_ROWS} rows only.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}