import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { parseFile, exportToExcel } from '../utils/fileImport';

const Cylinders = () => {
  const [cylinders, setCylinders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, serial_number: '', barcode_number: '', gas_type: '', assigned_customer: '', rental_start_date: '' });
  const [error, setError] = useState('');
  const [importPreview, setImportPreview] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState('');

  const fetchCylinders = async () => {
    setLoading(true);
    let query = supabase.from('cylinders').select('*');
    if (search) query = query.ilike('serial_number', `%${search}%`);
    const { data } = await query.order('created_at', { ascending: false });
    setCylinders(data || []);
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name');
    setCustomers(data || []);
  };

  useEffect(() => { fetchCylinders(); fetchCustomers(); }, [search]);

  const handleFormChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const openAddForm = () => {
    setForm({ id: null, serial_number: '', barcode_number: '', gas_type: '', assigned_customer: '', rental_start_date: '' });
    setShowForm(true);
    setError('');
  };

  const openEditForm = (cylinder) => {
    setForm({ ...cylinder, assigned_customer: cylinder.assigned_customer || '', rental_start_date: cylinder.rental_start_date || '' });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this cylinder?')) return;
    await supabase.from('cylinders').delete().eq('id', id);
    fetchCylinders();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.serial_number || !form.gas_type) {
      setError('Serial number and gas type are required.');
      return;
    }
    if (form.id) {
      await supabase.from('cylinders').update({
        serial_number: form.serial_number,
        barcode_number: form.barcode_number,
        gas_type: form.gas_type,
        assigned_customer: form.assigned_customer || null,
        rental_start_date: form.assigned_customer ? form.rental_start_date : null,
      }).eq('id', form.id);
    } else {
      await supabase.from('cylinders').insert({
        serial_number: form.serial_number,
        barcode_number: form.barcode_number,
        gas_type: form.gas_type,
        assigned_customer: form.assigned_customer || null,
        rental_start_date: form.assigned_customer ? form.rental_start_date : null,
      });
    }
    setShowForm(false);
    fetchCylinders();
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    parseFile(file, (rows) => {
      // Validate required fields
      const valid = rows.every(row => row.serial_number && row.gas_type);
      if (!valid) {
        setImportError('Each row must have serial_number and gas_type.');
        setImportPreview([]);
        return;
      }
      setImportPreview(rows);
      setImportError('');
    });
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return;
    await supabase.from('cylinders').insert(importPreview);
    setShowImport(false);
    setImportPreview([]);
    fetchCylinders();
  };

  const handleExport = () => {
    exportToExcel(cylinders, 'cylinders.xlsx');
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Cylinders</h1>
        <div className="flex gap-2">
          <button onClick={openAddForm} className="bg-blue-600 text-white px-4 py-2 rounded">Add Cylinder</button>
          <button onClick={() => setShowImport(true)} className="bg-green-600 text-white px-4 py-2 rounded">Import</button>
          <button onClick={handleExport} className="bg-gray-600 text-white px-4 py-2 rounded">Export</button>
        </div>
      </div>
      <form onSubmit={e => e.preventDefault()} className="mb-4">
        <input
          type="text"
          placeholder="Search by serial number..."
          className="border px-3 py-2 rounded w-full max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </form>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Serial #</th>
                <th className="py-2 px-4 border-b">Barcode</th>
                <th className="py-2 px-4 border-b">Gas Type</th>
                <th className="py-2 px-4 border-b">Assigned Customer</th>
                <th className="py-2 px-4 border-b">Rental Start Date</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cylinders.map(c => (
                <tr key={c.id}>
                  <td className="py-2 px-4 border-b">{c.serial_number}</td>
                  <td className="py-2 px-4 border-b">{c.barcode_number}</td>
                  <td className="py-2 px-4 border-b">{c.gas_type}</td>
                  <td className="py-2 px-4 border-b">{getCustomerName(customers, c.assigned_customer)}</td>
                  <td className="py-2 px-4 border-b">{c.rental_start_date ? new Date(c.rental_start_date).toLocaleDateString() : ''}</td>
                  <td className="py-2 px-4 border-b">
                    <button onClick={() => openEditForm(c)} className="text-blue-600 hover:underline mr-2">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm relative">
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-2 right-2 text-gray-500">&times;</button>
            <h2 className="text-xl font-bold mb-4">{form.id ? 'Edit' : 'Add'} Cylinder</h2>
            {error && <div className="mb-2 text-red-500 text-sm">{error}</div>}
            <div className="mb-2">
              <label className="block mb-1">Serial Number</label>
              <input name="serial_number" value={form.serial_number} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required />
            </div>
            <div className="mb-2">
              <label className="block mb-1">Barcode Number</label>
              <input name="barcode_number" value={form.barcode_number} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" />
            </div>
            <div className="mb-2">
              <label className="block mb-1">Gas Type</label>
              <input name="gas_type" value={form.gas_type} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required />
            </div>
            <div className="mb-2">
              <label className="block mb-1">Assign to Customer</label>
              <select name="assigned_customer" value={form.assigned_customer} onChange={handleFormChange} className="border px-3 py-2 rounded w-full">
                <option value="">-- Unassigned --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {form.assigned_customer && (
              <div className="mb-4">
                <label className="block mb-1">Rental Start Date</label>
                <input name="rental_start_date" type="date" value={form.rental_start_date} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required />
              </div>
            )}
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">{form.id ? 'Update' : 'Add'} Cylinder</button>
          </form>
        </div>
      )}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-lg relative">
            <button type="button" onClick={() => setShowImport(false)} className="absolute top-2 right-2 text-gray-500">&times;</button>
            <h2 className="text-xl font-bold mb-4">Import Cylinders</h2>
            <input type="file" accept=".xlsx,.csv,.txt" onChange={handleImportFile} className="mb-2" />
            {importError && <div className="mb-2 text-red-500 text-sm">{importError}</div>}
            {importPreview.length > 0 && (
              <div className="mb-2 max-h-40 overflow-auto border p-2 rounded">
                <div className="font-bold mb-1">Preview ({importPreview.length} rows):</div>
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="border px-1">Serial #</th>
                      <th className="border px-1">Barcode</th>
                      <th className="border px-1">Gas Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i}>
                        <td className="border px-1">{row.serial_number}</td>
                        <td className="border px-1">{row.barcode_number}</td>
                        <td className="border px-1">{row.gas_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              onClick={handleImportConfirm}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-2"
              disabled={importPreview.length === 0}
            >
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function getCustomerName(customers, id) {
  if (!id) return '';
  const c = customers.find(c => c.id === id);
  return c ? c.name : '';
}

export default Cylinders; 