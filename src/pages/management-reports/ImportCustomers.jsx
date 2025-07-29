import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { supabase } from '../../supabase/client';
import { Box, Paper, Typography, Card, CardContent, Alert } from '@mui/material';
import { TableSkeleton } from '../../components/SmoothLoading';

const REQUIRED_FIELDS = [
  'Customer ID',
  'Customer Name',
];

const APP_FIELDS = [
  'Customer ID',
  'Customer Name',
  'Parent Customer ID',
  'Servicing Location',
  'Billing Name',
  'Billing Address 1',
  'Billing Address 2',
  'Billing City',
  'Billing State',
  'Billing Zip',
  'Billing Country',
  'Shipping Address Line1',
  'Shipping Address Line2',
  'Shipping Address Line3',
  'Shipping City',
  'Shipping State',
  'Shipping Zip',
  'Shipping Country',
  'Payment Terms',
  'Tax Region',
  'Fax',
  'RentalBillEmailTo',
  'Salesman',
  'Customer Barcode',
];

const SAMPLE_FILE_CONTENT = `Customer ID\tCustomer Name\tParent Customer ID\tServicing Location\tBilling Name\tBilling Address 1\tBilling Address 2\tBilling City\tBilling State\tBilling Zip\tBilling Country\tShipping Address Line1\tShipping Address Line2\tShipping Address Line3\tShipping City\tShipping State\tShipping Zip\tShipping Country\tPayment Terms\tTax Region\tFax\tRentalBillEmailTo\tSalesman\tCustomer Barcode\nCUST001\tAcme Corp\t\tNY Warehouse\tAcme Corp\t123 Main St\tSuite 100\tNew York\tNY\t10001\tUSA\t456 Elm St\t\t\tBrooklyn\tNY\t11201\tUSA\tNet 30\tNY\t555-1234\tbilling@acme.com\tJohn Doe\tCUSTBARCODE001\n`;

