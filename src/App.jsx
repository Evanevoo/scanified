import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import MainLayout from './components/MainLayout';
import { ImportProgressProvider } from './components/ImportProgressContext';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load all page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Customers = lazy(() => import('./pages/Customers'));
const Cylinders = lazy(() => import('./pages/Cylinders'));
const Rentals = lazy(() => import('./pages/Rentals'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Home = lazy(() => import('./pages/Home'));
const Favorites = lazy(() => import('./pages/Favorites'));
const CustomReports = lazy(() => import('./pages/CustomReports'));
const AllAssetsReport = lazy(() => import('./pages/management-reports/AllAssetsReport'));
const AssetTypeChangesReport = lazy(() => import('./pages/management-reports/AssetTypeChangesReport'));
const AssetsByCustomerReport = lazy(() => import('./pages/management-reports/AssetsByCustomerReport'));
const AuditsToDeliveryRecordsReport = lazy(() => import('./pages/management-reports/AuditsToDeliveryRecordsReport'));
const BalanceChangesSummaryReport = lazy(() => import('./pages/management-reports/BalanceChangesSummaryReport'));
const CustomerDeliveriesReport = lazy(() => import('./pages/management-reports/CustomerDeliveriesReport'));
const DeliveriesByLocationReport = lazy(() => import('./pages/management-reports/DeliveriesByLocationReport'));
const DeliveryTotalsByUserReport = lazy(() => import('./pages/management-reports/DeliveryTotalsByUserReport'));
const LostAssetsReport = lazy(() => import('./pages/management-reports/LostAssetsReport'));
const MovementBetweenLocationsReport = lazy(() => import('./pages/management-reports/MovementBetweenLocationsReport'));
const NegativeBalanceReport = lazy(() => import('./pages/management-reports/NegativeBalanceReport'));
const NewAssetsAddedReport = lazy(() => import('./pages/management-reports/NewAssetsAddedReport'));
const NotScannedSourceReport = lazy(() => import('./pages/management-reports/NotScannedSourceReport'));
const OverdueAssetSearchReport = lazy(() => import('./pages/management-reports/OverdueAssetSearchReport'));
const PrintDaysRecordsReport = lazy(() => import('./pages/management-reports/PrintDaysRecordsReport'));
const QuickMapReport = lazy(() => import('./pages/management-reports/QuickMapReport'));
const QuickAdd = lazy(() => import('./pages/QuickAdd'));
const LotReports = lazy(() => import('./pages/LotReports'));
const RegularMaintenance = lazy(() => import('./pages/RegularMaintenance'));
const Locations = lazy(() => import('./pages/Locations'));
const Search = lazy(() => import('./pages/Search'));
const CreateRecords = lazy(() => import('./pages/CreateRecords'));
const Alerts = lazy(() => import('./pages/Alerts'));
const MobileUnits = lazy(() => import('./pages/MobileUnits'));
const Rental = lazy(() => import('./pages/Rental'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const AssetHistory = lazy(() => import('./pages/AssetHistory'));
const AssetHistoryLookup = lazy(() => import('./pages/AssetHistoryLookup'));
const ImportHistory = lazy(() => import('./pages/ImportHistory'));
const AllAssetMovements = lazy(() => import('./pages/AllAssetMovements'));
const Import = lazy(() => import('./pages/Import'));
const Settings = lazy(() => import('./pages/Settings'));
const ImportCustomerInfo = lazy(() => import('./pages/ImportCustomerInfo'));
const ScannedOrders = lazy(() => import('./pages/ScannedOrders'));
const SupabaseOrders = lazy(() => import('./pages/management-reports/SupabaseOrders'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const BottleImport = lazy(() => import('./pages/BottleImport'));
const ImportApprovals = lazy(() => import('./pages/ImportApprovals'));
const ImportApprovalsHistory = lazy(() => import('./pages/ImportApprovalsHistory'));
const Integrations = lazy(() => import('./pages/Integrations'));
const BottleDetail = lazy(() => import('./pages/BottleDetail'));
const Bottles = lazy(() => import('./pages/Bottles'));

// Import background service for automatic daily updates
import './utils/backgroundService';

function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  const isAuthenticated = !!user;

  return (
    <ErrorBoundary>
      <ImportProgressProvider>
        <Router>
          <Routes>
            <Route path="/login" element={
              <Suspense fallback={<LoadingSpinner />}>
                <LoginPage />
              </Suspense>
            } />
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/home" />} />
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/customers" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Customers user={user} profile={profile} />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/customers/:id" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <CustomerDetail />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/assets/:id/history" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <AssetHistory />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/assets/history-lookup" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <AssetHistoryLookup />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/cylinders" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Cylinders user={user} profile={profile} />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/all-gas-assets" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Cylinders user={user} profile={profile} />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/rentals" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Rentals user={user} profile={profile} />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/invoices" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Invoices user={user} profile={profile} />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/home" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Home user={user} profile={profile} />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/settings" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Settings />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/favorites" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Favorites />
                </Suspense>
              } />
              <Route path="/custom-reports" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CustomReports />
                </Suspense>
              } />
              <Route path="/orders-report" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <SupabaseOrders />
                </Suspense>
              } />
              <Route path="/quick-add" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <QuickAdd />
                </Suspense>
              } />
              <Route path="/lot-reports" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <LotReports />
                </Suspense>
              } />
              <Route path="/regular-maintenance" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <RegularMaintenance />
                </Suspense>
              } />
              <Route path="/locations" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Locations />
                </Suspense>
              } />
              <Route path="/search" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Search />
                </Suspense>
              } />
              <Route path="/create-records" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CreateRecords />
                </Suspense>
              } />
              <Route path="/alerts" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Alerts />
                </Suspense>
              } />
              <Route path="/mobile-units" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <MobileUnits />
                </Suspense>
              } />
              <Route path="/rental/*" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Rental />
                </Suspense>
              } />
              <Route path="/import" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Import />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/import-approvals" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <ImportApprovals />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/history" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <ImportApprovalsHistory />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/import-customer-info" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <ImportCustomerInfo />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/import-sales-receipts" element={<Navigate to="/import" replace />} />
              <Route path="/import-invoices" element={<Navigate to="/import" replace />} />
              <Route path="/import-history" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <ImportHistory />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/all-asset-movements" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <AllAssetMovements />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/scanned-orders" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <ScannedOrders />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/user-management" element={isAuthenticated && profile?.role === 'admin' ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <UserManagement />
                </Suspense>
              ) : <Navigate to="/home" />} />
              <Route path="/bottle-management" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <BottleImport />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/integrations" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Integrations />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/bottles/:barcode_number" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <BottleDetail />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="/bottles" element={isAuthenticated ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Bottles />
                </Suspense>
              ) : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to="/home" />} />
            </Route>
          </Routes>
        </Router>
      </ImportProgressProvider>
    </ErrorBoundary>
  );
}

export default App; 