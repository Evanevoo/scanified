import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function FailedSalesOrderImports() {
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    fetchFailedImports();
  }, [profile]);

  const fetchFailedImports = async () => {
    if (!profile?.organization_id) return;
    
    setLoading(true);
    try {
      // Fetch failed import records from database
      const { data: failedImports, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(failedImports || []);
    } catch (error) {
      logger.error('Error fetching failed imports:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(row =>
    row.order_id?.toLowerCase().includes(filter.toLowerCase()) ||
    row.error_message?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading failed imports...</div>
        </div>
      </div>
    );
  }

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
      
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No failed imports found.</p>
        </div>
      ) : (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Order ID</th>
              <th className="border px-4 py-2">Error</th>
              <th className="border px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id}>
                <td className="border px-4 py-2">{row.order_id}</td>
                <td className="border px-4 py-2">{row.error_message}</td>
                <td className="border px-4 py-2">{new Date(row.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 