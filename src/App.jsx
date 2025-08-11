import React, { lazy, Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './hooks/useAuth';
import { PermissionsProvider } from './context/PermissionsContext';
import { ImportProgressProvider } from './components/ImportProgressContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import { initAllTracking, trackPageView } from './utils/analytics';
import { initializeDisasterRecovery } from './utils/disasterRecovery';
import OrganizationRegistration from './pages/OrganizationRegistration';
import Billing from './pages/Billing';
import OwnerDashboard from './pages/OwnerDashboard';
import CustomerPortal from './pages/CustomerPortal';
import CustomerRegistration from './pages/CustomerRegistration';
import BarcodeGenerator from './pages/BarcodeGenerator';
import IntegrationSettings from './pages/OwnerPortal/IntegrationSettings';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import LandingPage from './pages/LandingPage';
import DebugAuth from './pages/DebugAuth';
import FixOrganizationLink from './pages/FixOrganizationLink';

import CustomerBillingPortal from './pages/CustomerBillingPortal';
import ResetPassword from './pages/ResetPassword';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PricingPage from './pages/PricingPage';
import Documentation from './pages/Documentation';
import CustomPageViewer from './pages/CustomPageViewer';
import ImportApprovals from './pages/ImportApprovals';
import ImportApprovalDetail from './pages/ImportApprovalDetailEnhanced';
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
import AssetTypeDemo from './components/AssetTypeDemo';
import AssetConfigurationManager from './pages/OwnerPortal/AssetConfigurationManager';
import FileFormatManager from './pages/OwnerPortal/FileFormatManager';
import FormatConfigurationManager from './pages/OwnerPortal/FormatConfigurationManager';
import RoleManagement from './pages/OwnerPortal/RoleManagement';
import PageBuilder from './pages/OwnerPortal/PageBuilder';
import ContactManagement from './pages/OwnerPortal/ContactManagement';
import OwnerCommandCenter from './pages/OwnerPortal/OwnerCommandCenter';
import LandingPageEditor from './pages/OwnerPortal/LandingPageEditor';
import ReviewManagement from './pages/OwnerPortal/ReviewManagement';
import WebsiteManagement from './pages/OwnerPortal/WebsiteManagement';
import VisualPageBuilder from './pages/OwnerPortal/VisualPageBuilder';
import DisasterRecoveryDashboard from './components/admin/DisasterRecoveryDashboard';
import AcceptInvite from './pages/AcceptInvite';

// NEW ADVANCED FEATURES
import HazmatCompliance from './pages/HazmatCompliance';
import MaintenanceWorkflows from './pages/MaintenanceWorkflows';
import TruckReconciliation from './pages/TruckReconciliation';
import ChainOfCustody from './pages/ChainOfCustody';
import PalletizationSystem from './pages/PalletizationSystem';
import AdvancedRentalCalculations from './pages/AdvancedRentalCalculations';
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import TestAdvancedFeatures from './pages/TestAdvancedFeatures';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { supabase } from './supabase/client';
import WorkflowAutomation from './pages/WorkflowAutomation';
import RouteOptimization from './pages/RouteOptimization';
import CustomerSelfService from './pages/CustomerSelfService';
import ThemeShowcase from './pages/ThemeShowcase';
import FAQ from './pages/FAQ';
import Reviews from './pages/Reviews';
import CookieNotice from './components/CookieNotice';
import NavigationBar from './components/NavigationBar';
import LiveChat from './components/LiveChat';
import Demo from './pages/Demo';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import About from './pages/About';
import CaseStudies from './pages/CaseStudies';
import OwnerCMS from './pages/OwnerCMS';
import CustomerPayments from './pages/CustomerPayments';
import CompetitorAnalysis from './pages/CompetitorAnalysis';
import Blog from './pages/Blog';
import Security from './pages/Security';
import EmailTest from './pages/EmailTest';
import DirectEmailTest from './pages/DirectEmailTest';
import SMTP2GOTest from './pages/SMTP2GOTest';

// Lazy load all page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Customers = lazy(() => import('./pages/Customers'));
const Rentals = lazy(() => import('./pages/Rentals'));
const LeaseAgreements = lazy(() => import('./pages/LeaseAgreements'));
const IndustryAnalyticsDashboard = lazy(() => import('./pages/IndustryAnalyticsDashboard'));
const WebScanning = lazy(() => import('./pages/WebScanning'));
const DeliveryTracking = lazy(() => import('./pages/DeliveryTracking'));
const AuditManagement = lazy(() => import('./pages/AuditManagement'));
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
const IntegrationsPage = lazy(() => import('./pages/Integrations'));
const BottleDetail = lazy(() => import('./pages/BottleDetail'));
const AssetDetail = lazy(() => import('./pages/AssetDetail'));
const Assets = lazy(() => import('./pages/Assets'));
const InventoryManagement = lazy(() => import('./pages/InventoryManagement'));
const SmartInventory = lazy(() => import('./pages/SmartInventory'));
const SupportCenter = lazy(() => import('./pages/SupportCenter'));
const OrganizationAnalytics = lazy(() => import('./pages/OrganizationAnalytics'));
const OrganizationTools = lazy(() => import('./pages/OrganizationTools'));
const Locations = lazy(() => import('./pages/Locations'));
const TempCustomerManagement = lazy(() => import('./pages/TempCustomerManagement'));

// Analytics tracking component
function AnalyticsTracker() {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);
  
  return null;
}