function downloadSampleFile() {
  const blob = new Blob([SAMPLE_FILE_CONTENT], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'customer_import_sample.tsv';
  a.click();
  URL.revokeObjectURL(url);
}

function autoMapColumns(appFields, fileColumns) {
  // Only exact match (case-insensitive, ignore spaces/underscores)
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fileMap = Object.fromEntries(fileColumns.map(c => [normalize(c), c]));
  const mapping = {};
  appFields.forEach(appField => {
    const norm = normalize(appField);
    if (fileMap[norm]) {
      mapping[appField] = fileMap[norm];
    }
  });
  return mapping;
}

export default function ImportCustomers() {
  const fileInputRef = useRef();
  const [step, setStep] = useState(1); // 1: upload, 2: map, 3: result
  const [fileColumns, setFileColumns] = useState([]);
  const [fileRows, setFileRows] = useState([]);
  const [autoMapping, setAutoMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [successCount, setSuccessCount] = useState(0);
  const [errorRows, setErrorRows] = useState([]);
  const [existingCustomerIds, setExistingCustomerIds] = useState([]);
  const [newCustomersPreview, setNewCustomersPreview] = useState([]);
  const [addedCustomers, setAddedCustomers] = useState([]);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const handleFileChange = async (e) => {
    setErrors([]);
    setSuccessCount(0);
    setFileColumns([]);
    setFileRows([]);
    setErrorRows([]);
    setExistingCustomerIds([]);
    setNewCustomersPreview([]);
    setAddedCustomers([]);
    setStep(1);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      let rows = text.split('\n').map(line => line.split('\t'));
      if (!rows.length) return;
      let detectedColumns = [];
      let dataRows = rows;
      // Detect if first row is header
      const isHeader = rows[0].every(cell => typeof cell === 'string' && cell.length > 0 && !/^[0-9]+$/.test(cell));
      if (isHeader) {
        detectedColumns = rows[0].map((col, i) => col.trim() || `Column ${i+1}`);
        dataRows = rows.slice(1);
      } else {
        detectedColumns = APP_FIELDS;
      }
      setFileColumns(detectedColumns);
      setFileRows(dataRows);
      // Auto-map columns by name or position
      const mapping = {};
      APP_FIELDS.forEach((f, i) => {
        if (detectedColumns[i]) mapping[f] = detectedColumns[i];
      });
      setAutoMapping(mapping);
      // Check for existing customers in DB
      setCheckingExisting(true);
      const customerIdCol = mapping['Customer ID'];
      const ids = dataRows.map(row => row[detectedColumns.indexOf(customerIdCol)]).filter(Boolean);
      let existingIds = [];
      if (ids.length > 0) {
        const { data, error } = await supabase
          .from('customers')
          .select('CustomerListID')
          .in('CustomerListID', ids);
        if (!error && data) {
          existingIds = data.map(c => c.CustomerListID);
        }
      }
      setExistingCustomerIds(existingIds);
      // Filter preview to only new customers
      const newRows = dataRows.filter(row => !existingIds.includes(row[detectedColumns.indexOf(customerIdCol)]));
      setNewCustomersPreview(newRows);
      setCheckingExisting(false);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setErrors([]);
    setSuccessCount(0);
    setErrorRows([]);
    setAddedCustomers([]);
    const mapping = autoMapping;
    const missing = REQUIRED_FIELDS.filter(f => !mapping[f]);
    if (missing.length > 0) {
      setErrors([`Missing required columns in your file: ${missing.join(', ')}`]);
      return;
    }
    const errors = [];
    const errorRows = [];
    let success = 0;
    const customerIdCol = mapping['Customer ID'];
    const customerNameCol = mapping['Customer Name'];
    // Only import new customers
    const toImport = newCustomersPreview;
    const toUpdate = fileRows.filter(row => existingCustomerIds.includes(row[mapping['Customer ID']]));
    const inserted = [];
    // Insert new customers
    for (let idx = 0; idx < toImport.length; idx++) {
      const row = toImport[idx];
      let rowError = '';
      for (const req of REQUIRED_FIELDS) {
        const col = mapping[req];
        if (!row[col] || row[col].toString().trim() === '') {
          rowError = `Row ${idx + 2}: Missing required field '${req}'`;
          errors.push(rowError);
          errorRows.push({ ...row, __error: rowError });
          continue;
        }
      }
      // Insert into DB
      const insertObj = {
        CustomerListID: row[customerIdCol],
        name: row[customerNameCol],
      };
      // Add other mapped fields if needed
      for (const appField of APP_FIELDS) {
        if (mapping[appField] && !['Customer ID', 'Customer Name', 'Customer Barcode'].includes(appField)) {
          insertObj[appField.replace(/\s+/g, '')] = row[mapping[appField]];
        }
      }
      // Special: map Customer Barcode to barcode and customer_barcode fields
      if (mapping['Customer Barcode'] && row[mapping['Customer Barcode']]) {
        insertObj.barcode = row[mapping['Customer Barcode']];
        insertObj.customer_barcode = row[mapping['Customer Barcode']];
      } else {
        // Fallback: generate barcode from CustomerListID
        insertObj.barcode = `*%${(row[customerIdCol] || '').toLowerCase().replace(/\s+/g, '')}*`;
        insertObj.customer_barcode = insertObj.barcode;
      }
      const { data, error } = await supabase
        .from('customers')
        .insert([insertObj])
        .select();
      if (error) {
        rowError = `Row ${idx + 2}: ${error.message}`;
        errors.push(rowError);
        errorRows.push({ ...row, __error: rowError });
      } else if (data && data.length > 0) {
        inserted.push({
          CustomerListID: data[0].CustomerListID,
          name: data[0].name,
        });
        success++;
      }
    }
    // Update existing customers with new barcode if needed
    for (let idx = 0; idx < toUpdate.length; idx++) {
      const row = toUpdate[idx];
      const customerId = row[mapping['Customer ID']];
      let updateObj = {};
      // Only update barcode and customer_barcode if present and different
      if (mapping['Customer Barcode'] && row[mapping['Customer Barcode']]) {
        updateObj.barcode = row[mapping['Customer Barcode']];
        updateObj.customer_barcode = row[mapping['Customer Barcode']];
      }
      // Optionally update other fields (e.g., name, contact_details) if you want
      // updateObj.name = row[mapping['Customer Name']];
      if (Object.keys(updateObj).length > 0) {
        await supabase
          .from('customers')
          .update(updateObj)
          .eq('CustomerListID', customerId);
      }
    }
    setErrors(errors);
    setSuccessCount(success);
    setErrorRows(errorRows);
    setAddedCustomers(inserted);
    setStep(3);
  };

  function downloadErrorCSV() {
    if (!errorRows.length) return;
    const cols = [...fileColumns, '__error'];
    const csv = [cols.join(',')].concat(
      errorRows.map(row => cols.map(c => '"' + (row[c] || '') + '"').join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, 'import_errors.csv');
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Import Customers</Typography>
        <button
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={downloadSampleFile}
        >
          Download Sample File
        </button>
        {step === 1 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.tsv,.csv,text/tab-separated-values,text/csv"
              className="block mb-4"
              onChange={handleFileChange}
            />
            <div className="text-gray-600 text-sm mt-4">
              Accepted file type: Tab- or comma-delimited text (.txt, .tsv, .csv).<br />
              Your file columns will be automatically mapped by name or position. Required columns: Customer ID, Customer Name.<br />
              <b>Files without headers are supported.</b>
            </div>
          </>
        )}
        {step === 2 && (
          <div className="mb-4">
            {checkingExisting ? (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" color="primary" mb={2}>Checking for existing customers...</Typography>
                  <TableSkeleton rows={5} columns={4} />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Mapping UI */}
                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-900 font-bold rounded">
                  <span className="text-lg">Map your file columns to app fields:</span>
                  <table className="border text-sm mt-2">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">App Field</th>
                        <th className="border px-2 py-1">File Column</th>
                      </tr>
                    </thead>
                    <tbody>
                      {APP_FIELDS.map(appField => (
                        <tr key={appField}>
                          <td className="border px-2 py-1 font-semibold">{appField}</td>
                          <td className="border px-2 py-1">
                            <select
                              value={autoMapping[appField] || ''}
                              onChange={e => {
                                setAutoMapping(m => ({ ...m, [appField]: e.target.value }));
                              }}
                            >
                              <option value="">(Not Mapped)</option>
                              {fileColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Preview Table */}
                <div className="mb-2 font-semibold">Preview (showing {Math.min(newCustomersPreview.length, 5)} of {newCustomersPreview.length} new customers):</div>
                <div className="overflow-x-auto max-h-96">
                  <table className="border text-sm" data-testid="preview-table">
                    <thead>
                      <tr>
                        {fileColumns.map(col => (
                          <th key={col} className="border px-2 py-1">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {newCustomersPreview.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          {fileColumns.map(col => (
                            <td key={col} className="border px-2 py-1">{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {newCustomersPreview.length > 5 && (
                    <div className="text-xs text-gray-500 mt-1">Showing only the first 5 new customers.</div>
                  )}
                </div>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={handleImport}
                >
                  Import
                </button>
              </>
            )}
          </div>
        )}
        {step === 3 && (
          <>
            <div className="mb-2">
              <span className="text-green-700 font-semibold">Successfully added {successCount} new customer(s).</span>
              {errors.length > 0 && <span className="text-red-700 ml-4 font-semibold">{errors.length} row(s) failed.</span>}
            </div>
            {addedCustomers.length > 0 && (
              <div className="mb-4">
                <div className="font-semibold mb-1">Newly Added Customers:</div>
                <table className="border text-sm">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Customer Number</th>
                      <th className="border px-2 py-1">Customer Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedCustomers.map((c, idx) => (
                      <tr key={idx}>
                        <td className="border px-2 py-1">{c.CustomerListID}</td>
                        <td className="border px-2 py-1">{c.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {errors.length > 0 && (
              <div className="mb-2 text-red-700">
                <div>First 10 errors:</div>
                <ul className="list-disc ml-6">
                  {errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                </ul>
                {errors.length > 10 && <div>And {errors.length - 10} more...</div>}
                <button
                  className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  onClick={downloadErrorCSV}
                >
                  Download Failed Rows as CSV
                </button>
              </div>
            )}
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setStep(1)}
            >
              Import Another File
            </button>
          </>
        )}
      </Paper>
    </Box>
  );
} 