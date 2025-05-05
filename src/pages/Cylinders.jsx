import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';

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
            <th className="border px-4 py-2">Serial</th>
            <th className="border px-4 py-2">Barcode</th>
            <th className="border px-4 py-2">Gas Type</th>
            <th className="border px-4 py-2">Assigned To</th>
            <th className="border px-4 py-2">Rental Start</th>
            {canEdit && <th className="border px-4 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {cylinders.map(c => (
            <tr key={c.id}>
              <td className="border px-4 py-2">{c.serial_number}</td>
              <td className="border px-4 py-2">{c.barcode_number}</td>
              <td className="border px-4 py-2">{c.gas_type}</td>
              <td className="border px-4 py-2">{c.assigned_customer?.name || '-'}</td>
              <td className="border px-4 py-2">{c.rental_start_date || '-'}</td>
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