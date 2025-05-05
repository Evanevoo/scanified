import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => (
  <div className="bg-gray-800 text-white w-64 min-h-screen p-4 flex flex-col">
    {/* Jump To/Search Section */}
    <div className="mb-6">
      <div className="mb-2 text-xs text-gray-400">Jump To:</div>
      <input className="w-full mb-2 p-2 rounded text-black" placeholder="page name" />
      <div className="mb-1 text-xs text-gray-400">Barcode:</div>
      <input className="w-full mb-2 p-2 rounded text-black" placeholder="" />
      <div className="mb-1 text-xs text-gray-400">Customer:</div>
      <input className="w-full mb-2 p-2 rounded text-black" placeholder="" />
      <div className="mb-1 text-xs text-gray-400">Sales Order:</div>
      <input className="w-full mb-2 p-2 rounded text-black" placeholder="" />
      <div className="mb-1 text-xs text-gray-400">Serial #:</div>
      <input className="w-full mb-2 p-2 rounded text-black" placeholder="" />
    </div>
    {/* Navigation Tabs */}
    <nav className="flex-1">
      <ul className="space-y-1">
        <li><Link className="block px-4 py-2 rounded hover:bg-gray-700" to="/home">Home</Link></li>
        <li><Link className="block px-4 py-2 rounded hover:bg-gray-700" to="/custom-reports">Custom Reports</Link></li>
        <li><Link className="block px-4 py-2 rounded hover:bg-gray-700" to="/customers">Customers</Link></li>
        <li><Link className="block px-4 py-2 rounded hover:bg-gray-700" to="/locations">Locations</Link></li>
        <li><Link className="block px-4 py-2 rounded hover:bg-gray-700" to="/integration">Integration</Link></li>
      </ul>
    </nav>
  </div>
);

export default Sidebar; 