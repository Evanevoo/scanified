import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AssetHistoryLookup() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  return (
    <div className="max-w-xl mx-auto mt-20 bg-white/80 shadow-2xl rounded-2xl p-8 border border-blue-100">
      <h2 className="text-2xl font-bold mb-4 text-blue-900">Asset History Lookup</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Enter barcode or serial number..."
          className="border border-blue-300 bg-white/80 p-3 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-300 transition"
        />
        <button
          onClick={() => search && navigate(`/assets/${search}/history`)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 font-semibold transition"
          disabled={!search}
        >
          Lookup
        </button>
      </div>
      <div className="text-xs text-blue-700">Quickly view the full history and details of any asset by barcode or serial number.</div>
    </div>
  );
} 