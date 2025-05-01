import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const Rentals = () => {
  const [rentals, setRentals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cylinders, setCylinders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, customer_id: '', cylinder_id: '', rental_type: 'monthly', rental_start_date: '', rental_end_date: '', status: 'active' });
  const [error, setError] = useState('');

  const fetchRentals = async () => {
    setLoading(true);
    let query = supabase.from('rentals').select('*');
    if (search) query = query.ilike('customer_id', `%${search}%`);
    const { data } = await query.order('created_at', { ascending: false });
    setRentals(data || []);
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name');
    setCustomers(data || []);
  };

  const fetchCylinders = async () => {
    const { data } = await supabase.from('cylinders').select('id, serial_number');
    setCylinders(data || []);
  };

  useEffect(() => { fetchRentals(); fetchCustomers(); fetchCylinders(); }, [search]);

  const handleFormChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const openAddForm = () => {
    setForm({ id: null, customer_id: '', cylinder_id: '', rental_type: 'monthly', rental_start_date: '', rental_end_date: '', status: 'active' });
    setShowForm(true);
    setError('');
  };

  const openEditForm = (rental) => {
    setForm({ ...rental });
    setShowForm(true);
    setError('');
  };

  const handleEndRental = async (id) => {
    if (!window.confirm('End this rental?')) return;
    await supabase.from('rentals').update({ status: 'ended', rental_end_date: new Date().toISOString().slice(0, 10) }).eq('id', id);
    fetchRentals();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id || !form.cylinder_id || !form.rental_type || !form.rental_start_date) {
      setError('All fields except end date are required.');
      return;
    }
    if (form.id) {
      await supabase.from('rentals').update({
        customer_id: form.customer_id,
        cylinder_id: form.cylinder_id,
        rental_type: form.rental_type,
        rental_start_date: form.rental_start_date,
        rental_end_date: form.rental_end_date,
        status: form.status,
      }).eq('id', form.id);
    } else {
      await supabase.from('rentals').insert({
        customer_id: form.customer_id,
        cylinder_id: form.cylinder_id,
        rental_type: form.rental_type,
        rental_start_date: form.rental_start_date,
        rental_end_date: form.rental_end_date,
        status: form.status,
      });
    }
    setShowForm(false);
    fetchRentals();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Rentals</h1>
        <button onClick={openAddForm} className="bg-blue-600 text-white px-4 py-2 rounded">Add Rental</button>
      </div>
      <form onSubmit={e => e.preventDefault()} className="mb-4">
        <input
          type="text"
          placeholder="Search by customer ID..."
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
                <th className="py-2 px-4 border-b">Customer</th>
                <th className="py-2 px-4 border-b">Cylinder</th>
                <th className="py-2 px-4 border-b">Rental Type</th>
                <th className="py-2 px-4 border-b">Start Date</th>
                <th className="py-2 px-4 border-b">End Date</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map(r => (
                <tr key={r.id}>
                  <td className="py-2 px-4 border-b">{getCustomerName(customers, r.customer_id)}</td>
                  <td className="py-2 px-4 border-b">{getCylinderSerial(cylinders, r.cylinder_id)}</td>
                  <td className="py-2 px-4 border-b">{r.rental_type}</td>
                  <td className="py-2 px-4 border-b">{r.rental_start_date ? new Date(r.rental_start_date).toLocaleDateString() : ''}</td>
                  <td className="py-2 px-4 border-b">{r.rental_end_date ? new Date(r.rental_end_date).toLocaleDateString() : ''}</td>
                  <td className="py-2 px-4 border-b">{r.status}</td>
                  <td className="py-2 px-4 border-b">
                    <button onClick={() => openEditForm(r)} className="text-blue-600 hover:underline mr-2">Edit</button>
                    {r.status === 'active' && (
                      <button onClick={() => handleEndRental(r.id)} className="text-red-600 hover:underline">End</button>
                    )}
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
            <h2 className="text-xl font-bold mb-4">{form.id ? 'Edit' : 'Add'} Rental</h2>
            {error && <div className="mb-2 text-red-500 text-sm">{error}</div>}
            <div className="mb-2">
              <label className="block mb-1">Customer</label>
              <select name="customer_id" value={form.customer_id} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required>
                <option value="">-- Select --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <label className="block mb-1">Cylinder</label>
              <select name="cylinder_id" value={form.cylinder_id} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required>
                <option value="">-- Select --</option>
                {cylinders.map(cy => (
                  <option key={cy.id} value={cy.id}>{cy.serial_number}</option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <label className="block mb-1">Rental Type</label>
              <select name="rental_type" value={form.rental_type} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="block mb-1">Start Date</label>
              <input name="rental_start_date" type="date" value={form.rental_start_date} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required />
            </div>
            <div className="mb-4">
              <label className="block mb-1">End Date</label>
              <input name="rental_end_date" type="date" value={form.rental_end_date} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">{form.id ? 'Update' : 'Add'} Rental</button>
          </form>
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

function getCylinderSerial(cylinders, id) {
  if (!id) return '';
  const c = cylinders.find(c => c.id === id);
  return c ? c.serial_number : '';
}

export default Rentals; 