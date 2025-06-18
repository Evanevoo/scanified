import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const mockData = [
  { id: 1, asset: 'Cylinder A', type: 'Fill', date: '2024-05-01', quantity: 10, user: 'John Doe' },
  { id: 2, asset: 'Cylinder B', type: 'Rental', date: '2024-05-02', quantity: 5, user: 'Jane Smith' },
  { id: 3, asset: 'Cylinder C', type: 'Return', date: '2024-05-03', quantity: 2, user: 'John Doe' },
];

export default function AssetTransactionsReport() {
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();
  const filtered = mockData.filter(row =>
    row.asset.toLowerCase().includes(filter.toLowerCase()) ||
    row.type.toLowerCase().includes(filter.toLowerCase()) ||
    row.user.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8">
      <button onClick={() => navigate('/dashboard')} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Asset Transactions Report</h2>
      <div className="mb-4">
        <input
          className="border p-2 rounded w-64"
          placeholder="Filter by asset, type, or user..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Asset</th>
            <th className="border px-4 py-2">Type</th>
            <th className="border px-4 py-2">Date</th>
            <th className="border px-4 py-2">Quantity</th>
            <th className="border px-4 py-2">User</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(row => (
            <tr key={row.id}>
              <td className="border px-4 py-2">{row.asset}</td>
              <td className="border px-4 py-2">{row.type}</td>
              <td className="border px-4 py-2">{row.date}</td>
              <td className="border px-4 py-2">{row.quantity}</td>
              <td className="border px-4 py-2">{row.user}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 