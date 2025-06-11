import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch customer
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('CustomerListID', id)
          .single();
        if (customerError) throw customerError;
        setCustomer(customerData);
        // Fetch assets assigned to this customer
        const { data: assetsData, error: assetsError } = await supabase
          .from('cylinders')
          .select('*')
          .eq('assigned_customer', id);
        if (assetsError) throw assetsError;
        setAssets(assetsData);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!customer) return <div>Customer not found.</div>;

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100 w-full">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Customer Details</h2>
      <div className="mb-6 p-4 bg-white/80 rounded-xl shadow border border-blue-100">
        <div className="font-bold text-blue-900 text-lg mb-2">{customer.name}</div>
        <div className="text-sm text-gray-700">CustomerListID: <span className="font-mono">{customer.CustomerListID}</span></div>
        <div className="text-sm text-gray-700">Address: {[
          customer.contact_details,
          customer.address2,
          customer.address3,
          customer.address4,
          customer.address5,
          customer.city,
          customer.postal_code
        ].filter(Boolean).join(', ')}</div>
        <div className="text-sm text-gray-700">Phone: {customer.phone}</div>
      </div>
      <h3 className="font-bold mb-2 text-blue-800">Assets Assigned to Customer</h3>
      {assets.length === 0 ? (
        <div className="text-gray-500">No assets assigned to this customer.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border text-xs">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Product Code</th>
                <th>Description</th>
                <th>Gas Type</th>
                <th>Rental Start</th>
                <th>Category</th>
                <th>Group</th>
                <th>Type</th>
                <th>In-House Total</th>
                <th>With Customer Total</th>
                <th>Lost Total</th>
                <th>Total</th>
                <th>Dock Stock</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id}>
                  <td>{asset.serial_number}</td>
                  <td>{asset.product_code}</td>
                  <td>{asset.description}</td>
                  <td>{asset.gas_type}</td>
                  <td>{asset.rental_start_date || '-'}</td>
                  <td>{asset.category}</td>
                  <td>{asset.group_name}</td>
                  <td>{asset.type}</td>
                  <td>{asset.in_house_total}</td>
                  <td>{asset.with_customer_total}</td>
                  <td>{asset.lost_total}</td>
                  <td>{asset.total}</td>
                  <td>{asset.dock_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 