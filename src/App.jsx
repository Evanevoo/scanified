import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Customers from './pages/Customers';
import Cylinders from './pages/Cylinders';
import Rentals from './pages/Rentals';
import Invoices from './pages/Invoices';
import Home from './pages/Home';
import Favorites from './pages/Favorites';
import CustomReports from './pages/CustomReports';
import ManagementReports from './pages/ManagementReports';
import AllAssetsReport from './pages/management-reports/AllAssetsReport';
import AssetTypeChangesReport from './pages/management-reports/AssetTypeChangesReport';
import AssetsByCustomerReport from './pages/management-reports/AssetsByCustomerReport';
import AuditsToDeliveryRecordsReport from './pages/management-reports/AuditsToDeliveryRecordsReport';
import BalanceChangesSummaryReport from './pages/management-reports/BalanceChangesSummaryReport';
import CustomerDeliveriesReport from './pages/management-reports/CustomerDeliveriesReport';
import DeliveriesByLocationReport from './pages/management-reports/DeliveriesByLocationReport';
import DeliveryTotalsByUserReport from './pages/management-reports/DeliveryTotalsByUserReport';
import LostAssetsReport from './pages/management-reports/LostAssetsReport';
import MovementBetweenLocationsReport from './pages/management-reports/MovementBetweenLocationsReport';
import NegativeBalanceReport from './pages/management-reports/NegativeBalanceReport';
import NewAssetsAddedReport from './pages/management-reports/NewAssetsAddedReport';
import NotScannedSourceReport from './pages/management-reports/NotScannedSourceReport';
import OverdueAssetSearchReport from './pages/management-reports/OverdueAssetSearchReport';
import PrintDaysRecordsReport from './pages/management-reports/PrintDaysRecordsReport';
import QuickMapReport from './pages/management-reports/QuickMapReport';
import QuickAdd from './pages/QuickAdd';
import LotReports from './pages/LotReports';
import RegularMaintenance from './pages/RegularMaintenance';
import Locations from './pages/Locations';
import Search from './pages/Search';
import Integration from './pages/Integration';
import CreateRecords from './pages/CreateRecords';
import Alerts from './pages/Alerts';
import MobileUnits from './pages/MobileUnits';
import Rental from './pages/Rental';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  const isAuthenticated = !!user;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/customers" element={isAuthenticated ? <Customers user={user} profile={profile} /> : <Navigate to="/login" />} />
        <Route path="/cylinders" element={isAuthenticated ? <Cylinders user={user} profile={profile} /> : <Navigate to="/login" />} />
        <Route path="/rentals" element={isAuthenticated ? <Rentals user={user} profile={profile} /> : <Navigate to="/login" />} />
        <Route path="/invoices" element={isAuthenticated ? <Invoices user={user} profile={profile} /> : <Navigate to="/login" />} />
        <Route path="/home" element={isAuthenticated ? <Home user={user} profile={profile} /> : <Navigate to="/login" />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/custom-reports" element={<CustomReports />} />
        <Route path="/management-reports" element={<ManagementReports />}>
          <Route path="all-assets" element={<AllAssetsReport />} />
          <Route path="asset-type-changes" element={<AssetTypeChangesReport />} />
          <Route path="assets-by-customer" element={<AssetsByCustomerReport />} />
          <Route path="audits-to-delivery-records" element={<AuditsToDeliveryRecordsReport />} />
          <Route path="balance-changes-summary" element={<BalanceChangesSummaryReport />} />
          <Route path="customer-deliveries" element={<CustomerDeliveriesReport />} />
          <Route path="deliveries-by-location" element={<DeliveriesByLocationReport />} />
          <Route path="delivery-totals-by-user" element={<DeliveryTotalsByUserReport />} />
          <Route path="lost-assets" element={<LostAssetsReport />} />
          <Route path="movement-between-locations" element={<MovementBetweenLocationsReport />} />
          <Route path="negative-balance-report" element={<NegativeBalanceReport />} />
          <Route path="new-assets-added" element={<NewAssetsAddedReport />} />
          <Route path="not-scanned-source" element={<NotScannedSourceReport />} />
          <Route path="overdue-asset-search" element={<OverdueAssetSearchReport />} />
          <Route path="print-days-records" element={<PrintDaysRecordsReport />} />
          <Route path="quick-map" element={<QuickMapReport />} />
        </Route>
        <Route path="/quick-add" element={<QuickAdd />} />
        <Route path="/lot-reports" element={<LotReports />} />
        <Route path="/regular-maintenance" element={<RegularMaintenance />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/search" element={<Search />} />
        <Route path="/integration/*" element={<Integration />} />
        <Route path="/create-records" element={<CreateRecords />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/mobile-units" element={<MobileUnits />} />
        <Route path="/rental/*" element={<Rental />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App; 