import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const Dashboard = () => {
  const [stats, setStats] = useState({
    customers: 0,
    cylinders: 0,
    assignedCylinders: 0,
    unassignedCylinders: 0,
    activeRentals: 0,
  });
  const [search, setSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [cylinderResults, setCylinderResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [{ count: customers }, { count: cylinders }, { data: assigned }, { count: activeRentals }] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('cylinders').select('*', { count: 'exact', head: true }),
        supabase.from('cylinders').select('id').not('assigned_customer', 'is', null),
        supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      setStats({
        customers: customers || 0,
        cylinders: cylinders || 0,
        assignedCylinders: assigned ? assigned.length : 0,
        unassignedCylinders: (cylinders || 0) - (assigned ? assigned.length : 0),
        activeRentals: activeRentals || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const [cust, cyl] = await Promise.all([
      supabase.from('customers').select('*').ilike('name', `%${search}%`),
      supabase.from('cylinders').select('*').ilike('serial_number', `%${search}%`),
    ]);
    setCustomerResults(cust.data || []);
    setCylinderResults(cyl.data || []);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded shadow p-4 text-center">
            <div className="text-gray-500">Customers</div>
            <div className="text-2xl font-bold">{stats.customers}</div>
          </div>
          <div className="bg-white rounded shadow p-4 text-center">
            <div className="text-gray-500">Cylinders</div>
            <div className="text-2xl font-bold">{stats.cylinders}</div>
          </div>
          <div className="bg-white rounded shadow p-4 text-center">
            <div className="text-gray-500">Assigned Cylinders</div>
            <div className="text-2xl font-bold">{stats.assignedCylinders}</div>
          </div>
          <div className="bg-white rounded shadow p-4 text-center">
            <div className="text-gray-500">Active Rentals</div>
            <div className="text-2xl font-bold">{stats.activeRentals}</div>
          </div>
        </div>
      )}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Search customers or cylinders..."
          className="border px-3 py-2 rounded w-full max-w-md"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
      </form>
      {(customerResults.length > 0 || cylinderResults.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="font-bold mb-2">Customer Results</h2>
            <ul>
              {customerResults.map(c => (
                <li key={c.id} className="border-b py-1">{c.name} ({c.customer_number})</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-bold mb-2">Cylinder Results</h2>
            <ul>
              {cylinderResults.map(cy => (
                <li key={cy.id} className="border-b py-1">{cy.serial_number} ({cy.gas_type})</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 