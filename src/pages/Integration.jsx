import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import IntegrationSidebar from '../components/IntegrationSidebar';
import AssetTransactionsReport from './AssetTransactionsReport';
import FailedSalesOrderImports from './FailedSalesOrderImports';
import ImportAssetBalance from './ImportAssetBalance';
import ImportCustomerInfo from './ImportCustomerInfo';
import ImportFills from './ImportFills';
import ImportSalesOrderFile from './ImportSalesOrderFile';
import RecentSalesOrderImports from './RecentSalesOrderImports';

export default function Integration() {
  return (
    <div className="flex min-h-screen">
      <IntegrationSidebar />
      <div className="flex-1">
        <Routes>
          <Route path="/asset-transactions-report" element={<AssetTransactionsReport />} />
          <Route path="/failed-sales-order-imports" element={<FailedSalesOrderImports />} />
          <Route path="/import-asset-balance" element={<ImportAssetBalance />} />
          <Route path="/import-customer-info" element={<ImportCustomerInfo />} />
          <Route path="/import-fills" element={<ImportFills />} />
          <Route path="/import-sales-order-file" element={<ImportSalesOrderFile />} />
          <Route path="/recent-sales-order-imports" element={<RecentSalesOrderImports />} />
          <Route path="*" element={<Navigate to="/integration/asset-transactions-report" />} />
        </Routes>
      </div>
    </div>
  );
} 