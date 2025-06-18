import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const mockData = [
  { id: 1, orderId: 'SO123', status: 'Imported', date: '2024-05-01', importedBy: 'John Doe' },
  { id: 2, orderId: 'SO124', status: 'Failed', date: '2024-05-02', importedBy: 'Jane Smith' },
];

export default function RecentSalesOrderImports() {
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();
  const filtered = mockData.filter(row =>
    row.orderId.toLowerCase().includes(filter.toLowerCase()) ||
    row.status.toLowerCase().includes(filter.toLowerCase()) ||
    row.importedBy.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Recent Sales Order Imports</h2>
      <div className="mb-4">
        <input
          className="border p-2 rounded w-64"
          placeholder="Filter by order ID, status, or user..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Order ID</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">Date</th>
            <th className="border px-4 py-2">Imported By</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(row => (
            <tr key={row.id}>
              <td className="border px-4 py-2">{row.orderId}</td>
              <td className="border px-4 py-2">{row.status}</td>
              <td className="border px-4 py-2">{row.date}</td>
              <td className="border px-4 py-2">{row.importedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 