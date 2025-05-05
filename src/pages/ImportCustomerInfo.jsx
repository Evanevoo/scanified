import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase/client';

export default function ImportCustomerInfo() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setPreview([]);
    setResult(null);
    setError(null);
    // Parse file for preview
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      setPreview(json);
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
      // Aggressively normalize CustomerListID and map fields
      const mapped = preview.map(row => ({
        CustomerListID: row.CustomerListID || row["CustomerListID"] || row["Customer ID"] || row["Customer Number"],
        name: row.CustomerName || row["CustomerName"] || row["Customer Name"],
        bill_city: row.BillCity || row["BillCity"] || row["Bill City"],
        bill_state: row.BillState || row["BillState"] || row["Bill State"],
        bill_postal_code: row.BillPostalCode || row["BillPostalCode"] || row["Bill Postal Code"],
        phone: row.Phone || row["Phone"] || row["Contact"] || row["Contact Details"],
        barcode: row["Customer barcode"] || row["Customer Barcode"] || row["Barcode"]
      }));
      // Fetch all existing unique values from the database (handle pagination)
      let allExistingRows = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: pageRows, error: fetchError } = await supabase
          .from('customers')
          .select('CustomerListID, customer_number')
          .range(from, from + pageSize - 1);
        if (fetchError) throw fetchError;
        if (!pageRows || pageRows.length === 0) break;
        allExistingRows = allExistingRows.concat(pageRows);
        if (pageRows.length < pageSize) break;
        from += pageSize;
      }
      const existingCustomerListIDs = new Set((allExistingRows || []).map(r => r.CustomerListID?.toLowerCase()));
      const existingCustomerNumbers = new Set((allExistingRows || []).map(r => r.customer_number));
      console.log('Existing CustomerListIDs in DB:', Array.from(existingCustomerListIDs));
      const seenCustomerListIDs = new Set();
      const duplicateInBatch = [];
      const uniqueRows = mapped.filter(row => {
        const id = row.CustomerListID && typeof row.CustomerListID === 'string' ? row.CustomerListID.trim().toLowerCase() : '';
        if (
          !id ||
          existingCustomerListIDs.has(id) ||
          seenCustomerListIDs.has(id) ||
          (row.customer_number && existingCustomerNumbers.has(row.customer_number))
        ) {
          if (seenCustomerListIDs.has(id)) duplicateInBatch.push(id);
          return false;
        }
        seenCustomerListIDs.add(id);
        return true;
      });
      console.log('CustomerListIDs to insert:', uniqueRows.map(r => r.CustomerListID));
      console.log('Duplicate CustomerListIDs in batch:', duplicateInBatch);
      const { error: insertError, count } = await supabase.from('customers').insert(uniqueRows, { count: 'exact' });
      if (insertError) throw insertError;
      setResult({ success: true, imported: uniqueRows.length, errors: mapped.length - uniqueRows.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Import Customer Info</h2>
      <form onSubmit={handleImport} className="mb-6 flex gap-2 items-end">
        <input type="file" accept=".pdf,.csv,.xlsx,.xls,.txt" onChange={handleFileChange} className="border p-2 rounded" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={!file || !preview.length || loading}>{loading ? 'Importing...' : 'Import'}</button>
      </form>
      {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-4">Error: {error}</div>}
      {preview.length > 0 && (
        <div className="mb-6">
          <div className="font-semibold mb-2">Preview ({preview.length} rows):</div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map(key => <th key={key} className="border px-2 py-1 text-xs">{key}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => <td key={j} className="border px-2 py-1 text-xs">{val}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 5 && <div className="text-xs text-gray-500 mt-1">Showing first 5 rows only.</div>}
          </div>
        </div>
      )}
      {result && (
        <div className="bg-green-100 text-green-800 p-4 rounded">
          Import finished! Imported: {result.imported}, Errors: {result.errors}
        </div>
      )}
    </div>
  );
} 