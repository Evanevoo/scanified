import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

const colorMap = {
  'blue-600': '#2563eb',
  'emerald-500': '#10b981',
  'purple-600': '#7c3aed',
  'rose-500': '#f43f5e',
  'amber-500': '#f59e42',
};

function generateCustomerId() {
  // Simple unique ID generator (can be replaced with a more robust one)
  return Math.random().toString(36).substr(2, 8).toUpperCase() + '-' + Date.now();
}

// Alias map for auto-mapping CSV columns to customer fields
const FIELD_ALIASES = {
  CustomerListID: ['customerlistid', 'customer id', 'customer_id', 'id', 'accountnumber', 'account number'],
  name: ['name', 'customername', 'customer name'],
  contact_details: ['contact_details', 'address', 'contact', 'contact info', 'contact information', 'address1', 'address 1'],
  phone: ['phone', 'phone number', 'phonenumber', 'contact phone', 'mobile', 'mobile number']
};
const ALLOWED_FIELDS = [
  { key: 'CustomerListID', label: 'CustomerListID' },
  { key: 'name', label: 'Name' },
  { key: 'contact_details', label: 'Address' },
  { key: 'address2', label: 'Address 2' },
  { key: 'address3', label: 'Address 3' },
  { key: 'address4', label: 'Address 4' },
  { key: 'address5', label: 'Address 5' },
  { key: 'city', label: 'City' },
  { key: 'postal_code', label: 'Postal Code' },
  { key: 'phone', label: 'Phone' },
  { key: 'customer_barcode', label: 'Customer Barcode' }
];

