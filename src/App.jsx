import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { ImportProgressProvider } from './components/ImportProgressContext';
import { PermissionsProvider } from './context/PermissionsContext';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import OrganizationSetup from './pages/OrganizationSetup';
import Billing from './pages/Billing';
import OwnerDashboard from './pages/OwnerDashboard';
import CustomerPortal from './pages/CustomerPortal';
import CustomerRegistration from './pages/CustomerRegistration';
import OrganizationRegistration from './pages/OrganizationRegistration';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import DeliveryManagement from './pages/DeliveryManagement';
import LandingPage from './pages/LandingPage';
import DebugAuth from './pages/DebugAuth';
import TestSupabase from './pages/TestSupabase';
import CustomerBillingPortal from './pages/CustomerBillingPortal';
import OwnerPortal from './pages/OwnerPortal';
import ResetPassword from './pages/ResetPassword';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PricingPage from './pages/PricingPage';
import Documentation from './pages/Documentation';
import CustomPageViewer from './pages/CustomPageViewer';

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

function AppContent() {
  return (
    <ErrorBoundary>
      <ImportProgressProvider>
        <Router>
          <PermissionsProvider>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* --- Public Routes --- */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<OrganizationRegistration />} />
                <Route path="/setup" element={<OrganizationSetup />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/p/:slug" element={<CustomPageViewer />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/customer-register" element={<CustomerRegistration />} />
                <Route path="/portal" element={<CustomerPortal />} />

                {/* --- Semi-Protected Owner Portal --- */}
                <Route path="/owner-portal" element={<OwnerPortal />} />

                {/* --- Debug Routes --- */}
                <Route path="/debug" element={<DebugAuth />} />
                <Route path="/test" element={<TestSupabase />} />

                {/* --- ALL Protected Routes Go Here --- */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Home />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/cylinders" element={<Cylinders />} />
                  <Route path="/bottles" element={<Bottles />} />
                  <Route path="/rentals" element={<Rentals />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/custom-reports" element={<CustomReports />} />
                  <Route path="/analytics" element={<AnalyticsDashboard />} />
                  <Route path="/delivery-management" element={<DeliveryManagement />} />
                  <Route path="/reports/all-assets" element={<AllAssetsReport />} />
                  <Route path="/reports/asset-type-changes" element={<AssetTypeChangesReport />} />
                  <Route path="/reports/assets-by-customer" element={<AssetsByCustomerReport />} />
                  <Route path="/reports/audits-to-delivery" element={<AuditsToDeliveryRecordsReport />} />
                  <Route path="/reports/balance-changes" element={<BalanceChangesSummaryReport />} />
                  <Route path="/reports/customer-deliveries" element={<CustomerDeliveriesReport />} />
                  <Route path="/reports/deliveries-by-location" element={<DeliveriesByLocationReport />} />
                  <Route path="/reports/delivery-totals" element={<DeliveryTotalsByUserReport />} />
                  <Route path="/reports/lost-assets" element={<LostAssetsReport />} />
                  <Route path="/reports/movement-between-locations" element={<MovementBetweenLocationsReport />} />
                  <Route path="/reports/negative-balance" element={<NegativeBalanceReport />} />
                  <Route path="/reports/new-assets" element={<NewAssetsAddedReport />} />
                  <Route path="/reports/not-scanned-source" element={<NotScannedSourceReport />} />
                  <Route path="/reports/overdue-assets" element={<OverdueAssetSearchReport />} />
                  <Route path="/reports/print-days" element={<PrintDaysRecordsReport />} />
                  <Route path="/reports/quick-map" element={<QuickMapReport />} />
                  <Route path="/reports/supabase-orders" element={<SupabaseOrders />} />
                  <Route path="/quick-add" element={<QuickAdd />} />
                  <Route path="/lot-reports" element={<LotReports />} />
                  <Route path="/regular-maintenance" element={<RegularMaintenance />} />
                  <Route path="/locations" element={<Locations />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/create-records" element={<CreateRecords />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/mobile-units" element={<MobileUnits />} />
                  <Route path="/rental" element={<Rental />} />
                  <Route path="/customer/:id" element={<CustomerDetail />} />
                  <Route path="/asset-history" element={<AssetHistory />} />
                  <Route path="/asset-history-lookup" element={<AssetHistoryLookup />} />
                  <Route path="/import-history" element={<ImportHistory />} />
                  <Route path="/all-asset-movements" element={<AllAssetMovements />} />
                  <Route path="/import" element={<Import />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/import-customer-info" element={<ImportCustomerInfo />} />
                  <Route path="/scanned-orders" element={<ScannedOrders />} />
                  <Route path="/user-management" element={<UserManagement />} />
                  <Route path="/bottle-import" element={<BottleImport />} />
                  <Route path="/import-approvals" element={<ImportApprovals />} />
                  <Route path="/import-approvals-history" element={<ImportApprovalsHistory />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route path="/bottle/:id" element={<BottleDetail />} />
                  <Route path="/orders" element={<ScannedOrders />} />
                  <Route path="/billing" element={<Billing />} />
                </Route>
                
                {/* Catch-all for any other unmatched routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </PermissionsProvider>
        </Router>
      </ImportProgressProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 