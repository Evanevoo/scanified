import React, { lazy, Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './hooks/useAuth';
import { PermissionsProvider } from './context/PermissionsContext';
import { ImportProgressProvider } from './components/ImportProgressContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { GlobalStyles } from '@mui/material';
import theme, { globalStyles } from './styles/theme';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import OwnerProtectedRoute from './components/OwnerProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { initAllTracking, trackPageView } from './utils/analytics';
import { initializeDisasterRecovery } from './utils/disasterRecovery';
import { initGlobalErrorHandler } from './utils/globalErrorHandler';
import './styles/responsive.css';
import './styles/accessibility.css';
import Billing from './pages/Billing';
import OwnerDashboard from './pages/OwnerDashboard';
import CustomerPortal from './pages/CustomerPortal';
import BarcodeGenerator from './pages/BarcodeGenerator';
import LandingPage from './pages/LandingPage';
import ModernLandingPage from './pages/ModernLandingPage';
import FixOrganizationLink from './pages/FixOrganizationLink';
import OAuthOrganizationLink from './pages/OAuthOrganizationLink';

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
import VerifiedOrders from './pages/VerifiedOrders';
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
import FormatConfigurationManager from './pages/OwnerPortal/FormatConfigurationManager';
import RoleManagement from './pages/OwnerPortal/RoleManagement';
import ComprehensiveRoleManager from './pages/ComprehensiveRoleManager';
import OrganizationJoinCodes from './pages/OrganizationJoinCodes';
import PageBuilder from './pages/OwnerPortal/PageBuilder';
import ContactManagement from './pages/OwnerPortal/ContactManagement';
import OwnerCommandCenter from './pages/OwnerPortal/OwnerCommandCenter';
import LandingPageEditor from './pages/OwnerPortal/LandingPageEditor';
import ReviewManagement from './pages/OwnerPortal/ReviewManagement';
import WebsiteManagement from './pages/OwnerPortal/WebsiteManagement';
import VisualPageBuilder from './pages/OwnerPortal/VisualPageBuilder';
import DisasterRecoveryDashboard from './components/admin/DisasterRecoveryDashboard';

// NEW ADVANCED FEATURES
import TruckReconciliation from './pages/TruckReconciliation';
import BulkRentalPricingManager from './pages/BulkRentalPricingManager';
import MainLayout from './components/MainLayout';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { supabase } from './supabase/client';
import WorkflowAutomation from './pages/WorkflowAutomation';
import CustomerSelfService from './pages/CustomerSelfService';
import ThemeShowcase from './pages/ThemeShowcase';
import FAQ from './pages/FAQ';
import Reviews from './pages/Reviews';
import CookieNotice from './components/CookieNotice';
import NavigationBar from './components/NavigationBar';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import Demo from './pages/Demo';
import ParticleTextDemo from './pages/ParticleTextDemo';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import About from './pages/About';
import CaseStudies from './pages/CaseStudies';
import OwnerCMS from './pages/OwnerCMS';
import CustomerPayments from './pages/CustomerPayments';
import CompetitorAnalysis from './pages/CompetitorAnalysis';
import Blog from './pages/Blog';
import Security from './pages/Security';
import OwnershipManagement from './pages/OwnershipManagement';
import CaseStudiesPage from './pages/CaseStudiesPage';
import KnowledgeBase from './pages/KnowledgeBase';

// Lazy load all page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CreateOrganization = lazy(() => import('./pages/CreateOrganization'));
const VerifyOrganization = lazy(() => import('./pages/VerifyOrganization'));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'));
const OrganizationSetupWizard = lazy(() => import('./pages/OrganizationSetupWizard'));
const UserInvites = lazy(() => import('./pages/UserInvites'));
// Debug routes - only available in development
const DebugSession = lazy(() => import('./pages/DebugSession'));
const Customers = lazy(() => import('./pages/Customers.jsx'));
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
const Import = lazy(() => import('./pages/Import'));
const Settings = lazy(() => import('./pages/Settings'));
const ImportCustomerInfo = lazy(() => import('./pages/ImportCustomerInfo'));
const ScannedOrders = lazy(() => import('./pages/ScannedOrders'));
const SupabaseOrders = lazy(() => import('./pages/management-reports/SupabaseOrders'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ImportAssetBalance = lazy(() => import('./pages/ImportAssetBalance'));
const IntegrationsPage = lazy(() => import('./pages/Integrations'));
const BottleManagement = lazy(() => import('./pages/BottleManagement'));
const AssetDetail = lazy(() => import('./pages/AssetDetail'));
const Assets = lazy(() => import('./pages/Assets'));
const BottlesForDay = lazy(() => import('./pages/BottlesForDay'));
const SupportCenter = lazy(() => import('./pages/SupportCenter'));
const OrganizationAnalytics = lazy(() => import('./pages/OrganizationAnalytics'));
const OrganizationTools = lazy(() => import('./pages/OrganizationTools'));
const MaintenanceWorkflows = lazy(() => import('./pages/MaintenanceWorkflows'));
const RouteOptimization = lazy(() => import('./pages/RouteOptimization'));
const PalletManagement = lazy(() => import('./pages/PalletManagement'));
const HazmatCompliance = lazy(() => import('./pages/HazmatCompliance'));
const ChainOfCustody = lazy(() => import('./pages/ChainOfCustody'));
const AdvancedRentals = lazy(() => import('./pages/AdvancedRentals'));
const IntegrationSettings = lazy(() => import('./pages/IntegrationSettings'));
const AutomationRules = lazy(() => import('./pages/AutomationRules'));
const Locations = lazy(() => import('./pages/Locations'));
const TransferFromCustomers = lazy(() => import('./pages/TransferFromCustomers.jsx'));
const DailyUpdateAdmin = lazy(() => import('./pages/DailyUpdateAdmin'));

// Analytics tracking component
function AnalyticsTracker() {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);
  
  return null;
}

function AppContent() {
  const { profile, organization, loading } = useAuth();
  
  // Initialize analytics, disaster recovery, and global error handler on app start
  useEffect(() => {
    initAllTracking();
    initializeDisasterRecovery();
    
    // Initialize global error handler for unhandled errors and promise rejections
    initGlobalErrorHandler({
      enableLogging: true,
      enableReporting: import.meta.env.PROD, // Only report in production
      onError: (errorInfo) => {
        // Optional: integrate with error tracking service (e.g., Sentry)
        if (import.meta.env.PROD && errorInfo.type === 'error') {
          console.error('Global error captured:', errorInfo.message);
        }
      }
    });
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
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              {/* Optional dev skip flag: prevent redirect loops after sign-out */}
              {(() => {
                const skip = sessionStorage.getItem('skip_org_redirect_once');
                if (skip) {
                  // Clear the flag so it only applies once
                  sessionStorage.removeItem('skip_org_redirect_once');
                }
                return null;
              })()}
              <AnalyticsTracker />
              <NavigationBar />
              <div className="App">
                <Routes>
                  {/* Smart root redirect based on user state */}
                  <Route path="/" element={
                    loading ? <ModernLandingPage /> :
                    (sessionStorage.getItem('skip_org_redirect_once') ? <ModernLandingPage /> : (
                      profile && organization ? <Navigate to={profile?.role === 'owner' ? '/owner-portal' : '/home'} replace /> : 
                      profile && !organization && profile.role === 'owner' ? <Navigate to="/owner-portal" replace /> :
                      profile && !organization ? <Navigate to="/connect-organization" replace /> :
                      <ModernLandingPage />
                    ))
                  } />
                  <Route path="/landing" element={<ModernLandingPage />} />
                  <Route path="/create-organization" element={<CreateOrganization />} />
                  <Route path="/verify-organization" element={<VerifyOrganization />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/organization-setup" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <OrganizationSetupWizard />
                    </Suspense>
                  } />
                  {/* Debug routes - only available in development */}
                  {import.meta.env.DEV && (
                    <Route path="/debug-session" element={<DebugSession />} />
                  )}
                  <Route path="/login" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      {loading ? <LoginPage /> :
                        (sessionStorage.getItem('skip_org_redirect_once') ? <LoginPage /> : (
                          profile && organization ? <Navigate to={profile?.role === 'owner' ? '/owner-portal' : '/home'} replace /> : 
                          profile && !organization && profile.role === 'owner' ? <Navigate to="/owner-portal" replace /> :
                          profile && !organization ? <Navigate to="/connect-organization" replace /> :
                          <LoginPage />
                        ))
                      }
                    </Suspense>
                  } />
                  {/* Registration routes removed per App Store guidelines */}
                  <Route path="/contact" element={<ContactUs />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/p/:slug" element={<CustomPageViewer />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  {/* Customer registration route removed per App Store guidelines */}
                  <Route path="/portal" element={<CustomerPortal />} />
                  <Route path="/fix-organization-link" element={<FixOrganizationLink />} />
                  <Route path="/connect-organization" element={<OAuthOrganizationLink />} />

                  <Route path="/test-landing" element={<LandingPage />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/particle-demo" element={<ParticleTextDemo />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/case-studies" element={<CaseStudiesPage />} />
                  <Route path="/compare" element={<CompetitorAnalysis />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/knowledge-base" element={<KnowledgeBase />} />
                  <Route path="/help" element={<KnowledgeBase />} />
                  <Route path="/integrations" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <IntegrationsPage />
                    </Suspense>
                  } />

                  {/* --- ALL Protected Routes Go Here --- */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/transfer-from-customers" element={<TransferFromCustomers />} />
                    <Route path="/customer/:id/transfer-to" element={<TransferFromCustomers />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/assets" element={<Assets />} />
                    <Route path="/inventory" element={<Assets />} />
                    <Route path="/bottles-for-day" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <BottlesForDay />
                      </Suspense>
                    } />
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
                    <Route path="/assets/:id/history" element={<AssetHistory />} />
                    <Route path="/import" element={<Import />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/import-customer-info" element={<ImportCustomerInfo />} />
                    <Route path="/scanned-orders" element={<ScannedOrders />} />
                    <Route path="/user-management" element={<Navigate to="/settings?tab=team" replace />} />
                    <Route path="/user-invites" element={<UserInvites />} />
                    <Route path="/role-management" element={<ComprehensiveRoleManager />} />
                    <Route path="/organization-join-codes" element={<OrganizationJoinCodes />} />
                    
                    {/* Legacy routes - redirect to new comprehensive manager */}
                    <Route path="/role-permission-manager" element={<Navigate to="/role-management" replace />} />
                    <Route path="/unified-role-manager" element={<Navigate to="/role-management" replace />} />
                    <Route path="/import-asset-balance" element={<ImportAssetBalance />} />
                    <Route path="/import-approvals" element={<ImportApprovals />} />
                    <Route path="/import-approval/:id/detail" element={<ImportApprovalDetail />} />
                    <Route path="/verified-orders" element={<VerifiedOrders />} />
                    <Route path="/orders-report" element={<ScannedOrders />} />
                    {/* Generate ID route removed per App Store guidelines */}
                    <Route path="/barcode-generator" element={<BarcodeGenerator />} />
                    {/* Organization-level routes - accessible to all organization users */}
                    <Route path="/bottle/:id" element={<AssetDetail />} />
                    <Route path="/bottle-management" element={<BottleManagement />} />
                    <Route path="/ownership-management" element={<OwnershipManagement />} />
                    <Route path="/daily-update-admin" element={<DailyUpdateAdmin />} />
                    <Route path="/assets/:id" element={<AssetDetail />} />
                    <Route path="/asset/:id" element={<AssetDetail />} />
                    <Route path="/orders" element={<ScannedOrders />} />
                    <Route path="/billing" element={
                      <RoleProtectedRoute allowedRoles={['admin', 'manager', 'user']}>
                        <Billing />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/payments" element={<CustomerPayments />} />
                    <Route path="/support" element={<SupportCenter />} />
                    <Route path="/organization-analytics" element={<OrganizationAnalytics />} />
                    <Route path="/organization-tools" element={
                      <RoleProtectedRoute allowedRoles={['admin', 'manager', 'user']}>
                        <OrganizationTools />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/maintenance-workflows" element={
                      <RoleProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <MaintenanceWorkflows />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/route-optimization" element={
                      <RoleProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <RouteOptimization />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/pallet-management" element={
                      <RoleProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <PalletManagement />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/hazmat-compliance" element={
                      <RoleProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <HazmatCompliance />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/chain-of-custody" element={
                      <RoleProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <ChainOfCustody />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/advanced-rentals" element={
                      <RoleProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <AdvancedRentals />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/data-utilities" element={<DataUtilities />} />
                    
                    {/* Owner-only routes */}
                    <Route element={<OwnerProtectedRoute />}>
                      <Route path="/owner-portal/integration-settings" element={
                        <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
                          <IntegrationSettings />
                        </RoleProtectedRoute>
                      } />
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
                      <PalletManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/advanced-rental-calculations" element={
                    <ProtectedRoute>
                      <AdvancedRentals />
                    </ProtectedRoute>
                  } />
                  <Route path="/integration-settings" element={
                    <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
                      <IntegrationSettings />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/automation-rules" element={
                    <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
                      <AutomationRules />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/bulk-rental-pricing" element={
                    <ProtectedRoute>
                      <BulkRentalPricingManager />
                    </ProtectedRoute>
                  } />

                  {/* Catch-all for any other unmatched routes */}
                  <Route path="*" element={
                    loading ? <Navigate to="/" replace /> :
                    (sessionStorage.getItem('skip_org_redirect_once') ? <Navigate to="/" replace /> : (
                      profile && organization ? <Navigate to={profile?.role === 'owner' ? '/owner-portal' : '/home'} replace /> : 
                      profile && !organization ? <Navigate to="/connect-organization" replace /> :
                      <Navigate to="/" replace />
                    ))
                  } />
                </Routes>
              </div>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: 'var(--mui-palette-background-paper, #363636)',
                    color: 'var(--mui-palette-text-primary, #fff)',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              {/* Global Snackbar - MOVED TO TOP RIGHT */}
              <Snackbar
                open={globalSnackbar.open}
                autoHideDuration={4000}
                onClose={() => setGlobalSnackbar({ ...globalSnackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{ 
                  zIndex: 9999999,
                  position: 'fixed',
                  top: '80px !important',
                  right: '20px !important',
                  '& .MuiSnackbar-root': {
                    zIndex: 9999999,
                    position: 'fixed',
                    top: '80px !important',
                    right: '20px !important'
                  }
                }}
              >
                <Alert onClose={() => setGlobalSnackbar({ ...globalSnackbar, open: false })} severity={globalSnackbar.severity} sx={{ width: '100%' }}>
                  {globalSnackbar.message}
                </Alert>
              </Snackbar>
              {/* Global Cookie Notice */}
              <CookieNotice />
              {/* Session Timeout Warning */}
              <SessionTimeoutWarning />
            </Router>
          </ThemeProvider>
        </PermissionsProvider>
      </ImportProgressProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <MuiThemeProvider theme={theme}>
      <GlobalStyles styles={globalStyles} />
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <AppContent />
        </Suspense>
      </AuthProvider>
    </MuiThemeProvider>
  );
}

export default App;