function AppContent() {
  const { profile, organization } = useAuth();
  
  // Initialize analytics and disaster recovery on app start
  useEffect(() => {
    initAllTracking();
    initializeDisasterRecovery();
  }, []);

  // Global snackbar state
  const [globalSnackbar, setGlobalSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  React.useEffect(() => {
    window.showGlobalSnackbar = (message, severity = 'success') => {
      setGlobalSnackbar({ open: true, message, severity });
    };
  }, []);

  return (
    <ErrorBoundary>
      <ImportProgressProvider>
        <PermissionsProvider>
          <ThemeProvider>
            <Router>
              <AnalyticsTracker />
              <NavigationBar />
              <LiveChat />
              <div className="App">
                <Routes>
                  {/* Smart root redirect based on user state */}
                  <Route path="/" element={
                    profile && organization ? <Navigate to={profile?.role === 'owner' ? '/owner-portal' : '/home'} replace /> : 
                    profile && !organization && profile.role === 'owner' ? <Navigate to="/owner-portal" replace /> :
                    <LandingPage />
                  } />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/login" element={
                    profile && organization ? <Navigate to={profile?.role === 'owner' ? '/owner-portal' : '/home'} replace /> : 
                    profile && !organization && profile.role === 'owner' ? <Navigate to="/owner-portal" replace /> :
                    <LoginPage />
                  } />
                  <Route path="/register" element={<OrganizationRegistration />} />
                  <Route path="/setup" element={<OrganizationRegistration />} />
                  <Route path="/contact" element={<ContactUs />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/p/:slug" element={<CustomPageViewer />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/customer-register" element={<CustomerRegistration />} />
                  <Route path="/portal" element={<CustomerPortal />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/fix-organization-link" element={<FixOrganizationLink />} />

                  {/* --- Debug Routes --- */}
                  <Route path="/debug" element={<DebugAuth />} />
                  <Route path="/test-landing" element={<LandingPage />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/case-studies" element={<CaseStudies />} />
                  <Route path="/compare" element={<CompetitorAnalysis />} />
                                  <Route path="/blog" element={<Blog />} />
                <Route path="/security" element={<Security />} />
                <Route path="/email-test" element={<EmailTest />} />
                <Route path="/direct-email-test" element={<DirectEmailTest />} />
                <Route path="/smtp2go-test" element={<SMTP2GOTest />} />
                  <Route path="/integrations" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <IntegrationsPage />
                    </Suspense>
                  } />

                  {/* --- ALL Protected Routes Go Here --- */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/customers" element={<Customers />} />
                  <Route path="/temp-customer-management" element={<TempCustomerManagement />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/assets" element={<Assets />} />
                    <Route path="/inventory" element={<Assets />} />
                    <Route path="/deliveries" element={<DeliveryTracking />} />
                    <Route path="/delivery-management" element={<DeliveryTracking />} />
                    <Route path="/delivery-tracking" element={<DeliveryTracking />} />
                    <Route path="/rentals" element={<Rentals />} />
                    <Route path="/lease-agreements" element={<LeaseAgreements />} />
                    <Route path="/industry-analytics" element={<IndustryAnalyticsDashboard />} />
                    <Route path="/web-scanning" element={<WebScanning />} />
                    <Route path="/audit-management" element={<AuditManagement />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/custom-reports" element={<CustomReports />} />
                    <Route path="/analytics" element={<AnalyticsDashboard />} />
                    <Route path="/delivery-management" element={<DeliveryTracking />} />
                    <Route path="/truck-reconciliation" element={<TruckReconciliation />} />
                    <Route path="/workflow-automation" element={<WorkflowAutomation />} />
                    <Route path="/route-optimization" element={<RouteOptimization />} />
                    <Route path="/customer-self-service" element={<CustomerSelfService />} />
                    <Route path="/theme-showcase" element={<ThemeShowcase />} />
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
                    <Route path="/reports" element={<CustomReports />} />
                    <Route path="/quick-add" element={<QuickAdd />} />
                    <Route path="/lot-reports" element={<LotReports />} />
                    <Route path="/rental/*" element={<Rental />} />
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
                    <Route path="/import-history" element={<ImportApprovalsHistory />} />
                    <Route path="/orders-report" element={<ScannedOrders />} />
                    <Route path="/generateid" element={<CustomerRegistration />} />
                    <Route path="/barcode-generator" element={<BarcodeGenerator />} />
                    <Route path="/owner-portal/integration-settings" element={<IntegrationSettings />} />
                    <Route path="/bottle/:id" element={<BottleDetail />} />
                    <Route path="/assets/:id" element={<AssetDetail />} />
                    <Route path="/asset/:id" element={<AssetDetail />} />
                    <Route path="/orders" element={<ScannedOrders />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/payments" element={<CustomerPayments />} />
                    <Route path="/inventory-management" element={<InventoryManagement />} />
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
                    <Route path="/owner-portal/disaster-recovery" element={<DisasterRecoveryDashboard />} />
                    <Route path="/owner-portal/security" element={<SecurityEvents />} />
                    <Route path="/owner-portal/user-management" element={<UserManagementAllOrgs />} />
                    <Route path="/owner-portal/audit-log" element={<AuditLog />} />
                    <Route path="/owner-portal/impersonation" element={<Impersonation />} />
                    <Route path="/owner-portal/plans" element={<PlanManagement />} />
                    <Route path="/asset-demo" element={<AssetTypeDemo />} />
                                      <Route path="/asset-configuration" element={<AssetConfigurationManager />} />
                  <Route path="/owner-portal/asset-configuration" element={<AssetConfigurationManager />} />
                  <Route path="/file-format-manager" element={<FileFormatManager />} />
                  <Route path="/owner-portal/file-format-manager" element={<FileFormatManager />} />
                  <Route path="/owner-portal/format-configuration" element={<FormatConfigurationManager />} />
                  <Route path="/owner-portal/roles" element={<RoleManagement />} />
                    <Route path="/owner-portal/page-builder" element={<PageBuilder />} />
                    <Route path="/owner-portal/contact-management" element={<ContactManagement />} />
                    <Route path="/owner-portal/landing-editor" element={<LandingPageEditor />} />
                    <Route path="/owner-portal/reviews" element={<ReviewManagement />} />
                    <Route path="/owner-portal/website-management" element={<WebsiteManagement />} />
                    <Route path="/owner-portal/visual-builder" element={<VisualPageBuilder />} />
                    <Route path="/owner-portal/command-center" element={<OwnerCommandCenter />} />
                    <Route path="/owner-portal/cms" element={<OwnerCMS />} />
                  </Route>
                  
                  {/* NEW ADVANCED FEATURES ROUTES */}
                  <Route path="/hazmat-compliance" element={
                    <ProtectedRoute>
                      <HazmatCompliance />
                    </ProtectedRoute>
                  } />
                  <Route path="/maintenance-workflows" element={
                    <ProtectedRoute>
                      <MaintenanceWorkflows />
                    </ProtectedRoute>
                  } />
                  <Route path="/truck-reconciliation" element={
                    <ProtectedRoute>
                      <TruckReconciliation />
                    </ProtectedRoute>
                  } />
                  <Route path="/chain-of-custody" element={
                    <ProtectedRoute>
                      <ChainOfCustody />
                    </ProtectedRoute>
                  } />
                  <Route path="/palletization-system" element={
                    <ProtectedRoute>
                      <PalletizationSystem />
                    </ProtectedRoute>
                  } />
                  <Route path="/advanced-rental-calculations" element={
                    <ProtectedRoute>
                      <AdvancedRentalCalculations />
                    </ProtectedRoute>
                  } />
                  <Route path="/predictive-analytics" element={
                    <ProtectedRoute>
                      <PredictiveAnalytics />
                    </ProtectedRoute>
                  } />
                  <Route path="/test-advanced-features" element={
                    <ProtectedRoute>
                      <TestAdvancedFeatures />
                    </ProtectedRoute>
                  } />

                  {/* Catch-all for any other unmatched routes */}
                  <Route path="*" element={profile && organization ? <Navigate to={profile?.role === 'owner' ? '/owner-portal' : '/home'} replace /> : <Navigate to="/" replace />} />
                </Routes>
              </div>
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
              {/* Global Snackbar */}
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
              {/* Global Cookie Notice */}
              <CookieNotice />
            </Router>
          </ThemeProvider>
        </PermissionsProvider>
      </ImportProgressProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <AppContent />
      </Suspense>
    </AuthProvider>
  );
}

export default App; 