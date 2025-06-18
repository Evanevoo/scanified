import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

export default function AllAssetMovements() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  const allColumns = [
    { key: 'asset_id', label: 'Asset ID' },
    { key: 'type', label: 'Type' },
    { key: 'created_at', label: 'Created' },
    { key: 'user', label: 'User' },
    { key: 'device', label: 'Device' },
    { key: 'location', label: 'Location' },
    { key: 'data', label: 'Data' },
    { key: 'associated_assets', label: 'Associated Assets' },
    { key: 'notes', label: 'Notes' },
  ];
  const COLUMN_PREF_KEY = 'allAssetMovementsColumns';
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(COLUMN_PREF_KEY);
    if (saved) return JSON.parse(saved);
    return allColumns.map(c => c.key);
  });
  function handleColumnChange(key) {
    let updated = visibleColumns.includes(key)
      ? visibleColumns.filter(k => k !== key)
      : [...visibleColumns, key];
    setVisibleColumns(updated);
    localStorage.setItem(COLUMN_PREF_KEY, JSON.stringify(updated));
  }

  useEffect(() => {
    async function fetchRecords() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('asset_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setRecords(data || []);
      setLoading(false);
    }
    fetchRecords();
  }, []);

  const filtered = records.filter(r => {
    const matchesText = !filter ||
      (r.asset_id && r.asset_id.toLowerCase().includes(filter.toLowerCase())) ||
      (r.type && r.type.toLowerCase().includes(filter.toLowerCase())) ||
      (r.user && r.user.toLowerCase().includes(filter.toLowerCase())) ||
      (r.location && r.location.toLowerCase().includes(filter.toLowerCase())) ||
      (r.notes && r.notes.toLowerCase().includes(filter.toLowerCase()));
    const matchesDate = (!dateFrom || new Date(r.created_at) >= new Date(dateFrom)) &&
      (!dateTo || new Date(r.created_at) <= new Date(dateTo));
    return matchesText && matchesDate;
  });

  // Bulk selection handlers
  function toggleSelectAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(r => r.id));
  }
  function toggleSelectRow(id) {
    setSelected(selected.includes(id) ? selected.filter(sid => sid !== id) : [...selected, id]);
  }

  // Bulk export selected
  function downloadSelectedCSV() {
    const selectedRows = filtered.filter(r => selected.includes(r.id));
    if (!selectedRows.length) return;
    const header = Object.keys(selectedRows[0]).join(',');
    const csv = [
      header,
      ...selectedRows.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected_asset_movements.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Bulk delete selected
  async function deleteSelected() {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} selected records? This cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('asset_records').delete().in('id', selected);
    if (error) setError(error.message);
    else setRecords(records.filter(r => !selected.includes(r.id)));
    setSelected([]);
    setLoading(false);
  }

  // Export filtered records to CSV
  function downloadCSV() {
    if (!filtered.length) return;
    const header = Object.keys(filtered[0]).join(',');
    const csv = [
      header,
      ...filtered.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_movements.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100 w-full">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4 text-blue-900">All Asset Movements</h2>
      <div className="mb-4 flex flex-wrap gap-2 items-end">
        <input
          className="border p-2 rounded w-64"
          placeholder="Search by asset, type, user, location, notes..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">From</label>
          <input type="date" className="border p-2 rounded" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">To</label>
          <input type="date" className="border p-2 rounded" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-semibold transition"
          onClick={downloadCSV}
          disabled={!filtered.length}
        >
          Export CSV
        </button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-semibold transition"
          onClick={downloadSelectedCSV}
          disabled={!selected.length}
        >
          Export Selected
        </button>
        <button
          className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 font-semibold transition"
          onClick={deleteSelected}
          disabled={!selected.length}
        >
          Delete Selected
        </button>
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600 font-semibold transition"
          onClick={() => setShowColumnModal(true)}
        >
          Columns
        </button>
      </div>
      {showColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-80">
            <div className="font-bold mb-2">Show/Hide Columns</div>
            {allColumns.map(col => (
              <div key={col.key} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col.key)}
                  onChange={() => handleColumnChange(col.key)}
                  id={`col-${col.key}`}
                />
                <label htmlFor={`col-${col.key}`} className="ml-2">{col.label}</label>
              </div>
            ))}
            <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowColumnModal(false)}>Close</button>
          </div>
        </div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-700">Error: {error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border text-xs">
            <thead>
              <tr>
                <th className="border px-2 py-1">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                </th>
                {allColumns.filter(col => visibleColumns.includes(col.key)).map(col => (
                  <th key={col.key} className="border px-2 py-1">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="border px-2 py-1">
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelectRow(r.id)} />
                  </td>
                  {allColumns.filter(col => visibleColumns.includes(col.key)).map(col => (
                    <td key={col.key} className="border px-2 py-1">{
                      col.key === 'created_at' && r[col.key] ? new Date(r[col.key]).toLocaleString() : r[col.key]
                    }</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-gray-500 mt-2">No movement records found.</div>}
        </div>
      )}
    </div>
  );
} 