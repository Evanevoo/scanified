import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/integration/asset-transactions-report', label: 'Asset Transactions Report' },
  { to: '/integration/failed-sales-order-imports', label: 'Failed Sales Order Imports' },
  { to: '/integration/import-asset-balance', label: 'Import Asset Balance' },
  { to: '/integration/import-customer-info', label: 'Import Customer Info' },
  { to: '/integration/import-fills', label: 'Import Fills' },
  { to: '/integration/import-sales-order-file', label: 'Import Sales Order File' },
  { to: '/integration/recent-sales-order-imports', label: 'Recent Sales Order Imports' },
];

export default function IntegrationSidebar() {
  return (
    <div className="bg-gray-200 w-64 min-h-screen p-0 border-r">
      <div className="bg-gray-600 text-white font-bold px-4 py-3">Integration</div>
      <nav>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-4 py-2 border-b text-gray-800 hover:bg-gray-300 ${isActive ? 'bg-gray-300 font-semibold' : ''}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
} 