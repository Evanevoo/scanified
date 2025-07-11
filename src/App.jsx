import React, { Suspense, lazy, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
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
import ResetPassword from './pages/ResetPassword';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PricingPage from './pages/PricingPage';
import Documentation from './pages/Documentation';
import CustomPageViewer from './pages/CustomPageViewer';
import ImportApprovals from './pages/ImportApprovals';
import ImportApprovalDetail from './pages/ImportApprovalDetail';
import ImportApprovalsHistory from './pages/ImportApprovalsHistory';
import Home from './pages/Home';
import DataUtilities from './pages/OwnerPortal/DataUtilities';
import OwnerPortalLanding from './pages/OwnerPortalLanding';
import Analytics from './pages/OwnerPortal/Analytics';
import SupportTickets from './pages/OwnerPortal/SupportTickets';
import BillingManagement from './pages/OwnerPortal/BillingManagement';
import SystemHealth from './pages/OwnerPortal/SystemHealth';
import SecurityEvents from './pages/OwnerPortal/SecurityEvents';
import UserManagementAllOrgs from './pages/OwnerPortal/UserManagementAllOrgs';
import OwnerCustomers from './pages/OwnerPortal/OwnerCustomers';
import AuditLog from './pages/OwnerPortal/AuditLog';
import Impersonation from './pages/OwnerPortal/Impersonation';
import PlanManagement from './pages/OwnerPortal/PlanManagement';
import RoleManagement from './pages/OwnerPortal/RoleManagement';
import PageBuilder from './pages/OwnerPortal/PageBuilder';
import ContactManagement from './pages/OwnerPortal/ContactManagement';
import AcceptInvite from './pages/AcceptInvite';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { supabase } from './supabase/client';

// Lazy load all page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Customers = lazy(() => import('./pages/Customers'));
const Cylinders = lazy(() => import('./pages/Cylinders'));
const Rentals = lazy(() => import('./pages/Rentals'));
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

const AllAssetMovements = lazy(() => import('./pages/AllAssetMovements'));
const Import = lazy(() => import('./pages/Import'));
const Settings = lazy(() => import('./pages/Settings'));
const ImportCustomerInfo = lazy(() => import('./pages/ImportCustomerInfo'));
const ScannedOrders = lazy(() => import('./pages/ScannedOrders'));
const SupabaseOrders = lazy(() => import('./pages/management-reports/SupabaseOrders'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ImportAssetBalance = lazy(() => import('./pages/ImportAssetBalance'));
const Integrations = lazy(() => import('./pages/Integrations'));
const BottleDetail = lazy(() => import('./pages/BottleDetail'));
const Assets = lazy(() => import('./pages/Assets'));
const BottleManagement = lazy(() => import('./pages/BottleManagement'));
const SmartInventory = lazy(() => import('./pages/SmartInventory'));
const CustomerSelfService = lazy(() => import('./pages/CustomerSelfService'));
const SupportCenter = lazy(() => import('./pages/SupportCenter'));
const OrganizationAnalytics = lazy(() => import('./pages/OrganizationAnalytics'));
const OrganizationTools = lazy(() => import('./pages/OrganizationTools'));

// Import background service for automatic daily updates
// import './utils/backgroundService';

function AppContent() {
  const { profile, organization } = useAuth();
  
  // Page visibility handler to prevent reloads when switching tabs
  useEffect(() => {
    let isPageVisible = true;
    let visibilityTimeout = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page became hidden');
        isPageVisible = false;
        // Disable auth listeners temporarily
        window.__authListenerDisabled = true;
      } else {
        console.log('Page became visible - preventing reloads');
        isPageVisible = true;
        
        // Clear any pending timeouts
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
          visibilityTimeout = null;
        }
        
        // Re-enable auth listeners after a short delay
        visibilityTimeout = setTimeout(() => {
          window.__authListenerDisabled = false;
          console.log('Auth listeners re-enabled');
        }, 1000);
      }
    };

    // Prevent any potential reloads
    const handleBeforeUnload = (e) => {
      if (isPageVisible) {
        console.log('Preventing page unload');
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, []);
  
  // Initialize background service for daily updates
  useEffect(() => {
    // Temporarily disable background service to test if it's causing auth restarts
    console.log('Background service temporarily disabled for testing');
    /*
    import('./utils/backgroundService').then(({ default: BackgroundService }) => {
      const backgroundService = new BackgroundService();
      backgroundService.initialize();
    });
    */
  }, []);

  useEffect(() => {
    const handleUnload = async () => {
      // This will sign out the user from Supabase
      await supabase.auth.signOut();
      // Optionally, clear localStorage/sessionStorage if you use them for auth
      // localStorage.clear();
      // sessionStorage.clear();
    };

    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('unload', handleUnload);
    };
  }, []);
  
  // Memoize the routes to prevent unnecessary re-renders
  const routes = useMemo(() => (
    <Routes>
      {/* Smart root redirect based on user state */}
      <Route path="/" element={
        profile && organization ? <Navigate to="/dashboard" replace /> : 
        profile && !organization ? <Navigate to="/setup" replace /> :
        <LandingPage />
      } />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={
        profile && organization ? <Navigate to="/dashboard" replace /> : 
        <LoginPage />
      } />
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
      <Route path="/accept-invite" element={<AcceptInvite />} />

      {/* --- Debug Routes --- */}
      <Route path="/debug" element={<DebugAuth />} />
      <Route path="/test" element={<TestSupabase />} />

      {/* --- ALL Protected Routes Go Here --- */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={profile?.role === 'owner' ? <OwnerDashboard /> : <Home />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/cylinders" element={<Cylinders />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/rentals" element={<Rentals />} />
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

        <Route path="/all-asset-movements" element={<AllAssetMovements />} />
        <Route path="/import" element={<Import />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/import-customer-info" element={<ImportCustomerInfo />} />
        <Route path="/scanned-orders" element={<ScannedOrders />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/import-asset-balance" element={<ImportAssetBalance />} />
        <Route path="/import-approvals" element={<ImportApprovals />} />
        <Route path="/import-approval/:invoiceNumber/detail" element={<ImportApprovalDetail />} />
        <Route path="/import-approvals-history" element={<ImportApprovalsHistory />} />
        <Route path="/import-approvals/history" element={<ImportApprovalsHistory />} />
        <Route path="/generateid" element={<Integrations />} />
        <Route path="/bottle/:id" element={<BottleDetail />} />
        <Route path="/assets/:id" element={<BottleDetail />} />
        <Route path="/orders" element={<ScannedOrders />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/bottle-management" element={<BottleManagement />} />
        <Route path="/smart-inventory" element={<SmartInventory />} />
        <Route path="/customer-portal" element={<CustomerSelfService />} />
        <Route path="/support" element={<SupportCenter />} />
        <Route path="/organization-analytics" element={<OrganizationAnalytics />} />
        <Route path="/organization-tools" element={<OrganizationTools />} />
        <Route path="/data-utilities" element={<DataUtilities />} />
        <Route path="/owner-portal" element={<OwnerPortalLanding />} />
        <Route path="/owner-portal/analytics" element={<Analytics />} />
        <Route path="/owner-portal/tools" element={<DataUtilities />} />
        <Route path="/owner-portal/support" element={<SupportTickets />} />
        <Route path="/owner-portal/customer-management" element={<OwnerCustomers />} />
        <Route path="/owner-portal/billing" element={<BillingManagement />} />
        <Route path="/owner-portal/system-health" element={<SystemHealth />} />
        <Route path="/owner-portal/security" element={<SecurityEvents />} />
        <Route path="/owner-portal/user-management" element={<UserManagementAllOrgs />} />
        <Route path="/owner-portal/audit-log" element={<AuditLog />} />
        <Route path="/owner-portal/impersonation" element={<Impersonation />} />
        <Route path="/owner-portal/plans" element={<PlanManagement />} />
        <Route path="/owner-portal/roles" element={<RoleManagement />} />
        <Route path="/owner-portal/page-builder" element={<PageBuilder />} />
        <Route path="/owner-portal/contact-management" element={<ContactManagement />} />
      </Route>
      
      {/* Catch-all for any other unmatched routes */}
      <Route path="*" element={profile && organization ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
    </Routes>
  ), [profile, organization]);

  // Global snackbar state
  const [globalSnackbar, setGlobalSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  React.useEffect(() => {
    // Expose a global helper for any page/component to trigger the snackbar
    window.showGlobalSnackbar = (message, severity = 'success') => {
      setGlobalSnackbar({ open: true, message, severity });
    };
  }, []);

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
            {/* Global Snackbar always on top */}
            <Snackbar
              open={globalSnackbar.open}
              autoHideDuration={4000}
              onClose={() => setGlobalSnackbar({ ...globalSnackbar, open: false })}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              ContentProps={{ sx: { zIndex: 2147483647, position: 'relative' } }}
            >
              <Alert onClose={() => setGlobalSnackbar({ ...globalSnackbar, open: false })} severity={globalSnackbar.severity} sx={{ width: '100%' }}>
                {globalSnackbar.message}
              </Alert>
            </Snackbar>
            <Suspense fallback={<LoadingSpinner />}>
              {routes}
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