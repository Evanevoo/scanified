import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '../supabase/client';

const SALES_ORDER_FIELDS = [
  'customer_id',
  'customer_name',
  'order_date',
  'gas_type',
  'sales_order_number',
  'shipped_bottles',
  'returned_bottles',
];

export default function ImportSalesOrderFile() {
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
      const data = evt.target.result;
      // Always treat as no header, map by index
      let parsed = Papa.parse(data, { delimiter: '\t', skipEmptyLines: true, header: false });
      let rows = parsed.data;
      rows = rows.filter(row => row.length >= 7 && row[0]);
      const mapped = rows.map(row => {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        let order_date = null;
        if (row[2] && row[2].includes('/')) {
          const [day, month, year] = row[2].split('/');
          if (year && month && day) {
            order_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } else {
          order_date = row[2];
        }
        return {
          customer_id: row[0],
          customer_name: row[1],
          order_date,
          gas_type: row[3],
          sales_order_number: row[4],
          shipped_bottles: row[5],
          returned_bottles: row[6],
        };
      });
      setPreview(mapped);
    };
    reader.readAsText(file);
  };

  const handleImport = async e => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      if (!preview.length) throw new Error('No data to import.');
      // Convert dates for all rows before insert
      const validRows = preview
        .filter(row => row.customer_id && row.sales_order_number)
        .map(row => {
          let order_date = row.order_date;
          if (order_date && order_date.includes('/')) {
            const [day, month, year] = order_date.split('/');
            if (year && month && day) {
              order_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          return { ...row, order_date };
        });
      if (!validRows.length) throw new Error('No valid sales orders found.');
      const { error: insertError, count } = await supabase.from('sales_orders').insert(validRows, { count: 'exact' });
      if (insertError) throw insertError;
      setResult({ success: true, imported: validRows.length, errors: preview.length - validRows.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-blue-900 tracking-tight">Import Sales Order File</h2>
        <button
          onClick={() => navigate(-1)}
          className="bg-gradient-to-r from-gray-400 to-gray-300 text-white px-6 py-2 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-400 font-semibold transition"
        >
          Back
        </button>
      </div>
      <form onSubmit={handleImport} className="mb-6 flex gap-2 items-end">
        <input type="file" accept=".csv,.xlsx,.xls,.txt,text/csv,text/plain" onChange={handleFileChange} className="border p-2 rounded w-full" />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 font-semibold transition" disabled={!file || !preview.length || loading}>{loading ? 'Importing...' : 'Import'}</button>
      </form>
      {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-4">Error: {error}</div>}
      {preview.length > 0 && (
        <div className="mb-6">
          <div className="font-semibold mb-2">Preview ({preview.length} rows):</div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  {SALES_ORDER_FIELDS.map(key => <th key={key} className="border px-2 py-1 text-xs uppercase">{key.replace(/_/g, ' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {SALES_ORDER_FIELDS.map(key => <td key={key} className="border px-2 py-1 text-xs">{row[key] || ''}</td>)}
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