import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';

const Sidebar = () => {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!search) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      // Search assets (barcode/serial), customers (name/ID/phone), sales orders (number)
      const [assets, customers, salesOrders] = await Promise.all([
        supabase.from('cylinders').select('id, barcode_number, serial_number, product_code, description').or(`barcode_number.ilike.%${search}%,serial_number.ilike.%${search}%,product_code.ilike.%${search}%`).limit(5),
        supabase.from('customers').select('CustomerListID, name, phone').or(`CustomerListID.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%`).limit(5),
        supabase.from('sales_orders').select('id, sales_order_number, customer_name').or(`sales_order_number.ilike.%${search}%,customer_name.ilike.%${search}%`).limit(5),
      ]);
      const assetResults = (assets.data || []).map(a => ({
        type: 'asset',
        id: a.barcode_number || a.serial_number || a.product_code,
        label: a.description || a.product_code || a.barcode_number || a.serial_number,
        sub: a.barcode_number || a.serial_number,
      }));
      const customerResults = (customers.data || []).map(c => ({
        type: 'customer',
        id: c.CustomerListID,
        label: c.name,
        sub: c.phone,
      }));
      const orderResults = (salesOrders.data || []).map(o => ({
        type: 'order',
        id: o.id,
        label: o.sales_order_number,
        sub: o.customer_name,
      }));
      setSuggestions([...assetResults, ...customerResults, ...orderResults]);
    };
    fetchSuggestions();
  }, [search]);

  const handleSelect = (item) => {
    setShowSuggestions(false);
    setSearch('');
    if (item.type === 'asset') navigate(`/assets/${item.id}/history`);
    else if (item.type === 'customer') navigate(`/customers/${item.id}`);
    else if (item.type === 'order') navigate(`/integration`); // Adjust to actual order detail page if exists
    else alert('Unknown type');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    } else {
      alert('No matching asset, customer, or order found.');
    }
  };

  return (
    <div className="bg-gray-800 text-white w-64 h-screen p-4 flex flex-col overflow-y-hidden">
      {/* Unified Search Section */}
      <div className="mb-6">
        <div className="mb-2 text-xs text-gray-400">Search:</div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <input
            className="w-full mb-2 p-2 rounded text-black"
            placeholder="Asset, Customer, Order..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
        </form>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 bg-white text-black w-56 rounded shadow border max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                className="px-4 py-2 cursor-pointer hover:bg-blue-100"
                onMouseDown={() => handleSelect(item)}
              >
                <span className="font-semibold">{item.label}</span>
                <span className="text-xs text-gray-500 ml-2">{item.sub}</span>
                <span className="text-xs ml-2 rounded px-2 py-1 bg-gray-200 text-gray-700">{item.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Navigation Tabs */}
      <nav className="flex-1">
        <ul className="space-y-1">
          {[
            { to: '/home', label: 'Home' },
            { to: '/custom-reports', label: 'Custom Reports' },
            { to: '/customers', label: 'Customers' },
            { to: '/locations', label: 'Locations' },
            { to: '/assets/history-lookup', label: 'Asset History Lookup' },
            { to: '/all-asset-movements', label: 'All Asset Movements' },
            { to: '/import', label: 'Import' },
            { to: '/import-customer-info', label: 'Import Customers' },
            { to: '/import-history', label: 'Import History' },
            { to: '/scanned-orders', label: 'Scanned Orders' },
            { to: '/orders-report', label: 'Orders Report' },
          ].map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className="block px-4 py-2 rounded font-medium transition-colors duration-200"
                style={
                  location.pathname === to
                    ? { background: 'var(--accent)', color: 'white' }
                    : { background: 'transparent', color: 'white' }
                }
                onMouseOver={e => {
                  if (location.pathname !== to) e.currentTarget.style.background = 'var(--accent)';
                }}
                onMouseOut={e => {
                  if (location.pathname !== to) e.currentTarget.style.background = 'transparent';
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar; 