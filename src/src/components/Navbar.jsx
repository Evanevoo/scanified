import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

function Navbar() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  return (
    <nav className="text-white p-4 flex gap-4 items-center" style={{ background: '#2563eb' }}>
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'underline text-blue-200' : 'hover:text-blue-200'}>Dashboard</NavLink>
      <NavLink to="/customers" className={({ isActive }) => isActive ? 'underline text-blue-200' : 'hover:text-blue-200'}>Customers</NavLink>
      <NavLink to="/cylinders" className={({ isActive }) => isActive ? 'underline text-blue-200' : 'hover:text-blue-200'}>Cylinders</NavLink>
      <NavLink to="/rentals" className={({ isActive }) => isActive ? 'underline text-blue-200' : 'hover:text-blue-200'}>Rentals</NavLink>
      <NavLink to="/invoices" className={({ isActive }) => isActive ? 'underline text-blue-200' : 'hover:text-blue-200'}>Invoices</NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? 'underline text-blue-200' : 'hover:text-blue-200'}>Settings</NavLink>
      <button onClick={handleLogout} className="ml-auto bg-blue-600 px-3 py-1 rounded text-white hover:bg-blue-700">Logout</button>
    </nav>
  );
}

export default Navbar; 