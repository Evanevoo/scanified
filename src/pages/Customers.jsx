import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

function Customers({ profile }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customer_number: '', name: '', contact_details: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('customers').select('*').order('customer_number');
      if (error) setError(error.message);
      else setCustomers(data);
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('customers').insert([form]);
    if (error) setError(error.message);
    else {
      setForm({ customer_number: '', name: '', contact_details: '' });
      // Refresh list
      const { data } = await supabase.from('customers').select('*').order('customer_number');
      setCustomers(data);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setForm(customer);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('customers').update(form).eq('id', editingId);
    if (error) setError(error.message);
    else {
      setEditingId(null);
      setForm({ customer_number: '', name: '', contact_details: '' });
      const { data } = await supabase.from('customers').select('*').order('customer_number');
      setCustomers(data);
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) setError(error.message);
    else {
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

  if (loading) return <div>Loading customers...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Customers</h2>
      {canEdit && (
        <form onSubmit={editingId ? handleUpdate : handleAdd} className="mb-4 flex gap-2">
          <input name="customer_number" value={form.customer_number} onChange={handleChange} placeholder="Number" className="border p-2 rounded" required />
          <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2 rounded" required />
          <input name="contact_details" value={form.contact_details} onChange={handleChange} placeholder="Contact" className="border p-2 rounded" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{editingId ? 'Update' : 'Add'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ customer_number: '', name: '', contact_details: '' }); }} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>}
        </form>
      )}
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Number</th>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Contact</th>
            {canEdit && <th className="border px-4 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id}>
              <td className="border px-4 py-2">{c.customer_number}</td>
              <td className="border px-4 py-2">{c.name}</td>
              <td className="border px-4 py-2">{c.contact_details}</td>
              {canEdit && (
                <td className="border px-4 py-2">
                  <button onClick={() => handleEdit(c)} className="bg-yellow-400 text-white px-2 py-1 rounded mr-2">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Customers; 