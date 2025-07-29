import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function RecentSalesOrderImports() {
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    fetchRecentImports();
  }, [profile]);

  const fetchRecentImports = async () => {
    if (!profile?.organization_id) return;
    
    setLoading(true);
    try {
      // Fetch recent import records from database
      const { data: recentImports, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setData(recentImports || []);
    } catch (error) {
      console.error('Error fetching recent imports:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(row =>
    row.order_id?.toLowerCase().includes(filter.toLowerCase()) ||
    row.status?.toLowerCase().includes(filter.toLowerCase()) ||
    row.imported_by?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading recent imports...</div>
        </div>
      </div>
    );
  }

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
      
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No recent imports found.</p>
        </div>
      ) : (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Order ID</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Date</th>
              <th className="border px-4 py-2">Imported By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id}>
                <td className="border px-4 py-2">{row.order_id}</td>
                <td className="border px-4 py-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    row.status === 'success' ? 'bg-green-100 text-green-800' :
                    row.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="border px-4 py-2">{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="border px-4 py-2">{row.imported_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 