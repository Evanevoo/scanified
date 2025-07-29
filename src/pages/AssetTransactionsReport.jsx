import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function AssetTransactionsReport() {
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    fetchTransactions();
  }, [profile]);

  const fetchTransactions = async () => {
    if (!profile?.organization_id) return;
    
    setLoading(true);
    try {
      // Fetch asset transactions from database
      const { data: transactions, error } = await supabase
        .from('asset_transactions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(row =>
    row.asset_name?.toLowerCase().includes(filter.toLowerCase()) ||
    row.transaction_type?.toLowerCase().includes(filter.toLowerCase()) ||
    row.user_name?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading transactions...</div>
        </div>
      </div>
    );
  }

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
      
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No transactions found.</p>
        </div>
      ) : (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
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
                <td className="border px-4 py-2">{row.asset_name}</td>
                <td className="border px-4 py-2">{row.transaction_type}</td>
                <td className="border px-4 py-2">{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="border px-4 py-2">{row.quantity}</td>
                <td className="border px-4 py-2">{row.user_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 