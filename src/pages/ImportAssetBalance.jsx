import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Import Asset Balance</h2>
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
                {preview.slice(0, MAX_PREVIEW_ROWS).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => <td key={j} className="border px-2 py-1 text-xs">{val}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > MAX_PREVIEW_ROWS && <div className="text-xs text-gray-500 mt-1">Showing first {MAX_PREVIEW_ROWS} rows only.</div>}
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