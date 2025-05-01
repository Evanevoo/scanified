import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="font-bold text-lg">Gas Rental</Link>
        <Link to="/dashboard" className="hover:underline">Dashboard</Link>
        {(role === 'admin' || role === 'manager') && (
          <>
            <Link to="/customers" className="hover:underline">Customers</Link>
            <Link to="/cylinders" className="hover:underline">Cylinders</Link>
            <Link to="/rentals" className="hover:underline">Rentals</Link>
          </>
        )}
        {role === 'admin' && (
          <Link to="/invoices" className="hover:underline">Invoices</Link>
        )}
      </div>
      <button onClick={handleLogout} className="bg-white text-blue-700 px-3 py-1 rounded hover:bg-gray-200">Logout</button>
    </nav>
  );
};

export default Navbar; 