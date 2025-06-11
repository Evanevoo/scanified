import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function Cylinders({ profile }) {
  const [cylinders, setCylinders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ serial_number: '', barcode_number: '', gas_type: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignForm, setAssignForm] = useState({ customer_id: '', rental_start_date: '' });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCylinder, setSelectedCylinder] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [selected, setSelected] = useState([]);

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';
  const navigate = useNavigate();

  // Fetch cylinders and customers from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch cylinders with customer details
        const { data: cylindersData, error: cylindersError } = await supabase
          .from('cylinders')
          .select(`
            *,
            assigned_customer (
              CustomerListID,
              name,
              customer_number
            )
          `)
          .order('serial_number');

        if (cylindersError) throw cylindersError;

        // Fetch customers for assignment dropdown
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('CustomerListID, name, customer_number')
          .order('name');

        if (customersError) throw customersError;

        setCylinders(cylindersData);
        setCustomers(customersData);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('cylinders').insert([form]);
    if (error) setError(error.message);
    else {
      setForm({ serial_number: '', barcode_number: '', gas_type: '' });
      // Refresh list
      const { data } = await supabase
        .from('cylinders')
        .select('*, assigned_customer (CustomerListID, name, customer_number)')
        .order('serial_number');
      setCylinders(data);
    }
  };

  const handleEdit = (cylinder) => {
    setEditingId(cylinder.id);
    setForm({
      serial_number: cylinder.serial_number,
      barcode_number: cylinder.barcode_number,
      gas_type: cylinder.gas_type
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('cylinders').update(form).eq('id', editingId);
    if (error) setError(error.message);
    else {
      setEditingId(null);
      setForm({ serial_number: '', barcode_number: '', gas_type: '' });
      const { data } = await supabase
        .from('cylinders')
        .select('*, assigned_customer (CustomerListID, name, customer_number)')
        .order('serial_number');
      setCylinders(data);
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    const { error } = await supabase.from('cylinders').delete().eq('id', id);
    if (error) setError(error.message);
    else {
      setCylinders(cylinders.filter(c => c.id !== id));
    }
  };

  const openAssignModal = (cylinder) => {
    setSelectedCylinder(cylinder);
    setAssignForm({
      customer_id: cylinder.assigned_customer?.CustomerListID || '',
      rental_start_date: cylinder.rental_start_date || new Date().toISOString().split('T')[0]
    });
    setShowAssignModal(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase
      .from('cylinders')
      .update({
        assigned_customer: assignForm.customer_id || null,
        rental_start_date: assignForm.customer_id ? assignForm.rental_start_date : null
      })
      .eq('id', selectedCylinder.id);

    if (error) setError(error.message);
    else {
      setShowAssignModal(false);
      // Refresh list
      const { data } = await supabase
        .from('cylinders')
        .select('*, assigned_customer (CustomerListID, name, customer_number)')
        .order('serial_number');
      setCylinders(data);
    }
  };

  const handleImportFile = e => {
    setImportError(null);
    setImportResult(null);
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv' || ext === 'txt') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setImportPreview(results.data);
        },
        error: (err) => setImportError(err.message)
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = evt => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        setImportPreview(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError('Unsupported file type.');
    }
  };

  const handleImportSubmit = async () => {
    setImportError(null);
    setImportResult(null);
    if (!importPreview.length) return;
    const mapped = importPreview.map(row => ({
      category: row['Category'] || '',
      group_name: row['Group'] || '',
      type: row['Type'] || '',
      product_code: row['Product Code'] || '',
      description: row['Description'] || '',
      in_house_total: Number(row['In-House Total']) || 0,
      with_customer_total: Number(row['With Customer Total']) || 0,
      lost_total: Number(row['Lost Total']) || 0,
      total: Number(row['Total']) || 0,
      dock_stock: row['Dock Stock'] || '',
    }));
    // Deduplicate by product_code
    const deduped = Array.from(
      mapped.reduce((acc, item) => acc.set(item.product_code, item), new Map()).values()
    );
    const { error } = await supabase.from('cylinders').upsert(deduped, { onConflict: ['product_code'] });
    if (error) setImportError(error.message);
    else setImportResult('Assets imported!');
    setImportPreview([]);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} selected assets? This cannot be undone.`)) return;
    setError(null);
    const { error } = await supabase.from('cylinders').delete().in('id', selected);
    if (error) setError(error.message);
    else {
      setCylinders(cylinders.filter(c => !selected.includes(c.id)));
      setSelected([]);
    }
  };

  if (loading) return <div>Loading cylinders...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="relative max-w-7xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100 w-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold">Cylinders</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-gray-400 to-gray-300 text-white px-6 py-2 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-400 font-semibold transition"
        >
          Back to Dashboard
        </button>
      </div>
      {/* Bulk Delete Buttons */}
      <div className="mb-4 flex gap-2">
        {selected.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Delete Selected ({selected.length})
          </button>
        )}
        {cylinders.length > 0 && (
          <button
            onClick={async () => {
              if (!window.confirm('Delete ALL assets? This cannot be undone.')) return;
              setError(null);
              const { error } = await supabase.from('cylinders').delete();
              if (error) setError(error.message);
              else {
                setCylinders([]);
                setSelected([]);
              }
            }}
            className="bg-red-800 text-white px-4 py-2 rounded"
          >
            Delete All
          </button>
        )}
      </div>
      {/* Import Assets Section */}
      <div className="mb-8 p-4 bg-white/80 rounded-xl shadow border border-blue-100">
        <h3 className="font-bold mb-2 text-blue-800">Import Assets</h3>
        <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleImportFile} className="mb-2" />
        {importError && <div className="text-red-600 mb-2">{importError}</div>}
        {importPreview.length > 0 && (
          <div className="mb-2">
            <div className="font-semibold mb-1">Preview ({importPreview.length} rows):</div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border text-xs">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Group</th>
                    <th>Type</th>
                    <th>Product Code</th>
                    <th>Description</th>
                    <th>In-House Total</th>
                    <th>With Customer Total</th>
                    <th>Lost Total</th>
                    <th>Total</th>
                    <th>Dock Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td>{row['Category']}</td>
                      <td>{row['Group']}</td>
                      <td>{row['Type']}</td>
                      <td>{row['Product Code']}</td>
                      <td>{row['Description']}</td>
                      <td>{row['In-House Total']}</td>
                      <td>{row['With Customer Total']}</td>
                      <td>{row['Lost Total']}</td>
                      <td>{row['Total']}</td>
                      <td>{row['Dock Stock']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 5 && <div className="text-xs text-gray-500 mt-1">Showing first 5 rows only.</div>}
            </div>
            <button onClick={handleImportSubmit} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Import All</button>
          </div>
        )}
        {importResult && <div className="text-green-700 font-semibold">{importResult}</div>}
      </div>
      {canEdit && (
        <form onSubmit={editingId ? handleUpdate : handleAdd} className="mb-4 flex gap-2">
          <input name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="Serial Number" className="border p-2 rounded" required />
          <input name="barcode_number" value={form.barcode_number} onChange={handleChange} placeholder="Barcode" className="border p-2 rounded" />
          <input name="gas_type" value={form.gas_type} onChange={handleChange} placeholder="Gas Type" className="border p-2 rounded" required />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{editingId ? 'Update' : 'Add'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ serial_number: '', barcode_number: '', gas_type: '' }); }} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>}
        </form>
      )}
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selected.length === cylinders.length && cylinders.length > 0}
                onChange={() => {
                  if (selected.length === cylinders.length) setSelected([]);
                  else setSelected(cylinders.map(c => c.id));
                }}
              />
            </th>
            <th className="border px-4 py-2">Category</th>
            <th className="border px-4 py-2">Group</th>
            <th className="border px-4 py-2">Type</th>
            <th className="border px-4 py-2">Product Code</th>
            <th className="border px-4 py-2">Description</th>
            <th className="border px-4 py-2">In-House Total</th>
            <th className="border px-4 py-2">With Customer Total</th>
            <th className="border px-4 py-2">Lost Total</th>
            <th className="border px-4 py-2">Total</th>
            <th className="border px-4 py-2">Dock Stock</th>
            {canEdit && <th className="border px-4 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {cylinders.map(c => (
            <tr key={c.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => {
                    setSelected(selected =>
                      selected.includes(c.id)
                        ? selected.filter(id => id !== c.id)
                        : [...selected, c.id]
                    );
                  }}
                />
              </td>
              <td className="border px-4 py-2">{c.category}</td>
              <td className="border px-4 py-2">{c.group_name}</td>
              <td className="border px-4 py-2">{c.type}</td>
              <td className="border px-4 py-2">{c.product_code}</td>
              <td className="border px-4 py-2">{c.description}</td>
              <td className="border px-4 py-2">{c.in_house_total}</td>
              <td className="border px-4 py-2">{c.with_customer_total}</td>
              <td className="border px-4 py-2">{c.lost_total}</td>
              <td className="border px-4 py-2">{c.total}</td>
              <td className="border px-4 py-2">{c.dock_stock}</td>
              {canEdit && (
                <td className="border px-4 py-2">
                  <button onClick={() => handleEdit(c)} className="bg-yellow-400 text-white px-2 py-1 rounded mr-2">Edit</button>
                  <button onClick={() => openAssignModal(c)} className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Assign</button>
                  <button onClick={() => handleDelete(c.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Assign Cylinder</h3>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block mb-2">Customer</label>
                <select
                  value={assignForm.customer_id}
                  onChange={(e) => setAssignForm({ ...assignForm, customer_id: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="">-- Unassign --</option>
                  {customers.map(customer => (
                    <option key={customer.CustomerListID} value={customer.CustomerListID}>
                      {customer.name} ({customer.customer_number})
                    </option>
                  ))}
                </select>
              </div>
              {assignForm.customer_id && (
                <div>
                  <label className="block mb-2">Rental Start Date</label>
                  <input
                    type="date"
                    value={assignForm.rental_start_date}
                    onChange={(e) => setAssignForm({ ...assignForm, rental_start_date: e.target.value })}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cylinders; 