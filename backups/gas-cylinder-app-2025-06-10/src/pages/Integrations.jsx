import React, { useState } from 'react';
import { supabase } from '../supabase/client';
import { Box, Paper, Typography, Button, TextField, Alert, Snackbar } from '@mui/material';
import { saveAs } from 'file-saver';
import BottleManagement from './BottleManagement';

const TXT_COLUMNS = [
  "Customer ID",
  "Customer Name",
  "Parent Customer ID",
  "Servicing Location",
  "Billing Name",
  "Billing Address 1",
  "Billing Address 2",
  "Billing City",
  "Billing State",
  "Billing Zip",
  "Billing Country",
  "Shipping Address Line1",
  "Shipping Address Line2",
  "Shipping Address Line3",
  "Shipping City",
  "Shipping State",
  "Shipping Zip",
  "Shipping Country",
  "Payment Terms",
  "Tax Region",
  "Fax",
  "RentalBillEmailTo",
  "Salesman"
];

export default function Integrations() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [importedCustomers, setImportedCustomers] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split('\t');
      const data = lines.slice(1).map(line => {
        const values = line.split('\t');
        const row = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index] ? values[index].trim() : '';
        });
        return row;
      }).filter(row => Object.values(row).some(val => val !== ''));
      
      setPreview(data.slice(0, 10));
    };
    reader.readAsText(file);
    setFile(file);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split('\t');
        const data = lines.slice(1).map(line => {
          const values = line.split('\t');
          const row = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index] ? values[index].trim() : '';
          });
          return row;
        }).filter(row => Object.values(row).some(val => val !== ''));

        const imported = [];
        for (const row of data) {
          try {
            const { data: customer, error } = await supabase
              .from('customers')
              .insert({
                CustomerListID: row['Customer ID'] || `80000448-${Date.now()}S`,
                name: row['Customer Name'],
                contact_details: row['Billing Address 1'],
                address2: row['Billing Address 2'],
                city: row['Billing City'],
                postal_code: row['Billing Zip'],
                phone: row['Fax']
              })
              .select()
              .single();

            if (error) throw error;
            imported.push(customer);
          } catch (err) {
            console.error('Error importing customer:', err);
          }
        }

        setImportedCustomers(imported);
        setSnackbar(`Successfully imported ${imported.length} customers`);
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (error) {
      setSnackbar(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Integrations</Typography>
        
        <Box mb={4}>
          <Typography variant="h5" fontWeight={800} color="primary" mb={2}>Customer Import</Typography>
          <Typography variant="body1" mb={3}>
            Import customers from a tab-separated text file. The file should have the following columns:
          </Typography>
          <Box mb={3}>
            <TextField
              type="file"
              accept=".txt,.tsv"
              onChange={handleFileChange}
              fullWidth
              variant="outlined"
            />
          </Box>
          {preview.length > 0 && (
            <Box mt={4}>
              <Typography variant="h6" fontWeight={800} color="primary" mb={4}>Preview</Typography>
              <Paper variant="outlined" sx={{ overflowX: 'auto', borderRadius: 3, border: '1px solid #e3e7ef', boxShadow: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                  <thead style={{ background: '#fafbfc' }}>
                    <tr>
                      {TXT_COLUMNS.map(field => (
                        <th key={field} style={{ fontWeight: 800, padding: 8, borderBottom: '1px solid #eee' }}>{field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 100).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f3f3' }}>
                        {TXT_COLUMNS.map(field => (
                          <td key={field} style={{ padding: 8 }}>{row[field] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 100 && (
                  <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                    Showing first 100 rows of {preview.length} total rows.
                  </Typography>
                )}
              </Paper>
              <Button onClick={handleImport} disabled={loading} variant="contained" color="primary" sx={{ mt: 3, borderRadius: 999, fontWeight: 700, px: 4 }}>Import</Button>
            </Box>
          )}
          {importedCustomers.length > 0 && (
            <Box mt={4}>
              <Typography variant="h6" color="primary">Recently Imported Customers</Typography>
              <ul>
                {importedCustomers.map((c, i) => (
                  <li key={i}>{c.CustomerListID} - {c.name}</li>
                ))}
              </ul>
            </Box>
          )}
        </Box>
        <Box mt={4}>
          <Typography variant="h6" fontWeight={800} color="primary" mb={2}>Bottle Management</Typography>
          <BottleManagement />
        </Box>
        <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}><Alert severity="success">{snackbar}</Alert></Snackbar>
      </Paper>
    </Box>
  );
} 