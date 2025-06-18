import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RentalSidebar from '../components/RentalSidebar';
import RentalClassGroups from './RentalClassGroups';
import RentalClasses from './RentalClasses';
import RentalBillFormats from './RentalBillFormats';
import FlatFees from './FlatFees';
import ExpiringAssetAgreements from './ExpiringAssetAgreements';
import RentalBillConfiguration from './RentalBillConfiguration';
import ShowRentalBillingPeriods from './ShowRentalBillingPeriods';
import RentalLegacyCodeMappings from './RentalLegacyCodeMappings';
import RentalTaxRegions from './RentalTaxRegions';
import RentalTaxCategories from './RentalTaxCategories';
import RentalInvoiceSearch from './RentalInvoiceSearch';
import AccountingAssetAgreementProducts from './AccountingAssetAgreementProducts';
import AssignAssetTypesToRentalClasses from './AssignAssetTypesToRentalClasses';

export default function Rental() {
  return (
    <div className="flex min-h-screen">
      <RentalSidebar />
      <div className="flex-1">
        <Routes>
          <Route path="/class-groups" element={<RentalClassGroups />} />
          <Route path="/classes" element={<RentalClasses />} />
          <Route path="/bill-formats" element={<RentalBillFormats />} />
          <Route path="/flat-fees" element={<FlatFees />} />
          <Route path="/expiring-asset-agreements" element={<ExpiringAssetAgreements />} />
          <Route path="/bill-configuration" element={<RentalBillConfiguration />} />
          <Route path="/billing-periods" element={<ShowRentalBillingPeriods />} />
          <Route path="/legacy-code-mappings" element={<RentalLegacyCodeMappings />} />
          <Route path="/tax-regions" element={<RentalTaxRegions />} />
          <Route path="/tax-categories" element={<RentalTaxCategories />} />
          <Route path="/invoice-search" element={<RentalInvoiceSearch />} />
          <Route path="/accounting-products" element={<AccountingAssetAgreementProducts />} />
          <Route path="/assign-asset-types" element={<AssignAssetTypesToRentalClasses />} />
          <Route path="*" element={<Navigate to="/rental/class-groups" />} />
        </Routes>
      </div>
    </div>
  );
} 