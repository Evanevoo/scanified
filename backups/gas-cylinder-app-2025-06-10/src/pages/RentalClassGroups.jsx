import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RentalClassGroups() {
  const [groups, setGroups] = useState([
    { id: 1, name: 'Industrial', description: 'Industrial rental class group' },
    { id: 2, name: 'Medical', description: 'Medical rental class group' },
  ]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = e => {
    e.preventDefault();
    if (editingId) {
      setGroups(groups.map(g => g.id === editingId ? { ...g, ...form } : g));
      setEditingId(null);
    } else {
      setGroups([...groups, { id: Date.now(), ...form }]);
    }
    setForm({ name: '', description: '' });
  };

  const handleEdit = group => {
    setEditingId(group.id);
    setForm({ name: group.name, description: group.description });
  };

  const handleDelete = id => setGroups(groups.filter(g => g.id !== id));

  return (
    <div className="p-8">
      <button onClick={() => navigate('/dashboard')} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Rental Class Groups</h2>
      <form onSubmit={handleSubmit} className="mb-6 flex gap-2 items-end">
        <div>
          <label className="block text-sm">Name</label>
          <input name="name" value={form.name} onChange={handleChange} className="border p-2 rounded w-48" required />
        </div>
        <div>
          <label className="block text-sm">Description</label>
          <input name="description" value={form.description} onChange={handleChange} className="border p-2 rounded w-64" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', description: '' }); }} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>}
      </form>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Description</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <tr key={group.id}>
              <td className="border px-4 py-2">{group.name}</td>
              <td className="border px-4 py-2">{group.description}</td>
              <td className="border px-4 py-2">
                <button onClick={() => handleEdit(group)} className="bg-yellow-400 text-white px-2 py-1 rounded mr-2">Edit</button>
                <button onClick={() => handleDelete(group.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 