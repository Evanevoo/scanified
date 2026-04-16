import React from 'react';
import { Box } from '@mui/material';
import { Routes, Route, Navigate } from 'react-router-dom';
import RentalSidebar from '../components/RentalSidebar';
import RentalClasses from './RentalClasses';
import RentalInvoiceSearch from './RentalInvoiceSearch';
import AssignAssetTypesToRentalClasses from './AssignAssetTypesToRentalClasses';
import RentalTaxRegions from './RentalTaxRegions';

/** Removed placeholder pages redirect here so bookmarks still work. */
const REDIRECTS = [
  ['bill-formats', '/settings'],
  ['flat-fees', '/rentals'],
  ['expiring-asset-agreements', '/lease-agreements'],
  ['bill-configuration', '/rentals'],
  ['billing-periods', '/rentals'],
  ['legacy-code-mappings', '/rental/classes'],
  ['tax-categories', '/locations'],
  ['accounting-products', '/rentals'],
];

export default function Rental() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100%', bgcolor: '#f8fafc', alignItems: 'stretch' }}>
      <RentalSidebar />
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <Routes>
          <Route path="/classes" element={<RentalClasses />} />
          <Route path="/invoice-search" element={<RentalInvoiceSearch />} />
          <Route path="/assign-asset-types" element={<AssignAssetTypesToRentalClasses />} />
          <Route path="/tax-regions" element={<RentalTaxRegions />} />
          {REDIRECTS.map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          <Route path="*" element={<Navigate to="/rental/classes" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
