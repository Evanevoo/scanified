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
    <nav className="bg-blue-700 text-white p-4 flex gap-4 items-center">
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'underline' : ''}>Dashboard</NavLink>
      <NavLink to="/customers" className={({ isActive }) => isActive ? 'underline' : ''}>Customers</NavLink>
      <NavLink to="/cylinders" className={({ isActive }) => isActive ? 'underline' : ''}>Cylinders</NavLink>
      <NavLink to="/rentals" className={({ isActive }) => isActive ? 'underline' : ''}>Rentals</NavLink>
      <NavLink to="/invoices" className={({ isActive }) => isActive ? 'underline' : ''}>Invoices</NavLink>
      <button onClick={handleLogout} className="ml-auto bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700">Logout</button>
    </nav>
  );
}

export default Navbar; 