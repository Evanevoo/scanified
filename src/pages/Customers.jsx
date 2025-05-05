import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';

function Customers({ profile }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', contact_details: '', phone: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';
  const navigate = useNavigate();

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
      setForm({ name: '', contact_details: '', phone: '' });
      // Refresh list
      const { data } = await supabase.from('customers').select('*').order('customer_number');
      setCustomers(data);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.CustomerListID);
    setForm(customer);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('customers').update(form).eq('CustomerListID', editingId);
    if (error) setError(error.message);
    else {
      setEditingId(null);
      setForm({ name: '', contact_details: '', phone: '' });
      const { data } = await supabase.from('customers').select('*').order('customer_number');
      setCustomers(data);
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    const { error } = await supabase.from('customers').delete().eq('CustomerListID', id);
    if (error) setError(error.message);
    else {
      setCustomers(customers.filter(c => c.CustomerListID !== id));
    }
  };

  const handleSelect = (id) => {
    setSelected(selected =>
      selected.includes(id) ? selected.filter(sid => sid !== id) : [...selected, id]
    );
  };

  const handleSelectAll = () => {
    if (selected.length === customers.length) {
      setSelected([]);
    } else {
      setSelected(customers.map(c => c.CustomerListID));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} selected customers? This cannot be undone.`)) return;
    setError(null);
    const { error } = await supabase.from('customers').delete().in('CustomerListID', selected);
    if (error) setError(error.message);
    else {
      setCustomers(customers.filter(c => !selected.includes(c.CustomerListID)));
      setSelected([]);
    }
  };

  if (loading) return <div>Loading customers...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100 w-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-blue-900 tracking-tight">Customers</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-gray-400 to-gray-300 text-white px-6 py-2 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-400 font-semibold transition"
        >
          Back to Dashboard
        </button>
      </div>
      {canEdit && (
        <form onSubmit={editingId ? handleUpdate : handleAdd} className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end w-full">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border border-blue-200 bg-white/80 p-3 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-300 transition" />
          <input name="contact_details" value={form.contact_details} onChange={handleChange} placeholder="Address" className="border border-blue-200 bg-white/80 p-3 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-300 transition" />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="border border-blue-200 bg-white/80 p-3 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-300 transition" />
          <div className="col-span-1 md:col-span-3 flex gap-3 mt-2">
            <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-6 py-2 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-500 font-semibold transition w-full md:w-auto">{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', contact_details: '', phone: '' }); }} className="bg-gradient-to-r from-gray-400 to-gray-300 text-white px-6 py-2 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-400 font-semibold transition w-full md:w-auto">Cancel</button>}
          </div>
        </form>
      )}
      {selected.length > 0 && (
        <button
          onClick={handleBulkDelete}
          className="mb-4 bg-gradient-to-r from-red-600 to-red-400 text-white px-6 py-2 rounded-lg shadow-md hover:from-red-700 hover:to-red-500 font-semibold transition w-full md:w-auto"
        >
          Delete Selected ({selected.length})
        </button>
      )}
      <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-white/70 w-full">
        <table className="min-w-full w-full border-separate border-spacing-0 rounded-2xl text-sm">
          <thead className="bg-gradient-to-r from-blue-200 to-blue-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="border-b px-4 py-3">
                <input type="checkbox" checked={selected.length === customers.length && customers.length > 0} onChange={handleSelectAll} />
              </th>
              <th className="border-b px-4 py-3 font-semibold text-blue-900 text-xs tracking-wider uppercase bg-blue-50 rounded-tl-2xl">CustomerListID</th>
              <th className="border-b px-4 py-3 font-semibold text-blue-900 text-xs tracking-wider uppercase">Name</th>
              <th className="border-b px-4 py-3 font-semibold text-blue-900 text-xs tracking-wider uppercase">Address</th>
              <th className="border-b px-4 py-3 font-semibold text-blue-900 text-xs tracking-wider uppercase">Phone</th>
              {canEdit && <th className="border-b px-4 py-3 font-semibold text-blue-900 text-xs tracking-wider uppercase rounded-tr-2xl">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {customers.map((c, idx) => (
              <tr key={c.CustomerListID} className={idx % 2 === 0 ? 'bg-white/80 hover:bg-blue-50' : 'bg-blue-50/60 hover:bg-blue-100'}>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={selected.includes(c.CustomerListID)} onChange={() => handleSelect(c.CustomerListID)} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-blue-800 whitespace-nowrap rounded-l-xl">{c.CustomerListID}</td>
                <td className="px-4 py-3 text-blue-900 whitespace-nowrap">{c.name}</td>
                <td className="px-4 py-3 text-blue-900 whitespace-nowrap">{c.contact_details}</td>
                <td className="px-4 py-3 text-blue-900 whitespace-nowrap">{c.phone}</td>
                {canEdit && (
                  <td className="px-4 py-3 space-x-2 rounded-r-xl flex items-center">
                    <button onClick={() => handleEdit(c)} className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-300 text-yellow-900 px-4 py-2 rounded-lg shadow hover:from-yellow-500 hover:to-yellow-400 transition font-semibold text-xs">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z' /></svg>
                      Edit/View
                    </button>
                    <button onClick={() => handleDelete(c.CustomerListID)} className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 to-red-400 text-white px-4 py-2 rounded-lg shadow hover:from-red-700 hover:to-red-500 transition font-semibold text-xs">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Customers; 