export default function ImportCustomerInfo() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [columns, setColumns] = useState([]); // detected columns from CSV
  const [mapping, setMapping] = useState({}); // fieldKey -> columnName
  const [showMapping, setShowMapping] = useState(false);

  useEffect(() => {
    const color = localStorage.getItem('themeColor') || 'blue-600';
    document.documentElement.style.setProperty('--accent', colorMap[color] || colorMap['blue-600']);
    // Theme override for Import Customers page
    const importCustomersTheme = localStorage.getItem('importCustomersTheme') || 'system';
    if (importCustomersTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (importCustomersTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    // If 'system', do nothing (use global theme)
  }, []);

  // Load mapping from localStorage if available and columns match
  useEffect(() => {
    if (columns.length > 0) {
      const saved = localStorage.getItem('customerImportMapping');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only use saved mapping if all mapped columns exist in the current file
          const valid = Object.values(parsed).every(col => !col || columns.includes(col));
          if (valid) setMapping(parsed);
        } catch {}
      }
    }
    // eslint-disable-next-line
  }, [columns.join()]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setSuccess('');
    setPreview([]);
  };

  const handleParse = () => {
    if (!file) return;
    setError('');
    setSuccess('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      let data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Detect columns
      const detectedColumns = data.length > 0 ? Object.keys(data[0]) : [];
      setColumns(detectedColumns);
      // Auto-map columns by name
      const initialMapping = {};
      ALLOWED_FIELDS.forEach(f => {
        const found = detectedColumns.find(col => col.toLowerCase().replace(/[^a-z0-9]/g, '') === f.label.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (found) initialMapping[f.key] = found;
      });
      setMapping(initialMapping);
      setShowMapping(true);
      setPreview([]); // Clear preview until mapping is confirmed
      // Store raw data for later mapping
      window._rawImportData = data;
    };
    reader.readAsBinaryString(file);
  };

  const handleFieldChange = (idx, field, value) => {
    setPreview(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      let updated = { ...row, [field]: value };
      if (field === 'CustomerListID') {
        const normValue = normalizeId(value);
        updated.CustomerListID = normValue;
        updated.customer_number = normValue;
        updated.barcode = `*%${normValue}*`;
        updated.AccountNumber = normValue;
      }
      return updated;
    }));
  };

  const normalizeId = id => (id || '').trim().replace(/\s+/g, '').toLowerCase();

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    const importStart = new Date().toISOString();
    let importHistoryId = null;
    let importUser = await getCurrentUser();
    let importErrorMsg = '';
    let importStatus = 'success';
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    // Normalize all preview IDs
    const normalizedPreview = preview.map(c => ({
      ...c,
      CustomerListID: normalizeId(c.CustomerListID),
    }));
    // Batch .in() query for existing IDs
    const BATCH_SIZE = 500;
    let existingIds = new Set();
    for (let i = 0; i < normalizedPreview.length; i += BATCH_SIZE) {
      const batch = normalizedPreview.slice(i, i + BATCH_SIZE).map(c => c.CustomerListID);
      const { data: existing } = await supabase.from('customers').select('CustomerListID').in('CustomerListID', batch);
      (existing || []).forEach(c => existingIds.add(normalizeId(c.CustomerListID)));
    }
    // Deduplicate within the batch itself and normalize
    const seenIds = new Set();
    const duplicateInBatch = [];
    const duplicateInDb = [];
    const invalidIds = [];
    const toInsert = normalizedPreview
      .filter(c => {
        let rawId = c.CustomerListID || '';
        let cleanedId = normalizeId(rawId);
        let normId = cleanedId;
        if (!normId) { invalidIds.push(rawId); return false; }
        if (existingIds.has(normId)) { duplicateInDb.push(cleanedId); return false; }
        if (seenIds.has(normId)) { duplicateInBatch.push(cleanedId); return false; }
        seenIds.add(normId);
        // Update the row to have the cleaned ID and barcode
        c.CustomerListID = cleanedId;
        c.customer_number = cleanedId;
        c.barcode = `*%${cleanedId}*`;
        c.AccountNumber = cleanedId;
        return true;
      })
      .map(row => {
        const filtered = {};
        ALLOWED_FIELDS.forEach(f => { if (row[f.key] !== undefined) filtered[f.key] = row[f.key]; });
        return filtered;
      });
    // Debug logging
    console.log('Checked existing IDs:', Array.from(existingIds));
    console.log('To insert:', toInsert.map(c => c.CustomerListID));
    if (duplicateInBatch.length > 0 || duplicateInDb.length > 0 || invalidIds.length > 0) {
      setError(
        (duplicateInDb.length ? `Skipped (already in database): ${duplicateInDb.join(', ')}. ` : '') +
        (duplicateInBatch.length ? `Skipped (duplicate in file): ${duplicateInBatch.join(', ')}. ` : '') +
        (invalidIds.length ? `Skipped (invalid/empty ID): ${invalidIds.join(', ')}.` : '')
      );
    }
    if (toInsert.length === 0) {
      setError('All customers in the file already exist.');
      skippedCount = preview.length;
      importStatus = 'skipped';
      errorCount = 0;
      importedCount = 0;
      // Log import history (all skipped)
      await supabase.from('import_history').insert([
        {
          file_name: file?.name || '',
          import_type: 'customers',
          user_id: importUser?.id || null,
          user_email: importUser?.email || null,
          started_at: importStart,
          finished_at: new Date().toISOString(),
          status: importStatus,
          summary: { imported: importedCount, skipped: skippedCount, errors: errorCount },
          error_message: 'All customers in the file already exist.'
        }
      ]);
      setLoading(false);
      return;
    }
    // Use insert to only add new customers, skip existing
    const { error: insertError } = await supabase.from('customers').insert(toInsert);
    if (insertError) {
      // Try to extract the problematic ID from the error message
      let duplicateIdMsg = '';
      if (insertError.message && insertError.message.includes('duplicate key value')) {
        duplicateIdMsg = `\nIDs attempted: ${toInsert.map(c => c.CustomerListID).join(', ')}`;
      }
      setError(insertError.message + duplicateIdMsg);
      console.error('Insert error:', insertError, 'IDs attempted:', toInsert.map(c => c.CustomerListID));
      importErrorMsg = insertError.message + duplicateIdMsg;
      importStatus = 'error';
      errorCount = 1;
    } else {
      setSuccess(`${toInsert.length} customers imported successfully!`);
      setPreview([]);
      setFile(null);
      importedCount = toInsert.length;
      skippedCount = duplicateInDb.length + duplicateInBatch.length + invalidIds.length;
      errorCount = 0;
    }
    // Log import history
    await supabase.from('import_history').insert([
      {
        file_name: file?.name || '',
        import_type: 'customers',
        user_id: importUser?.id || null,
        user_email: importUser?.email || null,
        started_at: importStart,
        finished_at: new Date().toISOString(),
        status: importStatus,
        summary: { imported: importedCount, skipped: skippedCount, errors: errorCount },
        error_message: importErrorMsg
      }
    ]);
    setLoading(false);
  };

  const handleCancel = () => {
    setPreview([]);
    setFile(null);
    setError('');
    setSuccess('');
  };

  // Add a function to build preview from mapping
  const handleConfirmMapping = () => {
    // Save mapping to localStorage
    localStorage.setItem('customerImportMapping', JSON.stringify(mapping));
    const data = window._rawImportData || [];
    const mappedData = data.map(row => {
      const obj = {};
      ALLOWED_FIELDS.forEach(f => {
        const col = mapping[f.key];
        obj[f.key] = col ? row[col] : '';
      });
      // Generate barcode and account fields
      const normId = obj.CustomerListID ? normalizeId(obj.CustomerListID) : '';
      obj.customer_number = normId;
      obj.customer_barcode = obj.customer_barcode || '';
      obj.barcode = obj.customer_barcode || `*%${normId}*`;
      obj.AccountNumber = normId;
      return obj;
    });
    setPreview(mappedData);
    setShowMapping(false);
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-6 px-4 py-2 rounded font-semibold shadow transition-colors duration-200"
        style={{ background: 'var(--accent)', color: 'white' }}
      >
        ← Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Import Customers</h1>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="mb-4" />
      <button onClick={handleParse} disabled={!file} className="ml-2 px-4 py-2 rounded text-white font-semibold shadow transition-colors duration-200" style={{ background: 'var(--accent)' }}>Parse File</button>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {success && <div className="mt-4 text-green-600">{success}</div>}
      {showMapping && columns.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Map your file columns to app fields:</h2>
          <table className="border text-sm mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">App Field</th>
                <th className="border px-2 py-1">File Column</th>
              </tr>
            </thead>
            <tbody>
              {ALLOWED_FIELDS.map(f => (
                <tr key={f.key}>
                  <td className="border px-2 py-1 font-semibold">{f.label}</td>
                  <td className="border px-2 py-1">
                    <select
                      value={mapping[f.key] || ''}
                      onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                    >
                      <option value="">(Not Mapped)</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={handleConfirmMapping}>Confirm Mapping</button>
        </div>
      )}
      {preview.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Preview & Approve</h2>
          <div className="flex gap-4 mb-4">
            <button onClick={handleApprove} disabled={loading} className="px-6 py-2 rounded text-white font-semibold shadow transition-colors duration-200" style={{ background: 'var(--accent)' }}>Approve & Import</button>
            <button onClick={handleCancel} disabled={loading} className="px-6 py-2 rounded text-white font-semibold shadow transition-colors duration-200" style={{ background: '#6b7280' }}>Cancel</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  {ALLOWED_FIELDS.map(field => (
                    <th key={field.key} className="px-3 py-2 text-center" style={{ minWidth: '160px' }}>{field.label}</th>
                  ))}
                  <th className="px-3 py-2 text-center" style={{ minWidth: '160px' }}>Customer Number</th>
                  <th className="px-3 py-2 text-center" style={{ minWidth: '160px' }}>Barcode</th>
                  <th className="px-3 py-2 text-center" style={{ minWidth: '160px' }}>AccountNumber</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    {ALLOWED_FIELDS.map(field => (
                      <td key={field.key}><input value={row[field.key] || ''} onChange={e => handleFieldChange(idx, field.key, e.target.value)} className="w-full p-1 border rounded text-center" /></td>
                    ))}
                    <td><input value={row.customer_number} readOnly className="w-full p-1 border rounded bg-gray-100 text-center" /></td>
                    <td><input value={row.barcode} readOnly className="w-full p-1 border rounded bg-gray-100 font-mono text-center" /></td>
                    <td><input value={row.AccountNumber} readOnly className="w-full p-1 border rounded bg-gray-100 text-center" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 