import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/management-reports/import-customers', label: 'Import Customers' },
  { to: '/management-reports/all-assets', label: 'All Assets' },
  { to: '/management-reports/asset-type-changes', label: 'Asset Type Changes' },
  { to: '/management-reports/assets-by-customer', label: 'Assets By Customer' },
  { to: '/management-reports/audits-to-delivery-records', label: 'Audits to Delivery Records' },
  { to: '/management-reports/balance-changes-summary', label: 'Balance Changes Summary' },
  { to: '/management-reports/customer-deliveries', label: 'Customer Deliveries' },
  { to: '/management-reports/deliveries-by-location', label: 'Deliveries By Location' },
  { to: '/management-reports/delivery-totals-by-user', label: 'Delivery Totals By User' },
  { to: '/management-reports/lost-assets', label: 'Lost Assets' },
  { to: '/management-reports/movement-between-locations', label: 'Movement Between Locations' },
  { to: '/management-reports/negative-balance-report', label: 'Negative Balance Report' },
  { to: '/management-reports/new-assets-added', label: 'New Assets Added' },
  { to: '/management-reports/not-scanned-source', label: 'Not-Scanned: Source' },
  { to: '/management-reports/overdue-asset-search', label: 'Overdue Asset Search' },
  { to: '/management-reports/print-days-records', label: "Print Day's Records" },
  { to: '/management-reports/quick-map', label: 'Quick Map' },
  { to: '/management-reports/supabase-orders', label: 'Orders Report' },
];

console.log(links);

export default function ManagementReportsSidebar() {
  return (
    <div className="bg-gray-200 w-64 min-h-screen p-0 border-r overflow-y-auto">
      <div className="bg-gray-600 text-white font-bold px-4 py-3">Management Reports</div>
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