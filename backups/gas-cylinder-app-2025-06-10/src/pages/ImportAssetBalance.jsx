import React, { useState } from 'react';
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

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setPreview([]);
    setResult(null);
    setError(null);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
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
      // Map fields and assign to customer
      const mapped = preview.map(row => ({
        assigned_customer: row.CustomerListID || row['CustomerListID'] || row['Customer ID'] || '',
        serial_number: row['Serial Number'] || row['Serial'] || '',
        product_code: row['Product Code'] || '',
        description: row['Description'] || '',
        gas_type: row['Gas Type'] || '',
        rental_start_date: row['Assigned Date'] || row['Rental Start Date'] || null,
      }));
      // Filter out rows without a customer or product_code/serial_number
      const validRows = mapped.filter(row =>
        row.assigned_customer && (row.product_code || row.serial_number)
      );
      if (!validRows.length) throw new Error('No valid asset rows found.');
      // Upsert by product_code+serial_number or just product_code if serial_number is missing
      const { error: upsertError, count } = await supabase
        .from('cylinders')
        .upsert(validRows, { onConflict: ['product_code', 'serial_number'] });
      if (upsertError) throw upsertError;
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
                {preview.slice(0, 5).map((row, i) => (
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