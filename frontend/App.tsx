import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import { AuctionList } from './pages/AuctionList';
import { AuthService } from './services/auth.service';
import PropertyManualEntry from './pages/PropertyManualEntry';
import PropertyDetails from './pages/PropertyDetails';
import SupportPage from './pages/SupportPage';
import AboutPage from './pages/AboutPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DisclaimerPage from './pages/DisclaimerPage';
import { TaxSystemsLandingPage } from './pages/connect/TaxSystemsLandingPage';
import { TrainingLandingPage } from './pages/connect/TrainingLandingPage';
import { TourProvider } from './context/TourContext';
import { TourOverlay } from './components/TourOverlay';

import { Settings } from './pages/Settings';
import AdminAuctions from './pages/admin/AdminAuctions';
import PropertyDetailPage from './pages/admin/PropertyDetailPage';
import AdminLists from './pages/admin/AdminLists';
import AdminUsers from './pages/admin/AdminUsers';

import AdminImportProperties from './pages/admin/AdminImportProperties';
import AdminImportAuctions from './pages/admin/AdminImportAuctions';
import AdminBroadcasts from './pages/admin/AdminBroadcasts';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import { AdminTaskMediation } from './pages/admin/AdminTaskMediation';

// Client Portal Pages
import ClientLayout from './layouts/ClientLayout';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientAuctions from './pages/client/ClientAuctions';
import { ClientUserProperties } from './pages/client/ClientUserProperties';
import ClientProperties from './pages/client/ClientProperties';
import ClientLists from './pages/client/ClientLists';
import ClientSupportPage from './pages/client/SupportPage';
import { TrainingPage, CommunityPage, GroupsPage, TaxSystemsPage } from './pages/client/EcosystemPages';
import ChangePasswordPage from './pages/client/ChangePasswordPage';
import ActivityLogsPage from './pages/client/ActivityLogsPage';
import BillingPage from './pages/client/BillingPage';
import VerifyEmail from './pages/auth/VerifyEmail';
import TrialLimitPage from './pages/client/TrialLimitPage';
import { InvestorTasksDashboard } from './pages/client/InvestorTasksDashboard';
import { CompanyProvider } from './context/CompanyContext';
import RealtorLayout from './pages/realtor/RealtorLayout';
import RealtorDashboard from './pages/realtor/RealtorDashboard';
import PropertyListings from './pages/realtor/PropertyListings';
import AvailableTasks from './pages/realtor/AvailableTasks';
import Commissions from './pages/realtor/Commissions';
import RealtorProfile from './pages/realtor/RealtorProfile';

// Agent Due Diligence Portal Pages
import AgentLayout from './pages/agent_due_diligence/AgentLayout';
import AgentDashboard from './pages/agent_due_diligence/AgentDashboard';
import AgentTasks from './pages/agent_due_diligence/AgentTasks';
import AgentWithdraw from './pages/agent_due_diligence/AgentWithdraw';

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const user = AuthService.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect each role to its own home
      if (['client', 'manager', 'agent'].includes(user.role)) return <Navigate to="/client" replace />;
    if (user.role === 'realtor') return <Navigate to="/realtor" replace />;
    if (user.role === 'agent_due_diligence') return <Navigate to="/agent" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const RootRoute: React.FC = () => {
  const user = AuthService.getCurrentUser();
  if (!user) return <Landing />;
  if (['client', 'manager', 'agent'].includes(user.role)) return <Navigate to="/client" replace />;
  if (user.role === 'realtor') return <Navigate to="/realtor" replace />;
  if (user.role === 'agent_due_diligence') return <Navigate to="/agent" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  // Theme Persistence
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('goauct_theme') || 'system';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  return (
    <AuthProvider>
      <HashRouter>
        <TourProvider>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/contact" element={<SupportPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          
          {/* Public Ecosystem Connect Pages */}
          <Route path="/connect/tax-systems" element={<TaxSystemsLandingPage />} />
          <Route path="/connect/training" element={<TrainingLandingPage />} />

          {/* Protected Routes (Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'superuser']}><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auctions" element={<AuctionList filters={{}} />} />
            <Route path="/admin/auctions" element={<AdminAuctions />} />
            <Route path="/admin/properties" element={<AdminAuctions defaultTab="properties" />} />
            <Route path="/admin/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/admin/properties/:id/edit" element={<PropertyManualEntry />} />
            <Route path="/admin/lists" element={<AdminLists />} />
            <Route path="/admin/import/properties" element={<AdminImportProperties />} />
            <Route path="/admin/import/auctions" element={<AdminImportAuctions />} />
            <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
            <Route path="/admin/mediation" element={<AdminTaskMediation />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/properties/new" element={<PropertyManualEntry />} />
            <Route path="/properties/:id" element={<PropertyDetails />} />
          </Route>

          {/* Client Portal Routes */}
          <Route path="/client" element={
            <ProtectedRoute allowedRoles={['client', 'manager', 'agent']}>
              <CompanyProvider>
                <ClientLayout />
              </CompanyProvider>
            </ProtectedRoute>
          }>
            <Route index element={<ClientDashboard />} />
            <Route path="auctions" element={<ClientAuctions />} />
            <Route path="my-properties" element={<ClientUserProperties />} />
            <Route path="properties" element={<ClientProperties />} />
            <Route path="lists" element={<ClientLists />} />
            {/* Target same detail page internally handling client view restrictions */}
            <Route path="properties/:id" element={<PropertyDetailPage readOnly={true} />} />
            {/* Ecosystem Pages */}
            <Route path="tax-systems" element={<TaxSystemsPage />} />
            <Route path="training" element={<TrainingPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="groups" element={<GroupsPage />} />
            {/* Account Support Pages */}
            <Route path="tasks" element={<InvestorTasksDashboard />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
            <Route path="contact-support" element={<ClientSupportPage />} />
            <Route path="about" element={<AboutPage standalone={false} />} />
            <Route path="support" element={<SupportPage standalone={false} />} />
            <Route path="team" element={<ActivityLogsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="trial-limit" element={<TrialLimitPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Realtor Portal Routes */}
          <Route path="/realtor" element={
            <ProtectedRoute allowedRoles={['realtor']}>
              <RealtorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<RealtorDashboard />} />
            <Route path="listings" element={<PropertyListings />} />
            <Route path="tasks" element={<AvailableTasks />} />
            <Route path="commissions" element={<Commissions />} />
            <Route path="profile" element={<RealtorProfile />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Agent Due Diligence Portal Routes */}
          <Route path="/agent" element={
            <ProtectedRoute allowedRoles={['agent_due_diligence']}>
              <AgentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AgentDashboard />} />
            <Route path="tasks" element={<AgentTasks />} />
            <Route path="withdraw" element={<AgentWithdraw />} />
          </Route>
        </Routes>
        <TourOverlay />
        </TourProvider>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;