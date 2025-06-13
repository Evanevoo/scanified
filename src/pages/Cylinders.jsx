import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Button, Input } from '@mui/material';

export default function Cylinders() {
  const [gasTypes, setGasTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const handleImportFile = e => {
    setImportError(null);
    setImportResult(null);
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv' || ext === 'txt') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setImportPreview(results.data);
        },
        error: (err) => setImportError(err.message)
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = evt => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        setImportPreview(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError('Unsupported file type.');
    }
  };

  const handleImportSubmit = async () => {
    setImportError(null);
    setImportResult(null);
    if (!importPreview.length) return;
    // Map columns to match DB
    const mapped = importPreview.map(row => ({
      category: row['Category'] || '',
      group_name: row['Group'] || '',
      type: row['Type'] || '',
      product_code: row['Product Code'] || '',
      description: row['Description'] || '',
      in_house_total: Number(row['In-House Total']) || 0,
      with_customer_total: Number(row['With Customer Total']) || 0,
      lost_total: Number(row['Lost Total']) || 0,
      total: Number(row['Total']) || 0,
      dock_stock: String(row['Dock Stock'] || '0%'),
    }));
    // Deduplicate by product_code
    const deduped = Array.from(
      mapped.reduce((acc, item) => acc.set(item.product_code, item), new Map()).values()
    );
    // Upsert into gas_types table
    const { error } = await supabase.from('gas_types').upsert(deduped, { onConflict: ['product_code'] });
    if (error) setImportError(error.message);
    else setImportResult('Gas types imported!');
    setImportPreview([]);
    // Refresh list
    const { data } = await supabase.from('gas_types').select('*');
    setGasTypes(data || []);
  };

  useEffect(() => {
    const fetchGasTypes = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('gas_types').select('*');
      if (!error && data) setGasTypes(data);
      setLoading(false);
    };
    fetchGasTypes();
  }, []);

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

  return (
    <Box p={4}>
      <Typography variant="h4" fontWeight={700} mb={3}>All Gas Types</Typography>
      <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" mb={1}>Import Gas Types</Typography>
        <Input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleImportFile} />
        {importError && <Typography color="error" mt={1}>{importError}</Typography>}
        {importPreview.length > 0 && (
          <Box mt={2}>
            <Typography fontWeight={700}>Preview ({importPreview.length} rows):</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Product Code</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>In-House Total</TableCell>
                    <TableCell>With Customer Total</TableCell>
                    <TableCell>Lost Total</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Dock Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importPreview.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row['Category']}</TableCell>
                      <TableCell>{row['Group']}</TableCell>
                      <TableCell>{row['Type']}</TableCell>
                      <TableCell>{row['Product Code']}</TableCell>
                      <TableCell>{row['Description']}</TableCell>
                      <TableCell>{row['In-House Total']}</TableCell>
                      <TableCell>{row['With Customer Total']}</TableCell>
                      <TableCell>{row['Lost Total']}</TableCell>
                      <TableCell>{row['Total']}</TableCell>
                      <TableCell>{row['Dock Stock']}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button onClick={handleImportSubmit} variant="contained" color="primary" sx={{ mt: 2 }}>Import All</Button>
          </Box>
        )}
        {importResult && <Typography color="success.main" mt={1}>{importResult}</Typography>}
      </Paper>
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Group</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Product Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>In-House Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>With Customer Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lost Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Dock Stock</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gasTypes.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.group_name}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.product_code}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.in_house_total}</TableCell>
                  <TableCell>{row.with_customer_total}</TableCell>
                  <TableCell>{row.lost_total}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell>{row.dock_stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
} 