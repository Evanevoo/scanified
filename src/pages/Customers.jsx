import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { parseFile, exportToExcel } from '../utils/fileImport';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, customer_number: '', name: '', contact_details: '' });
  const [error, setError] = useState('');
  const [importPreview, setImportPreview] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    let query = supabase.from('customers').select('*');
    if (search) query = query.ilike('name', `%${search}%`);
    const { data, error } = await query.order('created_at', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const handleFormChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const openAddForm = () => {
    setForm({ id: null, customer_number: '', name: '', contact_details: '' });
    setShowForm(true);
    setError('');
  };

  const openEditForm = (customer) => {
    setForm(customer);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    await supabase.from('customers').delete().eq('id', id);
    fetchCustomers();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_number || !form.name) {
      setError('Customer number and name are required.');
      return;
    }
    if (form.id) {
      await supabase.from('customers').update({
        customer_number: form.customer_number,
        name: form.name,
        contact_details: form.contact_details,
      }).eq('id', form.id);
    } else {
      await supabase.from('customers').insert({
        customer_number: form.customer_number,
        name: form.name,
        contact_details: form.contact_details,
      });
    }
    setShowForm(false);
    fetchCustomers();
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    parseFile(file, (rows) => {
      // Validate required fields
      const valid = rows.every(row => row.customer_number && row.name);
      if (!valid) {
        setImportError('Each row must have customer_number and name.');
        setImportPreview([]);
        return;
      }
      setImportPreview(rows);
      setImportError('');
    });
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return;
    await supabase.from('customers').insert(importPreview);
    setShowImport(false);
    setImportPreview([]);
    fetchCustomers();
  };

  const handleExport = () => {
    exportToExcel(customers, 'customers.xlsx');
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex gap-2">
          <button onClick={openAddForm} className="bg-blue-600 text-white px-4 py-2 rounded">Add Customer</button>
          <button onClick={() => setShowImport(true)} className="bg-green-600 text-white px-4 py-2 rounded">Import</button>
          <button onClick={handleExport} className="bg-gray-600 text-white px-4 py-2 rounded">Export</button>
        </div>
      </div>
      <form onSubmit={e => e.preventDefault()} className="mb-4">
        <input
          type="text"
          placeholder="Search by name..."
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
                <th className="py-2 px-4 border-b">Customer #</th>
                <th className="py-2 px-4 border-b">Name</th>
                <th className="py-2 px-4 border-b">Contact</th>
                <th className="py-2 px-4 border-b">Assigned Cylinders</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="py-2 px-4 border-b">{c.customer_number}</td>
                  <td className="py-2 px-4 border-b">{c.name}</td>
                  <td className="py-2 px-4 border-b">{c.contact_details}</td>
                  <td className="py-2 px-4 border-b">
                    <AssignedCylinders customerId={c.id} />
                  </td>
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
            <h2 className="text-xl font-bold mb-4">{form.id ? 'Edit' : 'Add'} Customer</h2>
            {error && <div className="mb-2 text-red-500 text-sm">{error}</div>}
            <div className="mb-2">
              <label className="block mb-1">Customer Number</label>
              <input name="customer_number" value={form.customer_number} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required />
            </div>
            <div className="mb-2">
              <label className="block mb-1">Name</label>
              <input name="name" value={form.name} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Contact Details</label>
              <input name="contact_details" value={form.contact_details} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">{form.id ? 'Update' : 'Add'} Customer</button>
          </form>
        </div>
      )}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-lg relative">
            <button type="button" onClick={() => setShowImport(false)} className="absolute top-2 right-2 text-gray-500">&times;</button>
            <h2 className="text-xl font-bold mb-4">Import Customers</h2>
            <input type="file" accept=".xlsx,.csv,.txt" onChange={handleImportFile} className="mb-2" />
            {importError && <div className="mb-2 text-red-500 text-sm">{importError}</div>}
            {importPreview.length > 0 && (
              <div className="mb-2 max-h-40 overflow-auto border p-2 rounded">
                <div className="font-bold mb-1">Preview ({importPreview.length} rows):</div>
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="border px-1">Customer #</th>
                      <th className="border px-1">Name</th>
                      <th className="border px-1">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i}>
                        <td className="border px-1">{row.customer_number}</td>
                        <td className="border px-1">{row.name}</td>
                        <td className="border px-1">{row.contact_details}</td>
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

// Show assigned cylinders count for a customer
const AssignedCylinders = ({ customerId }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase.from('cylinders').select('id').eq('assigned_customer', customerId);
      setCount(data ? data.length : 0);
    };
    fetchCount();
  }, [customerId]);
  return <span>{count}</span>;
};

export default Customers; 