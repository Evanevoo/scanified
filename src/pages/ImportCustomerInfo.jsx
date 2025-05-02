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
      // Map fields to match your Supabase customers table
      const mapped = preview.map(row => ({
        customer_number: row.customer_number || row.CustomerNumber || row["Customer Number"],
        name: row.name || row.Name,
        contact_details: row.contact_details || row.Contact || row["Contact Details"] || row["Contact"],
      }));
      // Filter out rows missing required fields
      const validRows = mapped.filter(r => r.customer_number && r.name);
      const { error: insertError, count } = await supabase.from('customers').insert(validRows, { count: 'exact' });
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