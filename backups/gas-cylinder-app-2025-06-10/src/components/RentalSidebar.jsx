import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/rental/class-groups', label: 'Rental Class Groups' },
  { to: '/rental/classes', label: 'Rental Classes' },
  { to: '/rental/bill-formats', label: 'Rental Bill Formats' },
  { to: '/rental/flat-fees', label: 'Flat Fees' },
  { to: '/rental/expiring-asset-agreements', label: 'Expiring Asset Agreements' },
  { to: '/rental/bill-configuration', label: 'Rental Bill Configuration' },
  { to: '/rental/billing-periods', label: 'Show Rental Billing Periods' },
  { to: '/rental/legacy-code-mappings', label: 'Rental Legacy Code Mappings' },
  { to: '/rental/tax-regions', label: 'Rental Tax Regions' },
  { to: '/rental/tax-categories', label: 'Rental Tax Categories' },
  { to: '/rental/invoice-search', label: 'Rental Invoice Search' },
  { to: '/rental/accounting-products', label: 'Accounting Asset Agreement Products' },
  { to: '/rental/assign-asset-types', label: 'Assign Asset Types To Rental Classes' },
];

export default function RentalSidebar() {
  return (
    <div className="bg-gray-200 w-64 min-h-screen p-0 border-r">
      <div className="bg-gray-600 text-white font-bold px-4 py-3">Rental</div>
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