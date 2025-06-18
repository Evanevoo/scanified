import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const mockData = [
  { id: 1, orderId: 'SO123', error: 'Invalid customer ID', date: '2024-05-01' },
  { id: 2, orderId: 'SO124', error: 'Missing asset info', date: '2024-05-02' },
];

export default function FailedSalesOrderImports() {
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();
  const filtered = mockData.filter(row =>
    row.orderId.toLowerCase().includes(filter.toLowerCase()) ||
    row.error.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8">
      <button onClick={() => navigate('/dashboard')} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Failed Sales Order Imports</h2>
      <div className="mb-4">
        <input
          className="border p-2 rounded w-64"
          placeholder="Filter by order ID or error..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Order ID</th>
            <th className="border px-4 py-2">Error</th>
            <th className="border px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(row => (
            <tr key={row.id}>
              <td className="border px-4 py-2">{row.orderId}</td>
              <td className="border px-4 py-2">{row.error}</td>
              <td className="border px-4 py-2">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 